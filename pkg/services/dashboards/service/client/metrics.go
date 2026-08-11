package client

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

type k8sClientMetrics struct {
	fallbackCounter                 *prometheus.CounterVec
	fallbackResultCounter           *prometheus.CounterVec
	preferredVersionFallbackCounter *prometheus.CounterVec
}

func newK8sClientMetrics(reg prometheus.Registerer) *k8sClientMetrics {
	return &k8sClientMetrics{
		fallbackCounter: promauto.With(reg).NewCounterVec(prometheus.CounterOpts{
			Namespace: "grafana",
			Name:      "dashboard_stored_version_fallback_total",
			Help:      "Number of K8s dashboard client requests to storedVersion",
		}, []string{"stored_version"}),
		fallbackResultCounter: promauto.With(reg).NewCounterVec(prometheus.CounterOpts{
			Namespace: "grafana",
			Name:      "dashboard_stored_version_fallback_result_total",
			Help:      "Results of K8s dashboard client requests to storedVersion",
		}, []string{"requested_version", "stored_version", "operation", "outcome"}),
		preferredVersionFallbackCounter: promauto.With(reg).NewCounterVec(prometheus.CounterOpts{
			Namespace: "grafana",
			Name:      "dashboard_preferred_version_fallback_total",
			Help:      "Results of K8s dashboard client fallbacks after a preferred API version request failed",
		}, []string{"preferred_version", "outcome"}),
	}
}
