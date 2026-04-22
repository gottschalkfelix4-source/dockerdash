package api

import (
	"net/http"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// ==================== CONTAINER GROUPS ====================

func GetContainerGroups(c *gin.Context) {
	var groups []models.ContainerGroup
	if err := db.DB.Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, groups)
}

func GetContainerGroup(c *gin.Context) {
	id := c.Param("id")
	var group models.ContainerGroup
	if err := db.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, group)
}

func CreateContainerGroup(c *gin.Context) {
	var req models.ContainerGroup
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

func UpdateContainerGroup(c *gin.Context) {
	id := c.Param("id")
	var group models.ContainerGroup
	if err := db.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err := c.ShouldBindJSON(&group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	group.ID = 0
	if err := db.DB.Model(&models.ContainerGroup{}).Where("id = ?", id).Updates(group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func DeleteContainerGroup(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.ContainerGroup{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Unlink containers from this group
	db.DB.Model(&models.ContainerMeta{}).Where("group_id = ?", id).Update("group_id", nil)
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// ==================== FAVORITES ====================

func GetFavorites(c *gin.Context) {
	var metas []models.ContainerMeta
	if err := db.DB.Where("is_favorite = ?", true).Find(&metas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metas)
}

func ToggleFavorite(c *gin.Context) {
	var req struct {
		ContainerID string `json:"container_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var meta models.ContainerMeta
	if err := db.DB.Where("container_id = ?", req.ContainerID).First(&meta).Error; err != nil {
		// Create if not exists
		meta = models.ContainerMeta{ContainerID: req.ContainerID, IsFavorite: true}
		db.DB.Create(&meta)
	} else {
		db.DB.Model(&meta).Update("is_favorite", !meta.IsFavorite)
		meta.IsFavorite = !meta.IsFavorite
	}
	c.JSON(http.StatusOK, meta)
}

// ==================== CONTAINER META ====================

func UpdateContainerMeta(c *gin.Context) {
	var req struct {
		ContainerID string  `json:"container_id" binding:"required"`
		GroupID     *uint   `json:"group_id"`
		Notes       string  `json:"notes"`
		AutoUpdate  *bool   `json:"auto_update"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var meta models.ContainerMeta
	if err := db.DB.Where("container_id = ?", req.ContainerID).First(&meta).Error; err != nil {
		meta = models.ContainerMeta{
			ContainerID: req.ContainerID,
			GroupID:     req.GroupID,
			Notes:       req.Notes,
		}
		if req.AutoUpdate != nil {
			meta.AutoUpdate = *req.AutoUpdate
		}
		db.DB.Create(&meta)
	} else {
		updates := map[string]interface{}{}
		if req.GroupID != nil {
			updates["group_id"] = *req.GroupID
		}
		if req.Notes != "" {
			updates["notes"] = req.Notes
		}
		if req.AutoUpdate != nil {
			updates["auto_update"] = *req.AutoUpdate
		}
		db.DB.Model(&meta).Updates(updates)
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}
