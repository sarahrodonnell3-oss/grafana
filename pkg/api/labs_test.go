package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/infra/kvstore"
	"github.com/grafana/grafana/pkg/infra/log"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/labs"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/web"
)

func TestLabsFeatureTogglesAPI(t *testing.T) {
	setupServer := func(t *testing.T) (*HTTPServer, *featuremgmt.FeatureManager) {
		t.Helper()
		features := featuremgmt.WithManager("a", false, "b", true)
		labsService, err := labs.ProvideService(features, kvstore.NewFakeKVStore())
		require.NoError(t, err)
		return &HTTPServer{labsService: labsService, log: log.New("labs.test")}, features
	}

	t.Run("GET returns every toggle with its current value", func(t *testing.T) {
		hs, _ := setupServer(t)

		resp := hs.GetLabsFeatureToggles(newLabsReqContext(t, http.MethodGet, ""))

		require.Equal(t, http.StatusOK, resp.Status())
		toggles := decodeToggles(t, resp)
		require.Len(t, toggles, 2)
		require.Equal(t, "a", toggles[0].Name)
		require.False(t, toggles[0].Enabled)
		require.Equal(t, "b", toggles[1].Name)
		require.True(t, toggles[1].Enabled)
	})

	t.Run("PATCH updates the requested toggles and returns the new state", func(t *testing.T) {
		hs, features := setupServer(t)

		resp := hs.UpdateLabsFeatureToggles(newLabsReqContext(t, http.MethodPatch, `{"toggles":{"a":true}}`))

		require.Equal(t, http.StatusOK, resp.Status())
		require.True(t, features.IsEnabledGlobally("a"))
		require.True(t, features.IsEnabledGlobally("b"), "toggles that are not part of the request are untouched")

		toggles := decodeToggles(t, resp)
		require.True(t, toggles[0].Enabled)
		require.True(t, toggles[0].Overridden)
	})

	t.Run("PATCH rejects an empty request", func(t *testing.T) {
		hs, _ := setupServer(t)

		resp := hs.UpdateLabsFeatureToggles(newLabsReqContext(t, http.MethodPatch, `{"toggles":{}}`))

		require.Equal(t, http.StatusBadRequest, resp.Status())
	})

	t.Run("PATCH rejects unknown toggles", func(t *testing.T) {
		hs, _ := setupServer(t)

		resp := hs.UpdateLabsFeatureToggles(newLabsReqContext(t, http.MethodPatch, `{"toggles":{"nope":true}}`))

		require.Equal(t, http.StatusBadRequest, resp.Status())
	})
}

func newLabsReqContext(t *testing.T, method, body string) *contextmodel.ReqContext {
	t.Helper()

	req := httptest.NewRequest(method, "/api/labs/feature-toggles", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	return &contextmodel.ReqContext{
		Context:      &web.Context{Req: req, Resp: web.NewResponseWriter(method, httptest.NewRecorder())},
		SignedInUser: &user.SignedInUser{UserID: 1, OrgID: 1},
		IsSignedIn:   true,
	}
}

func decodeToggles(t *testing.T, resp response.Response) []labs.FeatureToggle {
	t.Helper()

	normal, ok := resp.(*response.NormalResponse)
	require.True(t, ok)

	var toggles []labs.FeatureToggle
	require.NoError(t, json.Unmarshal(normal.Body(), &toggles))
	return toggles
}
