package api

import (
	"net/http"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/dockerpanel/backend/internal/scheduler"
	"github.com/gin-gonic/gin"
)

func GetSchedules(c *gin.Context) {
	var schedules []models.Schedule
	query := db.DB.Order("created_at DESC")
	if jobType := c.Query("type"); jobType != "" {
		query = query.Where("type = ?", jobType)
	}
	if err := query.Find(&schedules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedules)
}

func GetSchedule(c *gin.Context) {
	id := c.Param("id")
	var s models.Schedule
	if err := db.DB.First(&s, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, s)
}

func CreateSchedule(c *gin.Context) {
	var s models.Schedule
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.DB.Create(&s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if s.IsEnabled {
		scheduler.AddSchedule(&s)
	}
	c.JSON(http.StatusOK, s)
}

func UpdateSchedule(c *gin.Context) {
	id := c.Param("id")
	var s models.Schedule
	if err := db.DB.First(&s, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	s.ID = 0
	if err := db.DB.Model(&models.Schedule{}).Where("id = ?", id).Updates(s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var updated models.Schedule
	db.DB.First(&updated, id)
	scheduler.ReloadSchedule(updated.ID)
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func DeleteSchedule(c *gin.Context) {
	id := c.Param("id")
	var s models.Schedule
	if err := db.DB.First(&s, id).Error; err == nil {
		scheduler.RemoveSchedule(s.ID)
	}
	if err := db.DB.Delete(&models.Schedule{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func ToggleSchedule(c *gin.Context) {
	id := c.Param("id")
	var s models.Schedule
	if err := db.DB.First(&s, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	s.IsEnabled = !s.IsEnabled
	db.DB.Save(&s)
	if s.IsEnabled {
		scheduler.AddSchedule(&s)
	} else {
		scheduler.RemoveSchedule(s.ID)
	}
	c.JSON(http.StatusOK, s)
}

func RunScheduleNow(c *gin.Context) {
	id := c.Param("id")
	var s models.Schedule
	if err := db.DB.First(&s, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	go scheduler.AddSchedule(&s)
	c.JSON(http.StatusOK, gin.H{"message": "schedule triggered"})
}
