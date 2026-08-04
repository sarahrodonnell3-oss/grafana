package labs

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/infra/kvstore"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

func TestGetFeatureToggles(t *testing.T) {
	s := setupService(t, featuremgmt.WithManager("b", true, "a", false))

	toggles := s.GetFeatureToggles(context.Background())

	require.Len(t, toggles, 2)
	require.Equal(t, "a", toggles[0].Name, "toggles are sorted by name")
	require.False(t, toggles[0].Enabled)
	require.Equal(t, "b", toggles[1].Name)
	require.True(t, toggles[1].Enabled)
	require.True(t, toggles[1].DefaultEnabled)
	require.False(t, toggles[1].Overridden)
}

func TestSetFeatureToggles(t *testing.T) {
	t.Run("applies and persists the new values", func(t *testing.T) {
		kv := kvstore.NewFakeKVStore()
		features := featuremgmt.WithManager("a", false)
		s := newService(t, features, kv)

		require.NoError(t, s.SetFeatureToggles(context.Background(), map[string]bool{"a": true}))

		require.True(t, features.IsEnabledGlobally("a"))

		toggles := s.GetFeatureToggles(context.Background())
		require.True(t, toggles[0].Enabled)
		require.False(t, toggles[0].DefaultEnabled)
		require.True(t, toggles[0].Overridden)

		// a restart reads the value back from the store
		restarted := featuremgmt.WithManager("a", false)
		newService(t, restarted, kv)
		require.True(t, restarted.IsEnabledGlobally("a"))
	})

	t.Run("rejects unknown toggles", func(t *testing.T) {
		s := setupService(t, featuremgmt.WithManager("a", false))

		err := s.SetFeatureToggles(context.Background(), map[string]bool{"nope": true})

		require.ErrorIs(t, err, ErrToggleNotFound)
	})

	t.Run("rejects toggles that are only read at startup", func(t *testing.T) {
		features := featuremgmt.WithManagerFlags(featuremgmt.FeatureFlag{
			Name:            "needs-restart",
			RequiresRestart: true,
		})
		s := setupService(t, features)

		err := s.SetFeatureToggles(context.Background(), map[string]bool{"needs-restart": true})

		require.ErrorIs(t, err, ErrToggleReadOnly)
		require.True(t, s.GetFeatureToggles(context.Background())[0].ReadOnly)
	})
}

func TestRestoreOverrides(t *testing.T) {
	t.Run("drops stored values for toggles that no longer exist", func(t *testing.T) {
		kv := kvstore.NewFakeKVStore()
		require.NoError(t, kv.Set(context.Background(), 0, kvNamespace, kvOverrides, `{"a":true,"removed":true}`))

		features := featuremgmt.WithManager("a", false)
		newService(t, features, kv)

		require.True(t, features.IsEnabledGlobally("a"))
		require.False(t, features.IsEnabledGlobally("removed"))
	})

	t.Run("starts with the configured values when the stored value is broken", func(t *testing.T) {
		kv := kvstore.NewFakeKVStore()
		require.NoError(t, kv.Set(context.Background(), 0, kvNamespace, kvOverrides, "not json"))

		features := featuremgmt.WithManager("a", true)
		newService(t, features, kv)

		require.True(t, features.IsEnabledGlobally("a"))
	})
}

func setupService(t *testing.T, features *featuremgmt.FeatureManager) *Service {
	t.Helper()
	return newService(t, features, kvstore.NewFakeKVStore())
}

func newService(t *testing.T, features *featuremgmt.FeatureManager, kv kvstore.KVStore) *Service {
	t.Helper()
	s, err := ProvideService(features, kv)
	require.NoError(t, err)
	return s
}
