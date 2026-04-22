package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/docker"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	containerCPU = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "dockerpanel_container_cpu_percent",
		Help: "CPU usage percentage per container",
	}, []string{"env_id", "container_id", "container_name"})

	containerMemory = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "dockerpanel_container_memory_percent",
		Help: "Memory usage percentage per container",
	}, []string{"env_id", "container_id", "container_name"})

	containerUptime = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "dockerpanel_container_uptime_seconds",
		Help: "Container uptime in seconds",
	}, []string{"env_id", "container_id", "container_name"})

	containersTotal = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "dockerpanel_containers_total",
		Help: "Total number of containers",
	}, []string{"env_id", "status"})
)

func init() {
	prometheus.MustRegister(containerCPU, containerMemory, containerUptime, containersTotal)
}

func PrometheusHandler() gin.HandlerFunc {
	h := promhttp.Handler()
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}

func GetMetricsHistory(c *gin.Context) {
	envID := c.Query("env_id")
	resourceID := c.Query("resource_id")
	metricName := c.Query("metric_name")
	hours := 24
	if h := c.Query("hours"); h != "" {
		if n, err := strconv.Atoi(h); err == nil {
			hours = n
		}
	}

	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)
	var metrics []models.MetricData
	query := db.DB.Where("recorded_at > ?", cutoff)
	if envID != "" {
		query = query.Where("env_id = ?", envID)
	}
	if resourceID != "" {
		query = query.Where("resource_id = ?", resourceID)
	}
	if metricName != "" {
		query = query.Where("metric_name = ?", metricName)
	}

	if err := query.Order("recorded_at ASC").Find(&metrics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

type aggregatedMetric struct {
	Time       string  `json:"recorded_at"`
	MetricName string  `json:"metric_name"`
	Value      float64 `json:"value"`
}

// getAggregationSQL returns the SQLite strftime format and cutoff for a range
func getAggregationParams(rangeParam string) (bucketFormat string, cutoff time.Time) {
	now := time.Now()
	switch rangeParam {
	case "1h":
		return "%Y-%m-%d %H:%M:00", now.Add(-1 * time.Hour)
	case "24h", "1d":
		return "%Y-%m-%d %H:%M:00", now.Add(-24 * time.Hour)
	case "7d":
		return "%Y-%m-%d %H:00:00", now.Add(-7 * 24 * time.Hour)
	default:
		return "%Y-%m-%d %H:%M:00", now.Add(-1 * time.Hour)
	}
}

func queryAggregatedMetrics(resourceType, resourceID string, cutoff time.Time, bucketFormat string) ([]aggregatedMetric, error) {
	var results []aggregatedMetric
	err := db.DB.Raw(`
		SELECT strftime(?, recorded_at) as time, metric_name, AVG(value) as value
		FROM metric_data
		WHERE resource_type = ? AND resource_id = ? AND recorded_at > ?
		GROUP BY time, metric_name
		ORDER BY time ASC
	`, bucketFormat, resourceType, resourceID, cutoff).Scan(&results).Error
	return results, err
}

func queryRawMetrics(resourceType, resourceID string, cutoff time.Time) ([]aggregatedMetric, error) {
	var results []aggregatedMetric
	err := db.DB.Raw(`
		SELECT strftime('%Y-%m-%d %H:%M:%S', recorded_at) as time, metric_name, value
		FROM metric_data
		WHERE resource_type = ? AND resource_id = ? AND recorded_at > ?
		ORDER BY recorded_at ASC
	`, resourceType, resourceID, cutoff).Scan(&results).Error
	return results, err
}

// GetSystemMetrics returns aggregated system metrics for a time range
func GetSystemMetrics(c *gin.Context) {
	rangeParam := c.DefaultQuery("range", "1h")
	bucketFormat, cutoff := getAggregationParams(rangeParam)

	var results []aggregatedMetric
	var err error

	if rangeParam == "1h" {
		// For 1h, use raw data (max ~60 points)
		results, err = queryRawMetrics("system", "host", cutoff)
	} else {
		// For longer ranges, aggregate by time buckets
		results, err = queryAggregatedMetrics("system", "host", cutoff, bucketFormat)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

// GetContainerMetricsHistory returns metrics for a specific container
func GetContainerMetricsHistory(c *gin.Context) {
	cid := c.Param("cid")
	rangeParam := c.DefaultQuery("range", "1h")
	bucketFormat, cutoff := getAggregationParams(rangeParam)

	var results []aggregatedMetric
	var err error

	if rangeParam == "1h" {
		results, err = queryRawMetrics("container", cid, cutoff)
	} else {
		results, err = queryAggregatedMetrics("container", cid, cutoff, bucketFormat)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

func GetContainerUptime(c *gin.Context) {
	envID := c.Param("id")
	cid := c.Param("cid")

	cli, err := getDockerClient(envID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cli.Close()

	info, err := cli.InspectContainer(cid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var uptime float64
	if started, err := time.Parse(time.RFC3339Nano, info.State.StartedAt); err == nil {
		uptime = time.Since(started).Seconds()
	}
	if info.State.Status != "running" {
		uptime = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"container_id":   cid,
		"status":         info.State.Status,
		"started_at":     info.State.StartedAt,
		"uptime_seconds": int64(uptime),
	})
}

func PruneOldMetrics(c *gin.Context) {
	days := 30
	if d := c.Query("days"); d != "" {
		if n, err := strconv.Atoi(d); err == nil {
			days = n
		}
	}
	cutoff := time.Now().Add(-time.Duration(days) * 24 * time.Hour)
	result := db.DB.Where("recorded_at < ?", cutoff).Delete(&models.MetricData{})
	c.JSON(http.StatusOK, gin.H{
		"deleted":         result.RowsAffected,
		"older_than_days": days,
	})
}

func getDockerClient(envID string) (*docker.DockerClient, error) {
	var env models.Environment
	if err := db.DB.First(&env, envID).Error; err != nil {
		return nil, err
	}
	if env.Type == "local" || env.Type == "" {
		return docker.NewDockerClient()
	}
	return docker.NewDockerClientWithHost(env.APIURL)
}
