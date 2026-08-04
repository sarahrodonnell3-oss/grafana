package api

import (
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/web"
)

// UpdateLabsFeatureTogglesCommand is the payload accepted by PATCH /api/labs/feature-toggles.
// Only the listed toggles are changed, every other toggle keeps its current value.
type UpdateLabsFeatureTogglesCommand struct {
	Toggles map[string]bool `json:"toggles"`
}

// GetLabsFeatureToggles returns every feature toggle known to this instance
// GET /api/labs/feature-toggles
func (hs *HTTPServer) GetLabsFeatureToggles(c *contextmodel.ReqContext) response.Response {
	return response.JSON(http.StatusOK, hs.labsService.GetFeatureToggles(c.Req.Context()))
}

// UpdateLabsFeatureToggles turns feature toggles on or off for this instance
// PATCH /api/labs/feature-toggles
func (hs *HTTPServer) UpdateLabsFeatureToggles(c *contextmodel.ReqContext) response.Response {
	cmd := UpdateLabsFeatureTogglesCommand{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	if len(cmd.Toggles) == 0 {
		return response.Error(http.StatusBadRequest, "no feature toggles were provided", nil)
	}

	if err := hs.labsService.SetFeatureToggles(c.Req.Context(), cmd.Toggles); err != nil {
		return response.Err(err)
	}

	// Changing a toggle changes what the whole instance does, so keep a trace of who did it
	hs.log.Info("Feature toggles updated from Labs", "userID", c.GetID(), "toggles", cmd.Toggles)

	return response.JSON(http.StatusOK, hs.labsService.GetFeatureToggles(c.Req.Context()))
}
