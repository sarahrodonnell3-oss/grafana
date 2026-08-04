package api

import (
	"encoding/json"
	"net/http"
	"sort"

	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

// labsFeatureDTO describes a single feature toggle for the Labs page.
type labsFeatureDTO struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	Stage           string `json:"stage"`
	Enabled         bool   `json:"enabled"`
	RequiresRestart bool   `json:"requiresRestart"`
	RequiresDevMode bool   `json:"requiresDevMode"`
}

type labsFeaturesResponse struct {
	Features []labsFeatureDTO `json:"features"`
}

type labsUpdateResponse struct {
	Updated []string `json:"updated"`
	// RestartRequired lists flags that changed but require a restart to fully
	// take effect, so the runtime change may not be reflected everywhere.
	RestartRequired []string `json:"restartRequired,omitempty"`
}

// featureManager returns the concrete FeatureManager backing hs.Features. The
// read-only FeatureToggles interface does not expose flag definitions or
// runtime mutation, both of which the Labs API needs.
func (hs *HTTPServer) featureManager() (*featuremgmt.FeatureManager, bool) {
	mgr, ok := hs.Features.(*featuremgmt.FeatureManager)
	return mgr, ok
}

// GetLabsFeatures returns all feature toggles with their current state.
//
// GET /api/labs/features
func (hs *HTTPServer) GetLabsFeatures(c *contextmodel.ReqContext) response.Response {
	mgr, ok := hs.featureManager()
	if !ok {
		return response.Error(http.StatusNotImplemented, "Feature toggle management is not available", nil)
	}

	flags := mgr.GetFlags()
	enabled := mgr.GetEnabled(c.Req.Context())

	features := make([]labsFeatureDTO, 0, len(flags))
	for _, flag := range flags {
		features = append(features, labsFeatureDTO{
			Name:            flag.Name,
			Description:     flag.Description,
			Stage:           flag.Stage.String(),
			Enabled:         enabled[flag.Name],
			RequiresRestart: flag.RequiresRestart,
			RequiresDevMode: flag.RequiresDevMode,
		})
	}

	sort.Slice(features, func(i, j int) bool {
		return features[i].Name < features[j].Name
	})

	return response.JSON(http.StatusOK, labsFeaturesResponse{Features: features})
}

// UpdateLabsFeatures flips one or more feature toggles at runtime.
//
// PATCH /api/labs/features
func (hs *HTTPServer) UpdateLabsFeatures(c *contextmodel.ReqContext) response.Response {
	mgr, ok := hs.featureManager()
	if !ok {
		return response.Error(http.StatusNotImplemented, "Feature toggle management is not available", nil)
	}

	changes := map[string]bool{}
	if err := json.NewDecoder(c.Req.Body).Decode(&changes); err != nil {
		return response.Error(http.StatusBadRequest, "Invalid request body", err)
	}

	if len(changes) == 0 {
		return response.Error(http.StatusBadRequest, "No feature toggles provided", nil)
	}

	// Index flag definitions so we can report which changes require a restart.
	flagsByName := make(map[string]featuremgmt.FeatureFlag)
	for _, flag := range mgr.GetFlags() {
		flagsByName[flag.Name] = flag
	}

	updated := make([]string, 0, len(changes))
	restartRequired := []string{}
	for name, enabled := range changes {
		if err := mgr.SetEnabled(name, enabled); err != nil {
			return response.Error(http.StatusBadRequest, err.Error(), err)
		}
		updated = append(updated, name)
		if flag, ok := flagsByName[name]; ok && flag.RequiresRestart {
			restartRequired = append(restartRequired, name)
		}
	}

	sort.Strings(updated)
	sort.Strings(restartRequired)

	return response.JSON(http.StatusOK, labsUpdateResponse{
		Updated:         updated,
		RestartRequired: restartRequired,
	})
}
