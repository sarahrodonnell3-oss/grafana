// Package labs powers the Labs navigation section, where an administrator can
// inspect the feature toggles of a Grafana instance and turn them on or off
// without editing the configuration file.
package labs

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/grafana/grafana/pkg/apimachinery/errutil"
	"github.com/grafana/grafana/pkg/infra/kvstore"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

const (
	kvNamespace = "labs"
	kvOverrides = "feature-toggle-overrides"
)

var (
	ErrToggleNotFound = errutil.BadRequest("labs.toggleNotFound",
		errutil.WithPublicMessage("Unknown feature toggle"))
	ErrToggleReadOnly = errutil.BadRequest("labs.toggleReadOnly",
		errutil.WithPublicMessage("This feature toggle can not be changed at runtime"))
)

// FeatureToggle describes a single feature toggle and its current state.
type FeatureToggle struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Stage       string `json:"stage,omitempty"`

	// Enabled is the value the instance is currently using
	Enabled bool `json:"enabled"`
	// DefaultEnabled is the value the toggle has in the instance configuration
	DefaultEnabled bool `json:"defaultEnabled"`
	// Overridden is true when Enabled deviates from DefaultEnabled
	Overridden bool `json:"overridden"`
	// ReadOnly toggles can only be changed by restarting Grafana with a new configuration
	ReadOnly bool `json:"readOnly"`
	// ReadOnlyReason explains why a toggle is read only
	ReadOnlyReason string `json:"readOnlyReason,omitempty"`
}

type Service struct {
	features *featuremgmt.FeatureManager
	kv       *kvstore.NamespacedKVStore
	log      log.Logger
}

// ProvideService restores the overrides stored by a previous run before any request is served.
func ProvideService(features *featuremgmt.FeatureManager, kvStore kvstore.KVStore) (*Service, error) {
	s := &Service{
		features: features,
		// Feature toggles are instance wide, so they are not stored per organization
		kv:  kvstore.WithNamespace(kvStore, 0, kvNamespace),
		log: log.New("labs"),
	}

	if err := s.restoreOverrides(context.Background()); err != nil {
		// A broken or outdated stored value must not stop Grafana from starting,
		// the instance simply runs with the toggles from its configuration.
		s.log.Error("Failed to restore feature toggle overrides", "error", err)
	}

	return s, nil
}

// GetFeatureToggles returns every known feature toggle, sorted by name.
func (s *Service) GetFeatureToggles(ctx context.Context) []FeatureToggle {
	flags := s.features.GetFlags()
	overrides := s.features.GetOverrides()

	toggles := make([]FeatureToggle, 0, len(flags))
	for _, flag := range flags {
		_, overridden := overrides[flag.Name]
		reason := s.readOnlyReason(flag)

		toggles = append(toggles, FeatureToggle{
			Name:           flag.Name,
			Description:    flag.Description,
			Stage:          flag.Stage.String(),
			Enabled:        s.features.IsEnabledGlobally(flag.Name),
			DefaultEnabled: s.features.IsEnabledByDefault(flag.Name),
			Overridden:     overridden,
			ReadOnly:       reason != "",
			ReadOnlyReason: reason,
		})
	}

	slices.SortFunc(toggles, func(a, b FeatureToggle) int {
		return strings.Compare(a.Name, b.Name)
	})

	return toggles
}

// SetFeatureToggles applies the given values and persists them so that they survive a restart.
func (s *Service) SetFeatureToggles(ctx context.Context, values map[string]bool) error {
	for name := range values {
		flag, ok := s.features.GetFlag(name)
		if !ok {
			return ErrToggleNotFound.Errorf("unknown feature toggle: %s", name)
		}
		if reason := s.readOnlyReason(flag); reason != "" {
			return ErrToggleReadOnly.Errorf("feature toggle %s is read only: %s", name, reason)
		}
	}

	if err := s.features.SetOverrides(values); err != nil {
		return err
	}

	return s.storeOverrides(ctx)
}

func (s *Service) restoreOverrides(ctx context.Context) error {
	value, ok, err := s.kv.Get(ctx, kvOverrides)
	if err != nil || !ok {
		return err
	}

	stored := map[string]bool{}
	if err := json.Unmarshal([]byte(value), &stored); err != nil {
		return fmt.Errorf("failed to read stored feature toggle overrides: %w", err)
	}

	// Toggles are removed and renamed between releases, so anything that no longer
	// exists is dropped instead of failing the whole restore.
	overrides := make(map[string]bool, len(stored))
	for name, enabled := range stored {
		flag, ok := s.features.GetFlag(name)
		if !ok {
			s.log.Warn("Dropping override for unknown feature toggle", "toggle", name)
			continue
		}
		if reason := s.readOnlyReason(flag); reason != "" {
			s.log.Warn("Dropping override for read only feature toggle", "toggle", name, "reason", reason)
			continue
		}
		overrides[name] = enabled
	}

	if len(overrides) == 0 {
		return nil
	}

	if err := s.features.SetOverrides(overrides); err != nil {
		return err
	}

	s.log.Info("Restored feature toggle overrides", "count", len(overrides))
	return nil
}

func (s *Service) storeOverrides(ctx context.Context) error {
	encoded, err := json.Marshal(s.features.GetOverrides())
	if err != nil {
		return err
	}
	return s.kv.Set(ctx, kvOverrides, string(encoded))
}

func (s *Service) readOnlyReason(flag featuremgmt.FeatureFlag) string {
	if flag.RequiresRestart {
		return "This toggle is only read when Grafana starts, change it in the configuration file"
	}
	if supported, reason := s.features.IsSupported(flag.Name); !supported {
		return fmt.Sprintf("This toggle %s", reason)
	}
	return ""
}
