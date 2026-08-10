package navtreeimpl

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/services/accesscontrol/acimpl"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/navtree"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

func TestBuildLabsNavLink(t *testing.T) {
	service := ServiceImpl{
		cfg:           setting.NewCfg(),
		accessControl: acimpl.ProvideAccessControl(featuremgmt.WithFeatures()),
		features:      featuremgmt.WithFeatures(),
	}

	t.Run("Should return Labs nav link for signed in users", func(t *testing.T) {
		httpReq, _ := http.NewRequest(http.MethodGet, "", nil)
		reqCtx := &contextmodel.ReqContext{
			SignedInUser: &user.SignedInUser{
				OrgRole: org.RoleAdmin,
			},
			IsSignedIn: true,
			Context:    &web.Context{Req: httpReq},
		}

		link := service.buildLabsNavLink(reqCtx)

		require.NotNil(t, link)
		require.Equal(t, navtree.NavIDLabs, link.Id)
		require.Equal(t, "Labs", link.Text)
		require.True(t, link.IsNew)
		require.Equal(t, navtree.WeightLabs, link.SortWeight)
	})

	t.Run("Should not return Labs nav link for signed out users", func(t *testing.T) {
		httpReq, _ := http.NewRequest(http.MethodGet, "", nil)
		reqCtx := &contextmodel.ReqContext{
			SignedInUser: &user.SignedInUser{
				OrgRole: org.RoleViewer,
			},
			IsSignedIn: false,
			Context:    &web.Context{Req: httpReq},
		}

		link := service.buildLabsNavLink(reqCtx)

		require.Nil(t, link)
	})
}
