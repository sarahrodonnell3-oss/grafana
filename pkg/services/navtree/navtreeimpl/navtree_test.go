package navtreeimpl

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	ac "github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/accesscontrol/acimpl"
	accesscontrolmock "github.com/grafana/grafana/pkg/services/accesscontrol/mock"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/navtree"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

func TestBuildDashboardNavLinks(t *testing.T) {
	newService := func() ServiceImpl {
		return ServiceImpl{
			cfg:           setting.NewCfg(),
			accessControl: acimpl.ProvideAccessControl(featuremgmt.WithFeatures()),
			features:      featuremgmt.WithFeatures(),
		}
	}

	hasPlaylistLink := func(navLinks []*navtree.NavLink) bool {
		for _, link := range navLinks {
			if link.Id == "dashboards/playlists" {
				return true
			}
		}
		return false
	}

	t.Run("Should show Playlists link for an anonymous Viewer", func(t *testing.T) {
		httpReq, _ := http.NewRequest(http.MethodGet, "", nil)
		reqCtx := &contextmodel.ReqContext{
			SignedInUser: &user.SignedInUser{
				IsAnonymous: true,
				OrgRole:     org.RoleViewer,
			},
			IsSignedIn: false,
			Context:    &web.Context{Req: httpReq},
		}

		service := newService()
		navLinks := service.buildDashboardNavLinks(reqCtx)

		require.True(t, hasPlaylistLink(navLinks), "expected anonymous Viewer to see the Playlists nav link")
	})

	t.Run("Should not show Playlists link for an unauthenticated user", func(t *testing.T) {
		httpReq, _ := http.NewRequest(http.MethodGet, "", nil)
		reqCtx := &contextmodel.ReqContext{
			SignedInUser: &user.SignedInUser{
				IsAnonymous: false,
				OrgRole:     org.RoleViewer,
			},
			IsSignedIn: false,
			Context:    &web.Context{Req: httpReq},
		}

		service := newService()
		navLinks := service.buildDashboardNavLinks(reqCtx)

		require.False(t, hasPlaylistLink(navLinks), "expected unauthenticated user to not see the Playlists nav link")
	})
}

func TestBuildLabsNavLink(t *testing.T) {
	httpReq, _ := http.NewRequest(http.MethodGet, "", nil)
	reqCtx := &contextmodel.ReqContext{SignedInUser: &user.SignedInUser{}, Context: &web.Context{Req: httpReq}}

	t.Run("Should show Labs for a user that can read feature toggles", func(t *testing.T) {
		service := ServiceImpl{
			cfg:           setting.NewCfg(),
			accessControl: accesscontrolmock.New().WithPermissions([]ac.Permission{{Action: ac.ActionFeatureManagementRead}}),
			features:      featuremgmt.WithFeatures(),
		}

		section := service.buildLabsNavLink(reqCtx)

		require.NotNil(t, section)
		require.Equal(t, navtree.NavIDLabs, section.Id)
		require.Equal(t, "/labs", section.Url)
		require.Equal(t, "flask", section.Icon)
		require.True(t, section.IsNew, "the Labs section is badged as new")
		require.Greater(t, section.SortWeight, int64(navtree.WeightDataConnections), "Labs sits after Connections")
		require.Less(t, section.SortWeight, int64(navtree.WeightConfig), "Labs sits before Administration")
	})

	t.Run("Should not show Labs for a user without permissions", func(t *testing.T) {
		service := ServiceImpl{
			cfg:           setting.NewCfg(),
			accessControl: accesscontrolmock.New().WithPermissions([]ac.Permission{}),
			features:      featuremgmt.WithFeatures(),
		}

		require.Nil(t, service.buildLabsNavLink(reqCtx))
	})
}
