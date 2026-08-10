package navtreeimpl

import (
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/navtree"
)

func (s *ServiceImpl) buildLabsNavLink(c *contextmodel.ReqContext) *navtree.NavLink {
	if !c.IsSignedIn {
		return nil
	}

	return &navtree.NavLink{
		Text:       "Labs",
		SubTitle:   "Explore experimental features enabled in your Grafana instance",
		Id:         navtree.NavIDLabs,
		Icon:       "rocket",
		SortWeight: navtree.WeightLabs,
		Url:        s.cfg.AppSubURL + "/labs",
		IsNew:      true,
	}
}
