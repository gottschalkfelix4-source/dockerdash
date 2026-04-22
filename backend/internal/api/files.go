package api

import (
	"archive/tar"
	"bytes"
	"io"
	"net/http"
	"path/filepath"

	"github.com/dockerpanel/backend/internal/docker"
	"github.com/gin-gonic/gin"
)

func ListContainerFiles(c *gin.Context) {
	containerID := c.Param("cid")
	path := c.Query("path")
	if path == "" {
		path = "/"
	}

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	// Use stat path to check if exists
	stat, err := client.InspectContainer(containerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "container not found"})
		return
	}
	_ = stat

	// For listing we use exec ls -la
	execID, err := client.ExecCreate(containerID, []string{"ls", "-la", path})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp, err := client.ExecAttach(execID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Close()

	data, _ := io.ReadAll(resp.Reader)
	c.Header("Content-Type", "text/plain")
	c.String(http.StatusOK, string(data))
}

func DownloadContainerFile(c *gin.Context) {
	containerID := c.Param("cid")
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path required"})
		return
	}

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	reader, stat, err := client.CopyFromContainer(containerID, path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()

	filename := filepath.Base(path)
	if stat.Name != "" {
		filename = stat.Name
	}

	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	io.Copy(c.Writer, reader)
}

func UploadContainerFile(c *gin.Context) {
	containerID := c.Param("cid")
	path := c.Query("path")
	if path == "" {
		path = "/tmp"
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file uploaded"})
		return
	}
	defer file.Close()

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	// Create tar archive in memory
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	content, _ := io.ReadAll(file)
	tw.WriteHeader(&tar.Header{
		Name: filepath.Base(header.Filename),
		Mode: 0644,
		Size: int64(len(content)),
	})
	tw.Write(content)
	tw.Close()

	destPath := filepath.Join(path, filepath.Base(header.Filename))
	if err := client.CopyToContainer(containerID, path, &buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "file uploaded", "path": destPath})
}
