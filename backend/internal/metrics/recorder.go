package metrics

import (
	"time"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
)

// RecordMetric stores a metric data point in the database
func RecordMetric(envID uint, resourceType, resourceID, metricName string, value float64) {
	metric := models.MetricData{
		EnvID:        envID,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		MetricName:   metricName,
		Value:        value,
		RecordedAt:   time.Now(),
	}
	db.DB.Create(&metric)
}
