package api

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func GetStacks(c *gin.Context) {
	var stacks []models.Stack
	if err := db.DB.Find(&stacks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stacks)
}

func GetStack(c *gin.Context) {
	id := c.Param("id")
	var stack models.Stack
	if err := db.DB.First(&stack, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stack not found"})
		return
	}
	c.JSON(http.StatusOK, stack)
}

func CreateStack(c *gin.Context) {
	var stack models.Stack
	if err := c.ShouldBindJSON(&stack); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Create(&stack).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, stack)
}

func UpdateStack(c *gin.Context) {
	id := c.Param("id")
	var stack models.Stack
	if err := db.DB.First(&stack, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stack not found"})
		return
	}

	var updates models.Stack
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates.ID = stack.ID
	if err := db.DB.Save(&updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updates)
}

func DeleteStack(c *gin.Context) {
	id := c.Param("id")
	var stack models.Stack
	if err := db.DB.First(&stack, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stack not found"})
		return
	}

	// Try to stop first if running
	stackDir := filepath.Join("data", "stacks", fmt.Sprintf("%d", stack.ID))
	_, _ = runCompose(stackDir, "down")

	if err := db.DB.Delete(&stack).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "stack deleted"})
}

func DeployStack(c *gin.Context) {
	id := c.Param("id")
	var stack models.Stack
	if err := db.DB.First(&stack, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stack not found"})
		return
	}

	stackDir := filepath.Join("data", "stacks", fmt.Sprintf("%d", stack.ID))
	os.MkdirAll(stackDir, 0755)

	// Write compose file
	composePath := filepath.Join(stackDir, "docker-compose.yml")
	if err := os.WriteFile(composePath, []byte(stack.ComposeYAML), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Write env file if provided
	if stack.EnvVars != "" {
		envPath := filepath.Join(stackDir, ".env")
		os.WriteFile(envPath, []byte(stack.EnvVars), 0644)
	}

	// Run docker compose up -d
	output, err := runCompose(stackDir, "up", "-d", "--build")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "output": output})
		return
	}

	db.DB.Model(&stack).Update("status", "running")
	c.JSON(http.StatusOK, gin.H{"message": "stack deployed", "output": output})
}

func StopStack(c *gin.Context) {
	id := c.Param("id")
	var stack models.Stack
	if err := db.DB.First(&stack, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stack not found"})
		return
	}

	stackDir := filepath.Join("data", "stacks", fmt.Sprintf("%d", stack.ID))
	output, err := runCompose(stackDir, "down")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "output": output})
		return
	}

	db.DB.Model(&stack).Update("status", "stopped")
	c.JSON(http.StatusOK, gin.H{"message": "stack stopped", "output": output})
}

func RestartStack(c *gin.Context) {
	id := c.Param("id")
	var stack models.Stack
	if err := db.DB.First(&stack, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stack not found"})
		return
	}

	stackDir := filepath.Join("data", "stacks", fmt.Sprintf("%d", stack.ID))
	output, err := runCompose(stackDir, "restart")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "output": output})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "stack restarted", "output": output})
}

func runCompose(dir string, args ...string) (string, error) {
	cmd := exec.Command("docker", append([]string{"compose"}, args...)...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	return string(out), err
}
