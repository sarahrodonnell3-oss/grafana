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

	t.Run("runtime overrides win over startup values", func(t *testing.T) {
		ft := FeatureManager{
			flags:    map[string]*FeatureFlag{},
			warnings: map[string]string{},
			startup: map[string]bool{
				"a": true,
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

		require.NoError(t, ft.SetOverrides(map[string]bool{"a": false, "b": false, "c": true}))
		require.False(t, ft.IsEnabledGlobally("a"))
		require.False(t, ft.IsEnabledGlobally("b"))
		require.True(t, ft.IsEnabledGlobally("c"))
		require.Equal(t, map[string]bool{"c": true}, ft.GetEnabled(context.Background()))

		// startup values are restored when the override is flipped back
		require.NoError(t, ft.SetOverrides(map[string]bool{"a": true}))
		require.True(t, ft.IsEnabledGlobally("a"))
	})

	t.Run("overrides are rejected for unknown and dev mode only flags", func(t *testing.T) {
		ft := FeatureManager{
			isDevMod: false,
			flags:    map[string]*FeatureFlag{},
			warnings: map[string]string{},
		}
		ft.registerFlags(FeatureFlag{
			Name:            "devOnly",
			RequiresDevMode: true,
		})

		require.ErrorContains(t, ft.SetOverrides(map[string]bool{"unknown": true}), "unknown feature toggle")
		require.ErrorContains(t, ft.SetOverrides(map[string]bool{"devOnly": true}), "requires dev mode")
		require.False(t, ft.IsEnabledGlobally("devOnly"))

		// a rejected batch must not apply any of its values
		require.Error(t, ft.SetOverrides(map[string]bool{"devOnly": true, "unknown": true}))
		require.Empty(t, ft.GetEnabled(context.Background()))
	})

	t.Run("flag states describe how each value was resolved", func(t *testing.T) {
		ft := FeatureManager{
			flags:    map[string]*FeatureFlag{},
			warnings: map[string]string{},
			startup: map[string]bool{
				"configured": true,
			},
		}
		ft.registerFlags(FeatureFlag{
			Name:        "configured",
			Description: "set in the config file",
		}, FeatureFlag{
			Name:            "devOnly",
			RequiresDevMode: true,
		}, FeatureFlag{
			Name:            "overridden",
			RequiresRestart: true,
		})
		require.NoError(t, ft.SetOverrides(map[string]bool{"overridden": true}))

		states := ft.GetFlagStates()
		require.Len(t, states, 3)

		byName := map[string]FlagState{}
		for _, state := range states {
			byName[state.Flag.Name] = state
		}

		require.Equal(t, []string{"configured", "devOnly", "overridden"},
			[]string{states[0].Flag.Name, states[1].Flag.Name, states[2].Flag.Name})

		require.True(t, byName["configured"].Enabled)
		require.True(t, byName["configured"].Configured)
		require.False(t, byName["configured"].Overridden)
		require.True(t, byName["configured"].Writeable)

		require.False(t, byName["devOnly"].Enabled)
		require.False(t, byName["devOnly"].Writeable)
		require.Equal(t, "requires dev mode", byName["devOnly"].Warning)

		require.True(t, byName["overridden"].Enabled)
		require.True(t, byName["overridden"].Overridden)
		require.False(t, byName["overridden"].Configured)
		require.True(t, byName["overridden"].Flag.RequiresRestart)
	})
}
