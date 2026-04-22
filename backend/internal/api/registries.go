package api

import (
	"net/http"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func GetRegistries(c *gin.Context) {
	var registries []models.Registry
	if err := db.DB.Find(&registries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, registries)
}

func CreateRegistry(c *gin.Context) {
	var registry models.Registry
	if err := c.ShouldBindJSON(&registry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.DB.Create(&registry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, registry)
}

func DeleteRegistry(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.Registry{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "registry deleted"})
}
