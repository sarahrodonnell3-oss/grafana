package labs

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/infra/kvstore"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

func TestLabsService(t *testing.T) {
	t.Run("lists every registered toggle with its source", func(t *testing.T) {
		features := featuremgmt.WithFlags(
			featuremgmt.FeatureFlag{Name: "enabledByDefault", Expression: "true", Description: "on"},
			featuremgmt.FeatureFlag{Name: "disabledByDefault"},
		)
		s := ProvideService(features, kvstore.NewFakeKVStore())

		state := s.State(true)
		require.True(t, state.AllowEditing)
		require.False(t, state.RestartRequired)
		require.Len(t, state.Toggles, 2)

		require.Equal(t, "disabledByDefault", state.Toggles[0].Name)
		require.False(t, state.Toggles[0].Enabled)
		require.Equal(t, SourceDefault, state.Toggles[0].Source)

		require.Equal(t, "enabledByDefault", state.Toggles[1].Name)
		require.True(t, state.Toggles[1].Enabled)
		require.True(t, state.Toggles[1].Writeable)
	})

	t.Run("applies and persists toggle changes", func(t *testing.T) {
		features := featuremgmt.WithFlags(
			featuremgmt.FeatureFlag{Name: "alpha"},
			featuremgmt.FeatureFlag{Name: "beta", Expression: "true"},
		)
		store := kvstore.NewFakeKVStore()
		s := ProvideService(features, store)

		state, err := s.SetToggles(context.Background(), map[string]bool{"alpha": true, "beta": false})
		require.NoError(t, err)
		require.False(t, state.RestartRequired)

		require.True(t, features.IsEnabledGlobally("alpha"))
		require.False(t, features.IsEnabledGlobally("beta"))

		for _, toggle := range state.Toggles {
			require.Equal(t, SourceLabs, toggle.Source, toggle.Name)
		}

		stored, found, err := store.Get(context.Background(), kvstore.AllOrganizations, kvNamespace, kvOverridesKey)
		require.NoError(t, err)
		require.True(t, found)
		require.JSONEq(t, `{"alpha":true,"beta":false}`, stored)
	})

	t.Run("asks for a restart when the changed toggle is read at startup", func(t *testing.T) {
		features := featuremgmt.WithFlags(
			featuremgmt.FeatureFlag{Name: "needsRestart", RequiresRestart: true},
		)
		s := ProvideService(features, kvstore.NewFakeKVStore())

		state, err := s.SetToggles(context.Background(), map[string]bool{"needsRestart": true})
		require.NoError(t, err)
		require.True(t, state.RestartRequired)
		require.True(t, s.State(true).RestartRequired)
	})

	t.Run("rejects toggles that can not be changed", func(t *testing.T) {
		features := featuremgmt.WithFlags(
			featuremgmt.FeatureFlag{Name: "alpha"},
		)
		store := kvstore.NewFakeKVStore()
		s := ProvideService(features, store)

		_, err := s.SetToggles(context.Background(), map[string]bool{"alpha": true, "unknown": true})
		require.ErrorIs(t, err, ErrInvalidToggle)

		// nothing is applied or persisted when a single toggle is invalid
		require.False(t, features.IsEnabledGlobally("alpha"))
		_, found, err := store.Get(context.Background(), kvstore.AllOrganizations, kvNamespace, kvOverridesKey)
		require.NoError(t, err)
		require.False(t, found)
	})

	t.Run("applies stored overrides on startup and ignores unknown ones", func(t *testing.T) {
		features := featuremgmt.WithFlags(
			featuremgmt.FeatureFlag{Name: "alpha"},
			featuremgmt.FeatureFlag{Name: "beta", Expression: "true"},
		)
		store := kvstore.NewFakeKVStore()
		require.NoError(t, store.Set(context.Background(), kvstore.AllOrganizations, kvNamespace, kvOverridesKey,
			`{"alpha":true,"beta":false,"removedFlag":true}`))

		s := ProvideService(features, store)

		require.True(t, features.IsEnabledGlobally("alpha"))
		require.False(t, features.IsEnabledGlobally("beta"))
		require.Len(t, s.State(false).Toggles, 2)
	})

	t.Run("keeps working when the stored value is corrupt", func(t *testing.T) {
		features := featuremgmt.WithFlags(featuremgmt.FeatureFlag{Name: "alpha"})
		store := kvstore.NewFakeKVStore()
		require.NoError(t, store.Set(context.Background(), kvstore.AllOrganizations, kvNamespace, kvOverridesKey, "not json"))

		s := ProvideService(features, store)
		require.Len(t, s.State(false).Toggles, 1)
	})
}
