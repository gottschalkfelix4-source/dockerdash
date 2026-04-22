package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// PortainerStackInfo holds discovered stack data
type PortainerStackInfo struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	Path       string `json:"path"`
	ComposeYAML string `json:"compose_yaml"`
	EnvVars    string `json:"env_vars"`
	HasEnvFile bool   `json:"has_env_file"`
}

func DiscoverPortainerStacks(c *gin.Context) {
	var req struct {
		SourcePath string `json:"source_path" binding:"required"` // e.g. "/data/compose" or a mounted volume path
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate path exists
	info, err := os.Stat(req.SourcePath)
	if err != nil || !info.IsDir() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "source path does not exist or is not a directory"})
		return
	}

	var stacks []PortainerStackInfo

	// Walk the directory looking for docker-compose.yml/yaml files
	filepath.Walk(req.SourcePath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		name := strings.ToLower(info.Name())
		if name != "docker-compose.yml" && name != "docker-compose.yaml" && name != "compose.yml" && name != "compose.yaml" {
			return nil
		}

		dir := filepath.Dir(path)
		yamlBytes, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		// Try to read .env file in same directory
		envPath := filepath.Join(dir, ".env")
		envBytes, _ := os.ReadFile(envPath)

		// Derive stack name from directory name
		stackName := filepath.Base(dir)
		// If directory is numeric (Portainer style), use parent name + id
		if isNumeric(stackName) {
			parent := filepath.Base(filepath.Dir(dir))
			if parent != "" && parent != "." {
				stackName = parent + "_" + stackName
			} else {
				stackName = "stack_" + stackName
			}
		}
		// Sanitize name
		stackName = strings.ReplaceAll(stackName, " ", "_")
		stackName = strings.ReplaceAll(stackName, "/", "_")

		stacks = append(stacks, PortainerStackInfo{
			Name:        stackName,
			Path:        dir,
			ComposeYAML: string(yamlBytes),
			EnvVars:     string(envBytes),
			HasEnvFile:  len(envBytes) > 0,
		})

		return nil
	})

	c.JSON(http.StatusOK, gin.H{
		"count":  len(stacks),
		"stacks": stacks,
	})
}

func ImportPortainerStacks(c *gin.Context) {
	var req struct {
		SourcePath string               `json:"source_path" binding:"required"`
		Stacks     []PortainerStackInfo `json:"stacks" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var imported []string
	var failed []string

	for _, s := range req.Stacks {
		// Check for duplicate names
		var existing models.Stack
		if err := db.DB.Where("name = ?", s.Name).First(&existing).Error; err == nil {
			// Append a number to make it unique
			s.Name = s.Name + "_imported"
		}

		stack := models.Stack{
			EnvID:       1,
			Name:        s.Name,
			ComposeYAML: s.ComposeYAML,
			EnvVars:     s.EnvVars,
			Status:      "stopped",
		}

		if err := db.DB.Create(&stack).Error; err != nil {
			failed = append(failed, fmt.Sprintf("%s: %v", s.Name, err))
			continue
		}

		// Save compose file to disk for deployment
		stackDir := filepath.Join("data/stacks", fmt.Sprintf("%d", stack.ID))
		os.MkdirAll(stackDir, 0755)
		os.WriteFile(filepath.Join(stackDir, "docker-compose.yml"), []byte(s.ComposeYAML), 0644)
		if s.EnvVars != "" {
			os.WriteFile(filepath.Join(stackDir, ".env"), []byte(s.EnvVars), 0644)
		}

		imported = append(imported, s.Name)
	}

	c.JSON(http.StatusOK, gin.H{
		"imported": imported,
		"failed":   failed,
		"count":    len(imported),
	})
}

func isNumeric(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return len(s) > 0
}
