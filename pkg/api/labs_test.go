package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/infra/kvstore"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/featuremgmt/labs"
	"github.com/grafana/grafana/pkg/web/webtest"
)

func setupLabsTestServer(t *testing.T) (*webtest.Server, *featuremgmt.FeatureManager) {
	t.Helper()

	features := featuremgmt.WithFlags(
		featuremgmt.FeatureFlag{Name: "alpha", Description: "alpha flag"},
		featuremgmt.FeatureFlag{Name: "beta", Expression: "true"},
	)

	server := SetupAPITestServer(t, func(hs *HTTPServer) {
		hs.Features = features
		hs.labsService = labs.ProvideService(features, kvstore.NewFakeKVStore())
	})

	return server, features
}

func TestAPIEndpoint_GetLabsFeatureToggles(t *testing.T) {
	type testCase struct {
		desc                 string
		permissions          []accesscontrol.Permission
		expectedCode         int
		expectedAllowEditing bool
	}

	tests := []testCase{
		{
			desc:         "should not be accessible without the read permission",
			permissions:  []accesscontrol.Permission{},
			expectedCode: http.StatusForbidden,
		},
		{
			desc:                 "readers can list the toggles but not edit them",
			permissions:          []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementRead}},
			expectedCode:         http.StatusOK,
			expectedAllowEditing: false,
		},
		{
			desc: "writers are allowed to edit",
			permissions: []accesscontrol.Permission{
				{Action: accesscontrol.ActionFeatureManagementRead},
				{Action: accesscontrol.ActionFeatureManagementWrite},
			},
			expectedCode:         http.StatusOK,
			expectedAllowEditing: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			server, _ := setupLabsTestServer(t)

			req := webtest.RequestWithSignedInUser(server.NewGetRequest("/api/labs/feature-toggles"),
				userWithPermissions(1, tt.permissions))
			res, err := server.Send(req)
			require.NoError(t, err)
			defer func() { require.NoError(t, res.Body.Close()) }()

			assert.Equal(t, tt.expectedCode, res.StatusCode)
			if tt.expectedCode != http.StatusOK {
				return
			}

			state := labs.State{}
			require.NoError(t, json.NewDecoder(res.Body).Decode(&state))
			assert.Equal(t, tt.expectedAllowEditing, state.AllowEditing)
			require.Len(t, state.Toggles, 2)
			assert.Equal(t, "alpha", state.Toggles[0].Name)
			assert.False(t, state.Toggles[0].Enabled)
			assert.Equal(t, "beta", state.Toggles[1].Name)
			assert.True(t, state.Toggles[1].Enabled)
		})
	}
}

func TestAPIEndpoint_UpdateLabsFeatureToggles(t *testing.T) {
	t.Run("should require the write permission", func(t *testing.T) {
		server, features := setupLabsTestServer(t)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPatch, "/api/labs/feature-toggles", strings.NewReader(`{"toggles":[{"name":"alpha","enabled":true}]}`)),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementRead}}))
		res, err := server.SendJSON(req)
		require.NoError(t, err)
		require.NoError(t, res.Body.Close())

		assert.Equal(t, http.StatusForbidden, res.StatusCode)
		assert.False(t, features.IsEnabledGlobally("alpha"))
	})

	t.Run("should apply the requested changes", func(t *testing.T) {
		server, features := setupLabsTestServer(t)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPatch, "/api/labs/feature-toggles",
				strings.NewReader(`{"toggles":[{"name":"alpha","enabled":true},{"name":"beta","enabled":false}]}`)),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementWrite}}))
		res, err := server.SendJSON(req)
		require.NoError(t, err)
		defer func() { require.NoError(t, res.Body.Close()) }()

		require.Equal(t, http.StatusOK, res.StatusCode)
		assert.True(t, features.IsEnabledGlobally("alpha"))
		assert.False(t, features.IsEnabledGlobally("beta"))

		state := labs.State{}
		require.NoError(t, json.NewDecoder(res.Body).Decode(&state))
		assert.True(t, state.AllowEditing)
		for _, toggle := range state.Toggles {
			assert.Equal(t, labs.SourceLabs, toggle.Source, toggle.Name)
		}
	})

	t.Run("should reject unknown toggles", func(t *testing.T) {
		server, _ := setupLabsTestServer(t)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPatch, "/api/labs/feature-toggles", strings.NewReader(`{"toggles":[{"name":"nope","enabled":true}]}`)),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementWrite}}))
		res, err := server.SendJSON(req)
		require.NoError(t, err)
		require.NoError(t, res.Body.Close())

		assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	})

	t.Run("should reject an empty request", func(t *testing.T) {
		server, _ := setupLabsTestServer(t)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPatch, "/api/labs/feature-toggles", strings.NewReader(`{"toggles":[]}`)),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementWrite}}))
		res, err := server.SendJSON(req)
		require.NoError(t, err)
		require.NoError(t, res.Body.Close())

		assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	})
}
