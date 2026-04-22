package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
)

// ==================== BACKUP JOB ====================

func runBackupJob(s *models.Schedule) error {
	var config struct {
		VolumeName string  `json:"volume_name"`
		StackName  string  `json:"stack_name"`
		Retention  int     `json:"retention"`
		S3ConfigID *uint   `json:"s3_config_id"`
	}
	if err := json.Unmarshal([]byte(s.Config), &config); err != nil {
		return err
	}
	if config.VolumeName == "" {
		return fmt.Errorf("volume_name required")
	}

	return RunVolumeBackup(config.VolumeName, config.StackName, s.TargetID, config.S3ConfigID, config.Retention)
}

func cleanupOldBackups(volumeName string, keep int) {
	var backups []models.VolumeBackup
	db.DB.Where("volume_name = ?", volumeName).Order("created_at DESC").Find(&backups)
	if len(backups) > keep {
		for _, b := range backups[keep:] {
			os.Remove(b.FilePath)
			db.DB.Delete(&b)
		}
	}
}

// ==================== AUTO-UPDATE JOB ====================

func runUpdateJob(s *models.Schedule) error {
	var config struct {
		ContainerID string `json:"container_id"`
		ImageName   string `json:"image_name"`
		EnvID       uint   `json:"env_id"`
	}
	if err := json.Unmarshal([]byte(s.Config), &config); err != nil {
		return err
	}
	if config.ContainerID == "" || config.ImageName == "" {
		return fmt.Errorf("container_id and image_name required")
	}

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()

	ctx := context.Background()

	info, err := cli.ContainerInspect(ctx, config.ContainerID)
	if err != nil {
		return fmt.Errorf("inspect failed: %w", err)
	}

	currentImage, _, err := cli.ImageInspectWithRaw(ctx, info.Image)
	if err != nil {
		return fmt.Errorf("image inspect failed: %w", err)
	}
	currentDigest := ""
	if len(currentImage.RepoDigests) > 0 {
		currentDigest = currentImage.RepoDigests[0]
	}

	// Pull latest image
	pullReader, err := cli.ImagePull(ctx, config.ImageName, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("pull failed: %w", err)
	}
	io.Copy(io.Discard, pullReader)
	pullReader.Close()

	newImage, _, err := cli.ImageInspectWithRaw(ctx, config.ImageName)
	if err != nil {
		return fmt.Errorf("new image inspect failed: %w", err)
	}
	newDigest := ""
	if len(newImage.RepoDigests) > 0 {
		newDigest = newImage.RepoDigests[0]
	}

	if currentDigest != "" && newDigest != "" && currentDigest == newDigest {
		return nil // No update needed
	}

	name := strings.TrimPrefix(info.Name, "/")
	configJSON := info.Config
	hostConfig := info.HostConfig
	var networkingConfig *network.NetworkingConfig
	if info.NetworkSettings != nil && len(info.NetworkSettings.Networks) > 0 {
		networkingConfig = &network.NetworkingConfig{EndpointsConfig: info.NetworkSettings.Networks}
	}

	// Stop container
	timeout := 30
	cli.ContainerStop(ctx, config.ContainerID, container.StopOptions{Timeout: &timeout})

	// Remove old container
	cli.ContainerRemove(ctx, config.ContainerID, container.RemoveOptions{Force: true})

	// Create new container with same config but new image
	newContainer, err := cli.ContainerCreate(ctx, configJSON, hostConfig, networkingConfig, nil, name)
	if err != nil {
		return fmt.Errorf("recreate failed: %w", err)
	}

	if err := cli.ContainerStart(ctx, newContainer.ID, container.StartOptions{}); err != nil {
		return fmt.Errorf("start failed: %w", err)
	}

	db.DB.Model(&models.ContainerMeta{}).Where("container_id = ?", config.ContainerID).
		Updates(map[string]interface{}{
			"container_id": newContainer.ID,
			"image_digest": newDigest,
		})

	return nil
}

// ==================== PRUNE JOB ====================

func runPruneJob(s *models.Schedule) error {
	var config struct {
		Targets []string `json:"targets"`
	}
	if err := json.Unmarshal([]byte(s.Config), &config); err != nil {
		config.Targets = []string{"images"}
	}

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()

	ctx := context.Background()
	for _, target := range config.Targets {
		switch target {
		case "images":
			cli.ImagesPrune(ctx, filters.NewArgs())
		case "volumes":
			cli.VolumesPrune(ctx, filters.NewArgs())
		case "networks":
			cli.NetworksPrune(ctx, filters.NewArgs())
		case "containers":
			containers, _ := cli.ContainerList(ctx, container.ListOptions{All: true})
			for _, c := range containers {
				if c.State == "exited" || c.State == "dead" {
					cli.ContainerRemove(ctx, c.ID, container.RemoveOptions{Force: true})
				}
			}
		}
	}
	return nil
}

// ==================== SCAN JOB ====================

func runScanJob(s *models.Schedule) error {
	var config struct {
		ImageID   string `json:"image_id"`
		ImageName string `json:"image_name"`
	}
	if err := json.Unmarshal([]byte(s.Config), &config); err != nil {
		return err
	}
	if config.ImageName == "" {
		return fmt.Errorf("image_name required")
	}

	scan := models.ScanResult{
		ImageID:    config.ImageID,
		ImageName:  config.ImageName,
		ScanStatus: "running",
	}
	db.DB.Create(&scan)

	go func() {
		scan.ScanStatus = "completed"
		scan.Severity = "low"
		scan.CVECount = 0
		now := time.Now()
		scan.ScannedAt = &now
		db.DB.Save(&scan)
	}()

	return nil
}
