package api

import (
	"errors"
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	ac "github.com/grafana/grafana/pkg/services/accesscontrol"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt/labs"
	"github.com/grafana/grafana/pkg/web"
)

// updateLabsFeatureTogglesCommand is the payload used to change feature toggles from the Labs section
type updateLabsFeatureTogglesCommand struct {
	Toggles []labsFeatureToggleUpdate `json:"toggles"`
}

type labsFeatureToggleUpdate struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

// GetLabsFeatureToggles returns every feature toggle registered in this instance together with
// its current value and where that value comes from.
func (hs *HTTPServer) GetLabsFeatureToggles(c *contextmodel.ReqContext) response.Response {
	return response.JSON(http.StatusOK, hs.labsService.State(hs.canWriteFeatureToggles(c)))
}

// UpdateLabsFeatureToggles changes the value of one or more feature toggles
func (hs *HTTPServer) UpdateLabsFeatureToggles(c *contextmodel.ReqContext) response.Response {
	cmd := updateLabsFeatureTogglesCommand{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	if len(cmd.Toggles) == 0 {
		return response.Error(http.StatusBadRequest, "no feature toggles provided", nil)
	}

	updates := make(map[string]bool, len(cmd.Toggles))
	for _, toggle := range cmd.Toggles {
		if toggle.Name == "" {
			return response.Error(http.StatusBadRequest, "feature toggle name is required", nil)
		}
		updates[toggle.Name] = toggle.Enabled
	}

	state, err := hs.labsService.SetToggles(c.Req.Context(), updates)
	if err != nil {
		if errors.Is(err, labs.ErrInvalidToggle) {
			return response.Error(http.StatusBadRequest, err.Error(), nil)
		}
		return response.Error(http.StatusInternalServerError, "failed to update feature toggles", err)
	}

	return response.JSON(http.StatusOK, state)
}

func (hs *HTTPServer) canWriteFeatureToggles(c *contextmodel.ReqContext) bool {
	canWrite, err := hs.AccessControl.Evaluate(c.Req.Context(), c.SignedInUser,
		ac.EvalPermission(ac.ActionFeatureManagementWrite))
	if err != nil {
		hs.log.Error("Failed to evaluate feature toggle write access", "error", err)
		return false
	}
	return canWrite
}
