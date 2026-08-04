package featuremgmt

import (
	"context"
	"sync"
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
}

func TestFeatureManagerSetEnabled(t *testing.T) {
	newManager := func(devMode bool) *FeatureManager {
		fm := &FeatureManager{
			isDevMod: devMode,
			flags:    map[string]*FeatureFlag{},
			enabled:  map[string]bool{},
			startup:  map[string]bool{},
			warnings: map[string]string{},
		}
		fm.registerFlags(
			FeatureFlag{Name: "stable"},
			FeatureFlag{Name: "onByDefault", Expression: "true"},
			FeatureFlag{Name: "devOnly", RequiresDevMode: true, Stage: FeatureStageExperimental},
		)
		return fm
	}

	t.Run("returns an error for an unknown flag", func(t *testing.T) {
		fm := newManager(true)
		err := fm.SetEnabled("does-not-exist", true)
		require.Error(t, err)
		require.False(t, fm.IsEnabledGlobally("does-not-exist"))
	})

	t.Run("enables and disables a known flag at runtime", func(t *testing.T) {
		fm := newManager(true)
		require.False(t, fm.IsEnabledGlobally("stable"))

		require.NoError(t, fm.SetEnabled("stable", true))
		require.True(t, fm.IsEnabledGlobally("stable"))

		require.NoError(t, fm.SetEnabled("stable", false))
		require.False(t, fm.IsEnabledGlobally("stable"))
	})

	t.Run("can disable a flag that is on by default", func(t *testing.T) {
		fm := newManager(true)
		require.True(t, fm.IsEnabledGlobally("onByDefault"))

		require.NoError(t, fm.SetEnabled("onByDefault", false))
		require.False(t, fm.IsEnabledGlobally("onByDefault"))
	})

	t.Run("cannot enable a dev-mode flag when not in dev mode", func(t *testing.T) {
		fm := newManager(false)
		err := fm.SetEnabled("devOnly", true)
		require.Error(t, err)
		require.False(t, fm.IsEnabledGlobally("devOnly"))

		// Disabling a dev-mode flag is always allowed.
		require.NoError(t, fm.SetEnabled("devOnly", false))
	})

	t.Run("enables a dev-mode flag when in dev mode", func(t *testing.T) {
		fm := newManager(true)
		require.NoError(t, fm.SetEnabled("devOnly", true))
		require.True(t, fm.IsEnabledGlobally("devOnly"))
	})

	t.Run("is safe for concurrent reads and writes", func(t *testing.T) {
		fm := newManager(true)

		var wg sync.WaitGroup
		for i := 0; i < 50; i++ {
			wg.Add(3)
			go func() {
				defer wg.Done()
				_ = fm.SetEnabled("stable", true)
			}()
			go func() {
				defer wg.Done()
				_ = fm.IsEnabledGlobally("stable")
			}()
			go func() {
				defer wg.Done()
				_ = fm.GetEnabled(context.Background())
			}()
		}
		wg.Wait()
	})
}
