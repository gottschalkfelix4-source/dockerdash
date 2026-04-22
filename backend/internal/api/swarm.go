package api

import (
	"net/http"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func GetSwarmNodes(c *gin.Context) {
	envID := c.Param("id")
	var nodes []models.SwarmNode
	if err := db.DB.Where("env_id = ?", envID).Find(&nodes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, nodes)
}

func GetSwarmServices(c *gin.Context) {
	envID := c.Param("id")
	var services []models.SwarmService
	if err := db.DB.Where("env_id = ?", envID).Find(&services).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, services)
}

func GetSwarmService(c *gin.Context) {
	id := c.Param("sid")
	var svc models.SwarmService
	if err := db.DB.First(&svc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, svc)
}

func ScaleSwarmService(c *gin.Context) {
	var req struct {
		Replicas uint64 `json:"replicas" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := c.Param("sid")
	var svc models.SwarmService
	if err := db.DB.First(&svc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	// Update replicas in DB (actual Docker API scaling would require Swarm client)
	db.DB.Model(&svc).Update("replicas", req.Replicas)
	c.JSON(http.StatusOK, gin.H{"message": "scaled", "replicas": req.Replicas})
}

func UpdateSwarmNode(c *gin.Context) {
	id := c.Param("nid")
	var req struct {
		Availability string `json:"availability"`
		Labels       string `json:"labels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var node models.SwarmNode
	if err := db.DB.First(&node, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	updates := map[string]interface{}{}
	if req.Availability != "" {
		updates["availability"] = req.Availability
	}
	if req.Labels != "" {
		updates["labels"] = req.Labels
	}
	db.DB.Model(&node).Updates(updates)
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func GetSwarmStatus(c *gin.Context) {
	envID := c.Param("id")
	cli, err := getDockerClient(envID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cli.Close()

	info, err := cli.SystemInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"swarm_enabled": info.Swarm.NodeID != "",
		"swarm_node_id": info.Swarm.NodeID,
		"swarm_local_node_state": info.Swarm.LocalNodeState,
		"swarm_control_available": info.Swarm.ControlAvailable,
		"swarm_error":             info.Swarm.Error,
	})
}
