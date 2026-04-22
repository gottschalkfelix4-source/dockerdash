package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/docker"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func GetEnvironments(c *gin.Context) {
	var envs []models.Environment
	if err := db.DB.Find(&envs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, envs)
}

func CreateEnvironment(c *gin.Context) {
	var env models.Environment
	if err := c.ShouldBindJSON(&env); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if env.Type == "" {
		env.Type = "local"
	}
	if env.SocketPath == "" && env.Type == "local" {
		env.SocketPath = "/var/run/docker.sock"
	}

	env.Status = "unknown"

	if err := db.DB.Create(&env).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, env)
}

func GetEnvironment(c *gin.Context) {
	id := c.Param("id")
	var env models.Environment
	if err := db.DB.First(&env, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "environment not found"})
		return
	}
	c.JSON(http.StatusOK, env)
}

func UpdateEnvironment(c *gin.Context) {
	id := c.Param("id")
	var env models.Environment
	if err := db.DB.First(&env, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "environment not found"})
		return
	}

	var updates models.Environment
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates.ID = env.ID
	if err := db.DB.Save(&updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updates)
}

func DeleteEnvironment(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.Environment{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "environment deleted"})
}

func PingEnvironment(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var env models.Environment
	if err := db.DB.First(&env, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "environment not found"})
		return
	}

	var client *docker.DockerClient
	var err error
	if env.Type == "local" {
		client, err = docker.NewDockerClient()
	} else if env.Type == "remote-api" && env.APIURL != "" {
		client, err = docker.NewDockerClientWithHost(env.APIURL)
	} else {
		c.JSON(http.StatusOK, gin.H{"status": "unknown", "message": "cannot ping this environment type"})
		return
	}

	if err != nil {
		db.DB.Model(&env).Update("status", "offline")
		c.JSON(http.StatusOK, gin.H{"status": "offline", "error": err.Error()})
		return
	}
	defer client.Close()

	_, err = client.Ping()
	if err != nil {
		db.DB.Model(&env).Update("status", "offline")
		c.JSON(http.StatusOK, gin.H{"status": "offline", "error": err.Error()})
		return
	}

	now := time.Now()
	db.DB.Model(&env).Updates(models.Environment{Status: "online", LastSeen: &now})
	c.JSON(http.StatusOK, gin.H{"status": "online"})
}
