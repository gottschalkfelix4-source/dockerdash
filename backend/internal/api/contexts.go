package api

import (
	"net/http"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func GetDockerContexts(c *gin.Context) {
	var contexts []models.DockerContext
	if err := db.DB.Find(&contexts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, contexts)
}

func GetDockerContext(c *gin.Context) {
	id := c.Param("id")
	var ctx models.DockerContext
	if err := db.DB.First(&ctx, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, ctx)
}

func CreateDockerContext(c *gin.Context) {
	var req models.DockerContext
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

func UpdateDockerContext(c *gin.Context) {
	id := c.Param("id")
	var ctx models.DockerContext
	if err := db.DB.First(&ctx, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err := c.ShouldBindJSON(&ctx); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.ID = 0
	if err := db.DB.Model(&models.DockerContext{}).Where("id = ?", id).Updates(ctx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func DeleteDockerContext(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.DockerContext{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func ActivateDockerContext(c *gin.Context) {
	id := c.Param("id")
	// Deactivate all others
	db.DB.Model(&models.DockerContext{}).Update("is_active", false)
	// Activate selected
	db.DB.Model(&models.DockerContext{}).Where("id = ?", id).Update("is_active", true)
	c.JSON(http.StatusOK, gin.H{"message": "activated"})
}
