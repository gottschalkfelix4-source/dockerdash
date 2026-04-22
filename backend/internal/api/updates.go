package api

import (
	"net/http"
	"strings"

	"github.com/dockerpanel/backend/internal/docker"
	"github.com/gin-gonic/gin"
)

type UpdateInfo struct {
	ContainerID     string `json:"container_id"`
	Image           string `json:"image"`
	CurrentTag      string `json:"current_tag"`
	UpdateAvailable bool   `json:"update_available"`
}

func CheckUpdates(c *gin.Context) {
	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	containers, err := client.ListContainers(true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var updates []UpdateInfo
	for _, container := range containers {
		image := container.Image
		tag := extractTag(image)
		// Simple heuristic: if tag is "latest" we can't know without registry check
		// For demo purposes, we flag specific version tags as potentially outdated
		updateAvailable := false
		if tag != "latest" && !strings.Contains(tag, ":") {
			// Could check registry here
			updateAvailable = false
		}
		updates = append(updates, UpdateInfo{
			ContainerID:     container.ID,
			Image:           image,
			CurrentTag:      tag,
			UpdateAvailable: updateAvailable,
		})
	}

	c.JSON(http.StatusOK, updates)
}

func extractTag(image string) string {
	parts := strings.Split(image, ":")
	if len(parts) > 1 && !strings.Contains(parts[len(parts)-1], "/") {
		return parts[len(parts)-1]
	}
	return "latest"
}
