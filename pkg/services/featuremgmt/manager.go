package featuremgmt

import (
	"context"
	"fmt"
	"reflect"
	"sort"
	"sync"

	"github.com/grafana/grafana/pkg/infra/log"
)

var (
	_ FeatureToggles = (*FeatureManager)(nil)
)

type FeatureManager struct {
	isDevMod bool

	// mu guards every map below, so that overrides can be applied while requests are
	// evaluating toggles.
	mu        sync.RWMutex
	flags     map[string]*FeatureFlag
	enabled   map[string]bool   // only the "on" values
	startup   map[string]bool   // the explicit values registered at startup
	overrides map[string]bool   // values changed at runtime, they win over the startup values
	warnings  map[string]string // potential warnings about the flag
	log       log.Logger
}

// FlagState is the resolved state of a single feature toggle.
type FlagState struct {
	Flag FeatureFlag

	// Enabled is the effective value of the toggle
	Enabled bool

	// Overridden means the value was changed at runtime, so it differs from the startup value
	Overridden bool

	// Configured means the value was set explicitly in the configuration file
	Configured bool

	// Writeable means the value can be changed at runtime
	Writeable bool

	// Warning describes why a toggle may not behave as expected, eg: unknown flag in config
	Warning string
}

// This will merge the flags with the current configuration
func (fm *FeatureManager) registerFlags(flags ...FeatureFlag) {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	for _, add := range flags {
		if add.Name == "" {
			continue // skip it with warning?
		}
		flag, ok := fm.flags[add.Name]
		if !ok {
			f := add // make a copy
			fm.flags[add.Name] = &f
			continue
		}

		// Selectively update properties
		if add.Description != "" {
			flag.Description = add.Description
		}
		if add.Expression != "" {
			flag.Expression = add.Expression
		}

		// The most recently defined state
		if add.Stage != FeatureStageUnknown {
			flag.Stage = add.Stage
		}

		// Only gets more restrictive
		if add.RequiresDevMode {
			flag.RequiresDevMode = true
		}

		if add.RequiresRestart {
			flag.RequiresRestart = true
		}
	}

	// This will evaluate all flags
	fm.updateEnabled()
}

// SetOverrides changes the value of feature toggles at runtime. Overrides win over the values
// configured at startup and are kept until the process restarts. Toggles that can not be
// enabled on this instance (eg: they require dev mode) or that are not registered are rejected,
// and no override is applied.
func (fm *FeatureManager) SetOverrides(overrides map[string]bool) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	for _, name := range sortedKeys(overrides) {
		flag, ok := fm.flags[name]
		if !ok {
			return fmt.Errorf("unknown feature toggle: %s", name)
		}
		if ok, reason := fm.meetsRequirements(flag); !ok {
			return fmt.Errorf("feature toggle %s can not be changed: %s", name, reason)
		}
	}

	if fm.overrides == nil {
		fm.overrides = make(map[string]bool, len(overrides))
	}
	for name, enabled := range overrides {
		fm.overrides[name] = enabled
	}

	fm.updateEnabled()
	return nil
}

// GetFlagStates returns the resolved state of every registered feature toggle
func (fm *FeatureManager) GetFlagStates() []FlagState {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	states := make([]FlagState, 0, len(fm.flags))
	for name, flag := range fm.flags {
		writeable, _ := fm.meetsRequirements(flag)

		_, configured := fm.startup[name]
		_, overridden := fm.overrides[name]

		states = append(states, FlagState{
			Flag:       *flag,
			Enabled:    fm.enabled[name],
			Overridden: overridden,
			Configured: configured,
			Writeable:  writeable,
			Warning:    fm.warnings[name],
		})
	}

	sort.Slice(states, func(i, j int) bool {
		return states[i].Flag.Name < states[j].Flag.Name
	})

	return states
}

func sortedKeys(values map[string]bool) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

// meetsRequirements checks if grafana is able to run the given feature due to dev mode or licensing requirements
func (fm *FeatureManager) meetsRequirements(ff *FeatureFlag) (bool, string) {
	if ff.RequiresDevMode && !fm.isDevMod {
		return false, "requires dev mode"
	}

	return true, ""
}

// updateEnabled re-evaluates every flag. Callers must hold the write lock.
func (fm *FeatureManager) updateEnabled() {
	enabled := make(map[string]bool)
	for _, flag := range fm.flags {
		// if grafana cannot run the feature, omit metrics around it
		ok, reason := fm.meetsRequirements(flag)
		if !ok {
			fm.warnings[flag.Name] = reason
			continue
		}

		// Update the registry
		track := 0.0

		startup, ok := fm.startup[flag.Name]
		value := startup || (!ok && flag.Expression == "true")
		if override, ok := fm.overrides[flag.Name]; ok {
			value = override
		}

		if value {
			track = 1
			enabled[flag.Name] = true
		}

		// Register value with prometheus metric
		featureToggleInfo.WithLabelValues(flag.Name).Set(track)
	}
	fm.enabled = enabled
}

// IsEnabled checks if a feature is enabled
func (fm *FeatureManager) IsEnabled(ctx context.Context, flag string) bool {
	return fm.IsEnabledGlobally(flag)
}

// IsEnabledGlobally checks if a feature is for all tenants
func (fm *FeatureManager) IsEnabledGlobally(flag string) bool {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	return fm.enabled[flag]
}

// GetEnabled returns a map containing only the features that are enabled
func (fm *FeatureManager) GetEnabled(ctx context.Context) map[string]bool {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	enabled := make(map[string]bool, len(fm.enabled))
	for key, val := range fm.enabled {
		if val {
			enabled[key] = true
		}
	}
	return enabled
}

// GetFlags returns all flag definitions
func (fm *FeatureManager) GetFlags() []FeatureFlag {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	v := make([]FeatureFlag, 0, len(fm.flags))
	for _, value := range fm.flags {
		v = append(v, *value)
	}
	return v
}

// ############# Test Functions #############

func WithFeatures(spec ...any) FeatureToggles {
	return WithManager(spec...)
}

// WithFlags is used to define feature toggles for testing when the tests care about the flag
// properties, and not only about the enabled values.
func WithFlags(flags ...FeatureFlag) *FeatureManager {
	fm := &FeatureManager{
		flags:     map[string]*FeatureFlag{},
		enabled:   map[string]bool{},
		startup:   map[string]bool{},
		overrides: map[string]bool{},
		warnings:  map[string]string{},
		log:       log.New("featuremgmt"),
	}
	fm.registerFlags(flags...)
	return fm
}

// WithFeatures is used to define feature toggles for testing.
// The arguments are a list of strings that are optionally followed by a boolean value for example:
// WithFeatures([]any{"my_feature", "other_feature"}) or WithFeatures([]any{"my_feature", true})
func WithManager(spec ...any) *FeatureManager {
	count := len(spec)
	features := make(map[string]*FeatureFlag, count)
	enabled := make(map[string]bool, count)

	idx := 0
	for idx < count {
		key := fmt.Sprintf("%v", spec[idx])
		val := true
		idx++
		if idx < count && reflect.TypeOf(spec[idx]).Kind() == reflect.Bool { // #nosec G602 -- bounds checked by `idx < count`
			val = spec[idx].(bool) // #nosec G602 -- bounds checked by `idx < count`
			idx++
		}

		features[key] = &FeatureFlag{Name: key}
		if val {
			enabled[key] = true
		}
	}

	return &FeatureManager{
		enabled:   enabled,
		flags:     features,
		startup:   enabled,
		overrides: map[string]bool{},
		warnings:  map[string]string{},
	}
}
