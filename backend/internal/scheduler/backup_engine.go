package scheduler

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/dockerpanel/backend/internal/storage"
)

// BackupTarget represents a single mount to backup
type BackupTarget struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Source   string `json:"source"`
	DestPath string `json:"dest_path"`
}

// BackupResult tracks what was backed up
type BackupResult struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	LocalFile string `json:"local_file"`
	S3Key     string `json:"s3_key,omitempty"`
	SizeBytes int64  `json:"size_bytes"`
	Storage   string `json:"storage"`
}

// getS3Client returns an S3 client for the given config ID
func getS3Client(configID uint) (*s3.Client, *models.S3Config, error) {
	var cfg models.S3Config
	if err := db.DB.First(&cfg, configID).Error; err != nil {
		return nil, nil, err
	}
	client, err := storage.NewS3Client(storage.S3Config{
		Endpoint:  cfg.Endpoint,
		Region:    cfg.Region,
		Bucket:    cfg.Bucket,
		AccessKey: cfg.AccessKey,
		SecretKey: cfg.SecretKey,
		PathStyle: cfg.PathStyle,
	})
	if err != nil {
		return nil, nil, err
	}
	return client, &cfg, nil
}

// uploadBackupToS3 uploads a file to S3 and returns the key
func uploadBackupToS3(s3Client *s3.Client, cfg *models.S3Config, localPath, filename string) (string, error) {
	key := cfg.Prefix + filename
	_, err := storage.UploadToS3(s3Client, cfg.Bucket, key, localPath)
	if err != nil {
		return "", err
	}
	return key, nil
}

// RunContainerBackup backs up all mounts of a container (volumes + bind mounts)
func RunContainerBackup(containerID, containerName string, s3ConfigID *uint) ([]BackupResult, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	defer cli.Close()

	ctx := context.Background()

	info, err := cli.ContainerInspect(ctx, containerID)
	if err != nil {
		return nil, fmt.Errorf("inspect failed: %w", err)
	}

	name := strings.TrimPrefix(info.Name, "/")
	if containerName != "" {
		name = containerName
	}

	var targets []BackupTarget
	for _, m := range info.Mounts {
		targets = append(targets, BackupTarget{
			Name:     m.Name,
			Type:     string(m.Type),
			Source:   m.Source,
			DestPath: m.Destination,
		})
	}

	if len(targets) == 0 {
		return nil, fmt.Errorf("no mounts found on container")
	}

	backupDir := "data/backups"
	os.MkdirAll(backupDir, 0755)

	timestamp := time.Now().Format("20060102_150405")

	// Get S3 client if configured
	var s3Client *s3.Client
	var s3Cfg *models.S3Config
	if s3ConfigID != nil {
		s3Client, s3Cfg, _ = getS3Client(*s3ConfigID)
	}

	var results []BackupResult

	for _, target := range targets {
		safeName := strings.ReplaceAll(name, "/", "_")
		safeTarget := strings.ReplaceAll(target.Name, "/", "_")
		if safeTarget == "" {
			safeTarget = strings.ReplaceAll(target.DestPath, "/", "_")
		}
		filename := fmt.Sprintf("%s_%s_%s.tar.gz", safeName, safeTarget, timestamp)
		outpath := filepath.Join(backupDir, filename)

		// Create backup based on mount type
		if target.Type == "volume" {
			err = backupVolume(ctx, cli, target.Source, backupDir, outpath)
		} else {
			err = backupBindMount(ctx, cli, target.Source, backupDir, outpath)
		}
		if err != nil {
			continue
		}

		var size int64
		if fi, err := os.Stat(outpath); err == nil {
			size = fi.Size()
		}

		result := BackupResult{
			Name:      target.Name,
			Type:      target.Type,
			LocalFile: outpath,
			SizeBytes: size,
			Storage:   "local",
		}

		// Upload to S3 if configured
		if s3Client != nil && s3Cfg != nil {
			s3Key, err := uploadBackupToS3(s3Client, s3Cfg, outpath, filename)
			if err == nil {
				result.S3Key = s3Key
				result.Storage = "s3"
				os.Remove(outpath)
				result.LocalFile = ""
			}
		}

		results = append(results, result)

		// Save to DB
		backup := models.VolumeBackup{
			EnvID:       1,
			VolumeName:  target.Name,
			StackName:   name,
			FilePath:    result.LocalFile,
			SizeBytes:   size,
			StorageType: result.Storage,
		}
		db.DB.Create(&backup)
	}

	return results, nil
}

// backupVolume creates a tar.gz of a Docker volume using a temp container
func backupVolume(ctx context.Context, cli *client.Client, volumeName, backupDir, outpath string) error {
	resp, err := cli.ContainerCreate(ctx,
		&container.Config{
			Image:   "alpine:latest",
			Cmd:     []string{"tar", "czf", "/backup/volume.tar.gz", "-C", "/data", "."},
			Volumes: map[string]struct{}{"/data": {}, "/backup": {}},
		},
		&container.HostConfig{
			Binds: []string{
				volumeName + ":/data",
				backupDir + ":/backup",
			},
			AutoRemove: true,
		}, nil, nil, "")
	if err != nil {
		return err
	}

	if err := cli.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return err
	}

	statusCh, errCh := cli.ContainerWait(ctx, resp.ID, container.WaitConditionNotRunning)
	select {
	case <-statusCh:
	case err := <-errCh:
		return err
	case <-time.After(5 * time.Minute):
		return fmt.Errorf("backup timeout")
	}

	src := filepath.Join(backupDir, "volume.tar.gz")
	if _, err := os.Stat(src); err == nil {
		os.Rename(src, outpath)
	}
	return nil
}

// backupBindMount creates a tar.gz of a host path using a temp container
func backupBindMount(ctx context.Context, cli *client.Client, hostPath, backupDir, outpath string) error {
	resp, err := cli.ContainerCreate(ctx,
		&container.Config{
			Image:   "alpine:latest",
			Cmd:     []string{"tar", "czf", "/backup/mount.tar.gz", "-C", "/data", "."},
			Volumes: map[string]struct{}{"/data": {}, "/backup": {}},
		},
		&container.HostConfig{
			Binds: []string{
				hostPath + ":/data",
				backupDir + ":/backup",
			},
			AutoRemove: true,
		}, nil, nil, "")
	if err != nil {
		return err
	}

	if err := cli.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return err
	}

	statusCh, errCh := cli.ContainerWait(ctx, resp.ID, container.WaitConditionNotRunning)
	select {
	case <-statusCh:
	case err := <-errCh:
		return err
	case <-time.After(5 * time.Minute):
		return fmt.Errorf("backup timeout")
	}

	src := filepath.Join(backupDir, "mount.tar.gz")
	if _, err := os.Stat(src); err == nil {
		os.Rename(src, outpath)
	}
	return nil
}

// RunVolumeBackup is the old-style backup for scheduled jobs (single volume)
func RunVolumeBackup(volumeName, stackName string, envID uint, s3ConfigID *uint, retention int) error {
	backupDir := "data/backups"
	os.MkdirAll(backupDir, 0755)

	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("%s_%s.tar.gz", volumeName, timestamp)
	outpath := filepath.Join(backupDir, filename)

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()

	if err := backupVolume(context.Background(), cli, volumeName, backupDir, outpath); err != nil {
		return err
	}

	var size int64
	if fi, err := os.Stat(outpath); err == nil {
		size = fi.Size()
	}

	storageType := "local"
	var s3Key string

	// Upload to S3 if configured
	if s3ConfigID != nil {
		s3Client, s3Cfg, err := getS3Client(*s3ConfigID)
		if err == nil && s3Client != nil {
			key, err := uploadBackupToS3(s3Client, s3Cfg, outpath, filename)
			if err == nil {
				storageType = "s3"
				s3Key = key
				os.Remove(outpath)
			}
		}
	}

	filePath := outpath
	if storageType == "s3" {
		filePath = s3Key
	}

	backup := models.VolumeBackup{
		EnvID:       envID,
		VolumeName:  volumeName,
		StackName:   stackName,
		FilePath:    filePath,
		SizeBytes:   size,
		StorageType: storageType,
	}
	db.DB.Create(&backup)

	if retention > 0 {
		cleanupOldBackups(volumeName, retention)
	}

	return nil
}
