package featuremgmt

import (
	"context"
	"fmt"
	"maps"
	"reflect"
	"sync"
	"sync/atomic"

	"github.com/grafana/grafana/pkg/infra/log"
)

var (
	_ FeatureToggles = (*FeatureManager)(nil)
)

type FeatureManager struct {
	isDevMod bool

	// enabled holds only the "on" values. The map it points to is never mutated
	// after being stored, so readers on the hot path never have to take a lock.
	enabled atomic.Pointer[map[string]bool]

	// mu guards the fields below and any call to update()
	mu        sync.Mutex
	flags     map[string]*FeatureFlag
	startup   map[string]bool   // the explicit values registered at startup
	overrides map[string]bool   // values set at runtime, they take precedence over startup
	warnings  map[string]string // potential warnings about the flag

	log log.Logger
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
	fm.update()
}

// meetsRequirements checks if grafana is able to run the given feature due to dev mode or licensing requirements
func (fm *FeatureManager) meetsRequirements(ff *FeatureFlag) (bool, string) {
	if ff.RequiresDevMode && !fm.isDevMod {
		return false, "requires dev mode"
	}

	return true, ""
}

// update recalculates the enabled flags. Callers must hold fm.mu.
func (fm *FeatureManager) update() {
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

		if fm.isFlagEnabled(flag) {
			track = 1
			enabled[flag.Name] = true
		}

		// Register value with prometheus metric
		featureToggleInfo.WithLabelValues(flag.Name).Set(track)
	}
	fm.enabled.Store(&enabled)
}

// isFlagEnabled resolves the value of a single flag. Callers must hold fm.mu.
func (fm *FeatureManager) isFlagEnabled(flag *FeatureFlag) bool {
	if value, ok := fm.overrides[flag.Name]; ok {
		return value
	}
	return fm.isFlagEnabledByDefault(flag)
}

// isFlagEnabledByDefault resolves the value a flag has when it is not overridden
// at runtime. Callers must hold fm.mu.
func (fm *FeatureManager) isFlagEnabledByDefault(flag *FeatureFlag) bool {
	if value, ok := fm.startup[flag.Name]; ok {
		return value
	}
	return flag.Expression == "true"
}

func (fm *FeatureManager) enabledFlags() map[string]bool {
	if enabled := fm.enabled.Load(); enabled != nil {
		return *enabled
	}
	return nil
}

// IsEnabled checks if a feature is enabled
func (fm *FeatureManager) IsEnabled(ctx context.Context, flag string) bool {
	return fm.enabledFlags()[flag]
}

// IsEnabledGlobally checks if a feature is for all tenants
func (fm *FeatureManager) IsEnabledGlobally(flag string) bool {
	return fm.enabledFlags()[flag]
}

// GetEnabled returns a map containing only the features that are enabled
func (fm *FeatureManager) GetEnabled(ctx context.Context) map[string]bool {
	current := fm.enabledFlags()
	enabled := make(map[string]bool, len(current))
	for key, val := range current {
		if val {
			enabled[key] = true
		}
	}
	return enabled
}

// GetFlags returns all flag definitions
func (fm *FeatureManager) GetFlags() []FeatureFlag {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	v := make([]FeatureFlag, 0, len(fm.flags))
	for _, value := range fm.flags {
		v = append(v, *value)
	}
	return v
}

// GetFlag returns a single flag definition
func (fm *FeatureManager) GetFlag(name string) (FeatureFlag, bool) {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	flag, ok := fm.flags[name]
	if !ok {
		return FeatureFlag{}, false
	}
	return *flag, true
}

// IsSupported reports whether this instance is able to run the given flag and,
// when it is not, a human readable reason why
func (fm *FeatureManager) IsSupported(name string) (bool, string) {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	flag, ok := fm.flags[name]
	if !ok {
		return false, "unknown flag"
	}
	return fm.meetsRequirements(flag)
}

// IsEnabledByDefault reports the value a flag would have without any runtime override
func (fm *FeatureManager) IsEnabledByDefault(name string) bool {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	flag, ok := fm.flags[name]
	if !ok {
		return false
	}
	return fm.isFlagEnabledByDefault(flag)
}

// SetOverrides changes the value of the given flags for this instance until it is
// restarted. Values matching the flag default drop the override instead of storing
// it, so that GetOverrides only ever reports actual deviations from the configuration.
// Unknown flags are reported as an error and no override is applied.
func (fm *FeatureManager) SetOverrides(values map[string]bool) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	for name := range values {
		if _, ok := fm.flags[name]; !ok {
			return fmt.Errorf("unknown feature toggle: %s", name)
		}
	}

	for name, value := range values {
		if value == fm.isFlagEnabledByDefault(fm.flags[name]) {
			delete(fm.overrides, name)
			continue
		}
		if fm.overrides == nil {
			fm.overrides = make(map[string]bool, len(values))
		}
		fm.overrides[name] = value
	}

	fm.update()
	return nil
}

// GetOverrides returns the flags that currently deviate from the startup configuration
func (fm *FeatureManager) GetOverrides() map[string]bool {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	return maps.Clone(fm.overrides)
}

// ############# Test Functions #############

func WithFeatures(spec ...any) FeatureToggles {
	return WithManager(spec...)
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

	fm := &FeatureManager{flags: features, startup: enabled, warnings: map[string]string{}}
	fm.enabled.Store(&enabled)
	return fm
}

// WithManagerFlags is used to define feature toggles for testing when the tests
// care about the flag definition and not only about its value.
func WithManagerFlags(flags ...FeatureFlag) *FeatureManager {
	fm := &FeatureManager{
		flags:    make(map[string]*FeatureFlag, len(flags)),
		startup:  map[string]bool{},
		warnings: map[string]string{},
	}
	fm.registerFlags(flags...)
	return fm
}
