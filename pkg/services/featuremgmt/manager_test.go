package featuremgmt

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFeatureManager(t *testing.T) {
	t.Run("check testing stubs", func(t *testing.T) {
		ft := WithManager("a", "b", "c")
		require.True(t, ft.IsEnabledGlobally("a"))
		require.True(t, ft.IsEnabledGlobally("b"))
		require.True(t, ft.IsEnabledGlobally("c"))
		require.False(t, ft.IsEnabledGlobally("d"))

		require.Equal(t, map[string]bool{"a": true, "b": true, "c": true}, ft.GetEnabled(context.Background()))

		// Explicit values
		ft = WithManager("a", true, "b", false)
		require.True(t, ft.IsEnabledGlobally("a"))
		require.False(t, ft.IsEnabledGlobally("b"))
		require.Equal(t, map[string]bool{"a": true}, ft.GetEnabled(context.Background()))
	})

	t.Run("check description and stage configs", func(t *testing.T) {
		ft := FeatureManager{
			flags: map[string]*FeatureFlag{},
		}
		ft.registerFlags(FeatureFlag{
			Name:        "a",
			Description: "first",
		}, FeatureFlag{
			Name:        "a",
			Description: "second",
		}, FeatureFlag{
			Name:  "a",
			Stage: FeatureStagePrivatePreview,
		}, FeatureFlag{
			Name: "a",
		})
		flag := ft.flags["a"]
		require.Equal(t, "second", flag.Description)
		require.Equal(t, FeatureStagePrivatePreview, flag.Stage)
	})

	t.Run("check startup false flags", func(t *testing.T) {
		ft := FeatureManager{
			flags: map[string]*FeatureFlag{},
			startup: map[string]bool{
				"a": true,
				"b": false, // but default true
			},
		}
		ft.registerFlags(FeatureFlag{
			Name: "a",
		}, FeatureFlag{
			Name:       "b",
			Expression: "true",
		}, FeatureFlag{
			Name: "c",
		})
		require.True(t, ft.IsEnabledGlobally("a"))
		require.False(t, ft.IsEnabledGlobally("b"))
		require.False(t, ft.IsEnabledGlobally("c"))
	})

	t.Run("runtime overrides win over the startup configuration", func(t *testing.T) {
		ft := FeatureManager{
			flags:    map[string]*FeatureFlag{},
			startup:  map[string]bool{"a": true},
			warnings: map[string]string{},
		}
		ft.registerFlags(FeatureFlag{
			Name: "a",
		}, FeatureFlag{
			Name:       "b",
			Expression: "true",
		}, FeatureFlag{
			Name: "c",
		})

		require.NoError(t, ft.SetOverrides(map[string]bool{"a": false, "c": true}))

		require.False(t, ft.IsEnabledGlobally("a"))
		require.True(t, ft.IsEnabledGlobally("b"))
		require.True(t, ft.IsEnabledGlobally("c"))
		require.Equal(t, map[string]bool{"b": true, "c": true}, ft.GetEnabled(context.Background()))
		require.Equal(t, map[string]bool{"a": false, "c": true}, ft.GetOverrides())

		// the default values are still readable while overridden
		require.True(t, ft.IsEnabledByDefault("a"))
		require.False(t, ft.IsEnabledByDefault("c"))
	})

	t.Run("setting a flag back to its default value drops the override", func(t *testing.T) {
		ft := FeatureManager{
			flags:    map[string]*FeatureFlag{},
			startup:  map[string]bool{"a": true},
			warnings: map[string]string{},
		}
		ft.registerFlags(FeatureFlag{Name: "a"}, FeatureFlag{Name: "b"})

		require.NoError(t, ft.SetOverrides(map[string]bool{"a": false, "b": true}))
		require.Equal(t, map[string]bool{"a": false, "b": true}, ft.GetOverrides())

		require.NoError(t, ft.SetOverrides(map[string]bool{"a": true, "b": false}))
		require.Empty(t, ft.GetOverrides())
		require.True(t, ft.IsEnabledGlobally("a"))
		require.False(t, ft.IsEnabledGlobally("b"))
	})

	t.Run("unknown flags are rejected and no override is applied", func(t *testing.T) {
		ft := FeatureManager{
			flags:    map[string]*FeatureFlag{},
			warnings: map[string]string{},
		}
		ft.registerFlags(FeatureFlag{Name: "a"})

		require.Error(t, ft.SetOverrides(map[string]bool{"a": true, "nope": true}))
		require.Empty(t, ft.GetOverrides())
		require.False(t, ft.IsEnabledGlobally("a"))
	})

	t.Run("flags that do not meet the requirements can not be enabled", func(t *testing.T) {
		ft := FeatureManager{
			isDevMod: false,
			flags:    map[string]*FeatureFlag{},
			warnings: map[string]string{},
		}
		ft.registerFlags(FeatureFlag{Name: "a", RequiresDevMode: true})

		require.NoError(t, ft.SetOverrides(map[string]bool{"a": true}))
		require.False(t, ft.IsEnabledGlobally("a"))

		supported, reason := ft.IsSupported("a")
		require.False(t, supported)
		require.Equal(t, "requires dev mode", reason)
	})
}
