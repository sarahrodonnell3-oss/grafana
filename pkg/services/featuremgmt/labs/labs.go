// Package labs powers the Labs section, where administrators can inspect the feature toggles
// registered in Grafana and change them without editing the configuration file.
package labs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"sync"

	"github.com/grafana/grafana/pkg/infra/kvstore"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

const (
	kvNamespace    = "labs"
	kvOverridesKey = "feature_toggle_overrides"
)

// ErrInvalidToggle is returned when a requested change can not be applied
var ErrInvalidToggle = errors.New("invalid feature toggle")

// Source describes where the current value of a toggle comes from
type Source string

const (
	SourceDefault Source = "default"
	SourceConfig  Source = "config"
	SourceLabs    Source = "labs"
)

// ToggleState is the state of a single feature toggle as shown in the Labs section
type ToggleState struct {
	Name            string `json:"name"`
	Description     string `json:"description,omitempty"`
	Stage           string `json:"stage"`
	Enabled         bool   `json:"enabled"`
	Writeable       bool   `json:"writeable"`
	Source          Source `json:"source"`
	RequiresRestart bool   `json:"requiresRestart,omitempty"`
	Warning         string `json:"warning,omitempty"`
}

// State is the full feature toggle state of the instance
type State struct {
	// AllowEditing tells whether the current user may change the toggles
	AllowEditing bool `json:"allowEditing"`

	// RestartRequired is true when a toggle changed during this process lifetime that is
	// only read while Grafana starts up
	RestartRequired bool `json:"restartRequired"`

	Toggles []ToggleState `json:"toggles"`
}

type Service struct {
	features *featuremgmt.FeatureManager
	kv       *kvstore.NamespacedKVStore
	log      log.Logger

	// mu serializes updates so that concurrent requests can not lose each others changes
	mu sync.Mutex

	// restartRequired is not persisted on purpose: restarting Grafana clears it
	restartRequired bool
}

func ProvideService(features *featuremgmt.FeatureManager, kv kvstore.KVStore) *Service {
	s := &Service{
		features: features,
		kv:       kvstore.WithNamespace(kv, kvstore.AllOrganizations, kvNamespace),
		log:      log.New("labs"),
	}

	// Stored overrides are applied as early as possible, but services that read a toggle while
	// they are constructed may already have seen the configured value. Toggles that behave this
	// way are flagged with RequiresRestart so the UI can ask for a restart.
	if err := s.applyStoredOverrides(context.Background()); err != nil {
		s.log.Error("Failed to apply stored feature toggle overrides", "error", err)
	}

	return s
}

// State returns the feature toggle state of the instance. allowEditing reflects whether the
// caller is allowed to change the toggles.
func (s *Service) State(allowEditing bool) State {
	s.mu.Lock()
	restartRequired := s.restartRequired
	s.mu.Unlock()

	return s.buildState(allowEditing, restartRequired)
}

func (s *Service) buildState(allowEditing bool, restartRequired bool) State {
	flagStates := s.features.GetFlagStates()

	toggles := make([]ToggleState, 0, len(flagStates))
	for _, state := range flagStates {
		toggles = append(toggles, ToggleState{
			Name:            state.Flag.Name,
			Description:     state.Flag.Description,
			Stage:           state.Flag.Stage.String(),
			Enabled:         state.Enabled,
			Writeable:       state.Writeable,
			Source:          sourceOf(state),
			RequiresRestart: state.Flag.RequiresRestart,
			Warning:         state.Warning,
		})
	}

	return State{
		AllowEditing:    allowEditing,
		RestartRequired: restartRequired,
		Toggles:         toggles,
	}
}

// SetToggles persists and applies the given feature toggle values. Every requested toggle must
// be registered and writeable, otherwise nothing is changed.
func (s *Service) SetToggles(ctx context.Context, updates map[string]bool) (State, error) {
	if len(updates) == 0 {
		return s.State(true), nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	states := map[string]featuremgmt.FlagState{}
	for _, state := range s.features.GetFlagStates() {
		states[state.Flag.Name] = state
	}

	restartRequired := false
	for _, name := range sortedKeys(updates) {
		state, ok := states[name]
		if !ok {
			return State{}, fmt.Errorf("%w: %s is not registered", ErrInvalidToggle, name)
		}
		if !state.Writeable {
			return State{}, fmt.Errorf("%w: %s can not be changed on this instance", ErrInvalidToggle, name)
		}
		if state.Flag.RequiresRestart && state.Enabled != updates[name] {
			restartRequired = true
		}
	}

	stored, err := s.storedOverrides(ctx)
	if err != nil {
		return State{}, err
	}
	for name, enabled := range updates {
		stored[name] = enabled
	}

	if err := s.saveOverrides(ctx, stored); err != nil {
		return State{}, err
	}
	if err := s.features.SetOverrides(updates); err != nil {
		return State{}, fmt.Errorf("%w: %s", ErrInvalidToggle, err.Error())
	}

	if restartRequired {
		s.restartRequired = true
	}

	s.log.Info("Feature toggles updated from Labs", "toggles", updates)

	return s.buildState(true, s.restartRequired), nil
}

func (s *Service) applyStoredOverrides(ctx context.Context) error {
	stored, err := s.storedOverrides(ctx)
	if err != nil {
		return err
	}
	if len(stored) == 0 {
		return nil
	}

	known := map[string]struct{}{}
	for _, state := range s.features.GetFlagStates() {
		if state.Writeable {
			known[state.Flag.Name] = struct{}{}
		}
	}

	overrides := make(map[string]bool, len(stored))
	for name, enabled := range stored {
		if _, ok := known[name]; !ok {
			s.log.Warn("Ignoring stored override for unknown feature toggle", "toggle", name)
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

	s.log.Info("Applied stored feature toggle overrides", "toggles", overrides)
	return nil
}

func (s *Service) storedOverrides(ctx context.Context) (map[string]bool, error) {
	value, ok, err := s.kv.Get(ctx, kvOverridesKey)
	if err != nil {
		return nil, err
	}
	if !ok || value == "" {
		return map[string]bool{}, nil
	}

	overrides := map[string]bool{}
	if err := json.Unmarshal([]byte(value), &overrides); err != nil {
		return nil, fmt.Errorf("failed to read stored feature toggle overrides: %w", err)
	}
	return overrides, nil
}

func (s *Service) saveOverrides(ctx context.Context, overrides map[string]bool) error {
	value, err := json.Marshal(overrides)
	if err != nil {
		return err
	}
	return s.kv.Set(ctx, kvOverridesKey, string(value))
}

func sourceOf(state featuremgmt.FlagState) Source {
	switch {
	case state.Overridden:
		return SourceLabs
	case state.Configured:
		return SourceConfig
	default:
		return SourceDefault
	}
}

func sortedKeys(values map[string]bool) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
