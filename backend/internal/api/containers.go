package api

import (
	"context"
	"io"
	"net/http"
	"strings"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/docker"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/dockerpanel/backend/internal/scheduler"
	"github.com/gin-gonic/gin"
)

func GetContainers(c *gin.Context) {
	all := c.Query("all") == "true"

	_ = c.Param("id")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	containers, err := client.ListContainers(all)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, containers)
}

func GetContainer(c *gin.Context) {
	id := c.Param("cid")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	info, err := client.InspectContainer(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "container not found"})
		return
	}

	c.JSON(http.StatusOK, info)
}

func StartContainer(c *gin.Context) {
	id := c.Param("cid")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	if err := client.StartContainer(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "container started"})
}

func StopContainer(c *gin.Context) {
	id := c.Param("cid")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	if err := client.StopContainer(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "container stopped"})
}

func RestartContainer(c *gin.Context) {
	id := c.Param("cid")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	if err := client.RestartContainer(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "container restarted"})
}

func KillContainer(c *gin.Context) {
	id := c.Param("cid")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	if err := client.KillContainer(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "container killed"})
}

func RemoveContainer(c *gin.Context) {
	id := c.Param("cid")
	force := c.Query("force") == "true"

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	if err := client.RemoveContainer(id, force); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "container removed"})
}

func GetContainerLogs(c *gin.Context) {
	id := c.Param("cid")
	tail := c.DefaultQuery("tail", "100")
	follow := c.Query("follow") == "true"

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	reader, err := client.ContainerLogs(id, tail, follow)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()

	c.Header("Content-Type", "text/plain")
	c.Header("Transfer-Encoding", "chunked")
	c.Stream(func(w io.Writer) bool {
		buf := make([]byte, 4096)
		n, err := reader.Read(buf)
		if n > 0 {
			w.Write(buf[:n])
		}
		return err == nil
	})
}

func GetContainerStats(c *gin.Context) {
	id := c.Param("cid")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	reader, err := client.ContainerStats(id, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()

	c.Header("Content-Type", "application/json")
	c.Stream(func(w io.Writer) bool {
		buf := make([]byte, 4096)
		n, err := reader.Read(buf)
		if n > 0 {
			w.Write(buf[:n])
		}
		return err == nil
	})
}

// ==================== CONTAINER UPDATE ====================

func UpdateContainer(c *gin.Context) {
	id := c.Param("cid")

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cli.Close()

	ctx := context.Background()

	// Inspect current container
	info, err := cli.ContainerInspect(ctx, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	imageName := info.Config.Image
	if imageName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container has no image"})
		return
	}

	// Pull latest image
	pullReader, err := cli.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	io.Copy(io.Discard, pullReader)
	pullReader.Close()

	// Store config
	name := strings.TrimPrefix(info.Name, "/")
	configJSON := info.Config
	hostConfig := info.HostConfig
	var networkingConfig *network.NetworkingConfig
	if info.NetworkSettings != nil && len(info.NetworkSettings.Networks) > 0 {
		networkingConfig = &network.NetworkingConfig{EndpointsConfig: info.NetworkSettings.Networks}
	}

	// Stop container
	timeout := 30
	cli.ContainerStop(ctx, id, container.StopOptions{Timeout: &timeout})

	// Remove old container
	cli.ContainerRemove(ctx, id, container.RemoveOptions{Force: true})

	// Create new container with same config
	newContainer, err := cli.ContainerCreate(ctx, configJSON, hostConfig, networkingConfig, nil, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Start new container
	if err := cli.ContainerStart(ctx, newContainer.ID, container.StartOptions{}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update meta in DB
	db.DB.Model(&models.ContainerMeta{}).Where("container_id = ?", id).
		Updates(map[string]interface{}{
			"container_id": newContainer.ID,
		})

	c.JSON(http.StatusOK, gin.H{
		"message":       "container updated",
		"old_id":        id,
		"new_id":        newContainer.ID,
		"image":         imageName,
	})
}

// ==================== CONTAINER BACKUP ====================

func BackupContainer(c *gin.Context) {
	id := c.Param("cid")

	var req struct {
		S3ConfigID *uint `json:"s3_config_id"`
	}
	c.ShouldBindJSON(&req)

	results, err := scheduler.RunContainerBackup(id, "", req.S3ConfigID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "backup completed",
		"backups": results,
	})
}

func GetImages(c *gin.Context) {
	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	images, err := client.ListImages()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	containers, err := client.ListContainers(true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Build image usage map: image ID -> container names
	imageUsage := make(map[string][]string)
	for _, ctr := range containers {
		name := ""
		if len(ctr.Names) > 0 {
			name = ctr.Names[0]
		} else {
			name = ctr.ID[:12]
		}
		if name != "" && name[0] == '/' {
			name = name[1:]
		}
		imageUsage[ctr.ImageID] = append(imageUsage[ctr.ImageID], name)
	}

	type imageWithUsage struct {
		ID          string   `json:"Id"`
		RepoTags    []string `json:"RepoTags"`
		Size        int64    `json:"Size"`
		Created     int64    `json:"Created"`
		UsedBy      []string `json:"used_by"`
	}

	result := make([]imageWithUsage, len(images))
	for i, img := range images {
		result[i] = imageWithUsage{
			ID:       img.ID,
			RepoTags: img.RepoTags,
			Size:     img.Size,
			Created:  img.Created,
			UsedBy:   imageUsage[img.ID],
		}
	}

	c.JSON(http.StatusOK, result)
}

func PullImage(c *gin.Context) {
	var req struct {
		Image string `json:"image" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	reader, err := client.PullImage(req.Image)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()

	c.Header("Content-Type", "application/json")
	c.Stream(func(w io.Writer) bool {
		buf := make([]byte, 4096)
		n, err := reader.Read(buf)
		if n > 0 {
			w.Write(buf[:n])
		}
		return err == nil
	})
}

func RemoveImage(c *gin.Context) {
	id := c.Param("iid")
	force := c.Query("force") == "true"

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	_, err = client.RemoveImage(id, force)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "image removed"})
}

func GetVolumes(c *gin.Context) {
	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	volumes, err := client.ListVolumes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	containers, err := client.ListContainers(true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Build volume usage map: volume name -> container names
	volumeUsage := make(map[string][]string)
	for _, ctr := range containers {
		name := ""
		if len(ctr.Names) > 0 {
			name = ctr.Names[0]
		} else {
			name = ctr.ID[:12]
		}
		if name != "" && name[0] == '/' {
			name = name[1:]
		}
		for _, mount := range ctr.Mounts {
			if mount.Type == "volume" && mount.Name != "" {
				volumeUsage[mount.Name] = append(volumeUsage[mount.Name], name)
			}
		}
	}

	type volumeWithUsage struct {
		Name       string            `json:"Name"`
		Driver     string            `json:"Driver"`
		Mountpoint string            `json:"Mountpoint"`
		Labels     map[string]string `json:"Labels"`
		UsedBy     []string          `json:"used_by"`
	}

	result := make([]volumeWithUsage, len(volumes.Volumes))
	for i, vol := range volumes.Volumes {
		result[i] = volumeWithUsage{
			Name:       vol.Name,
			Driver:     vol.Driver,
			Mountpoint: vol.Mountpoint,
			Labels:     vol.Labels,
			UsedBy:     volumeUsage[vol.Name],
		}
	}

	c.JSON(http.StatusOK, result)
}

func CreateVolume(c *gin.Context) {
	var req struct {
		Name   string            `json:"name" binding:"required"`
		Driver string            `json:"driver"`
		Labels map[string]string `json:"labels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	vol, err := client.CreateVolume(req.Name, req.Driver, req.Labels)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, vol)
}

func RemoveVolume(c *gin.Context) {
	name := c.Param("vid")
	force := c.Query("force") == "true"

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	if err := client.RemoveVolume(name, force); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "volume removed"})
}

func PruneImages(c *gin.Context) {
	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	report, err := client.PruneImages()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "unused images pruned",
		"images_deleted": len(report.ImagesDeleted),
		"space_reclaimed": report.SpaceReclaimed,
	})
}

func PruneVolumes(c *gin.Context) {
	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	report, err := client.PruneVolumes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "unused volumes pruned",
		"volumes_deleted": len(report.VolumesDeleted),
		"space_reclaimed": report.SpaceReclaimed,
	})
}

func GetNetworks(c *gin.Context) {
	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	networks, err := client.ListNetworks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, networks)
}

func CreateNetwork(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		Driver string `json:"driver"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	net, err := client.CreateNetwork(req.Name, req.Driver)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, net)
}

func RemoveNetwork(c *gin.Context) {
	id := c.Param("nid")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	if err := client.RemoveNetwork(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "network removed"})
}

func GetSystemInfo(c *gin.Context) {
	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	info, err := client.SystemInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	version, _ := client.SystemVersion()
	usage, _ := client.DiskUsage()

	c.JSON(http.StatusOK, gin.H{
		"info":    info,
		"version": version,
		"usage":   usage,
	})
}
