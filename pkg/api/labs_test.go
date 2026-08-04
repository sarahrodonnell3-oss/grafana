package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/web/webtest"
)

func setupLabsTestServer(t *testing.T, features featuremgmt.FeatureToggles) *webtest.Server {
	t.Helper()
	return SetupAPITestServer(t, func(hs *HTTPServer) {
		hs.Features = features
	})
}

func TestGetLabsFeatures(t *testing.T) {
	features := featuremgmt.WithManager("flagA", true, "flagB", false)

	t.Run("returns all flags with their state for a user with read permission", func(t *testing.T) {
		server := setupLabsTestServer(t, features)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodGet, "/api/labs/features", nil),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementRead}}),
		)
		res, err := server.Send(req)
		require.NoError(t, err)
		defer func() { require.NoError(t, res.Body.Close()) }()

		require.Equal(t, http.StatusOK, res.StatusCode)

		var body labsFeaturesResponse
		require.NoError(t, json.NewDecoder(res.Body).Decode(&body))

		enabled := map[string]bool{}
		for _, f := range body.Features {
			enabled[f.Name] = f.Enabled
		}
		require.True(t, enabled["flagA"])
		require.False(t, enabled["flagB"])
	})

	t.Run("is forbidden without read permission", func(t *testing.T) {
		server := setupLabsTestServer(t, features)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodGet, "/api/labs/features", nil),
			userWithPermissions(1, nil),
		)
		res, err := server.Send(req)
		require.NoError(t, err)
		defer func() { require.NoError(t, res.Body.Close()) }()

		assert.Equal(t, http.StatusForbidden, res.StatusCode)
	})
}

func TestUpdateLabsFeatures(t *testing.T) {
	t.Run("flips a flag for a user with write permission", func(t *testing.T) {
		features := featuremgmt.WithManager("flagA", false)
		server := setupLabsTestServer(t, features)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPatch, "/api/labs/features", mockRequestBody(map[string]bool{"flagA": true})),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementWrite}}),
		)
		res, err := server.Send(req)
		require.NoError(t, err)
		defer func() { require.NoError(t, res.Body.Close()) }()

		require.Equal(t, http.StatusOK, res.StatusCode)

		var body labsUpdateResponse
		require.NoError(t, json.NewDecoder(res.Body).Decode(&body))
		require.Equal(t, []string{"flagA"}, body.Updated)

		require.True(t, features.IsEnabledGlobally("flagA"))
	})

	t.Run("returns a bad request for an unknown flag", func(t *testing.T) {
		features := featuremgmt.WithManager("flagA", false)
		server := setupLabsTestServer(t, features)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPatch, "/api/labs/features", mockRequestBody(map[string]bool{"unknown": true})),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementWrite}}),
		)
		res, err := server.Send(req)
		require.NoError(t, err)
		defer func() { require.NoError(t, res.Body.Close()) }()

		assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	})

	t.Run("is forbidden with only read permission", func(t *testing.T) {
		features := featuremgmt.WithManager("flagA", false)
		server := setupLabsTestServer(t, features)

		req := webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPatch, "/api/labs/features", mockRequestBody(map[string]bool{"flagA": true})),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementRead}}),
		)
		res, err := server.Send(req)
		require.NoError(t, err)
		defer func() { require.NoError(t, res.Body.Close()) }()

		assert.Equal(t, http.StatusForbidden, res.StatusCode)
		require.False(t, features.IsEnabledGlobally("flagA"))
	})
}
