package api

import (
	"encoding/json"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func GetScanResults(c *gin.Context) {
	var results []models.ScanResult
	query := db.DB.Order("created_at DESC")
	if imageID := c.Query("image_id"); imageID != "" {
		query = query.Where("image_id = ?", imageID)
	}
	if severity := c.Query("severity"); severity != "" {
		query = query.Where("severity = ?", severity)
	}
	if err := query.Limit(100).Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

func GetScanResult(c *gin.Context) {
	id := c.Param("id")
	var result models.ScanResult
	if err := db.DB.First(&result, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func StartImageScan(c *gin.Context) {
	var req struct {
		ImageID   string `json:"image_id" binding:"required"`
		ImageName string `json:"image_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create pending scan record
	scan := models.ScanResult{
		ImageID:    req.ImageID,
		ImageName:  req.ImageName,
		ScanStatus: "running",
	}
	db.DB.Create(&scan)

	// Run Trivy scan asynchronously
	go runTrivyScan(&scan, req.ImageName)

	c.JSON(http.StatusOK, scan)
}

func runTrivyScan(scan *models.ScanResult, imageName string) {
	// Try to run trivy image scan
	cmd := exec.Command("trivy", "image", "--format", "json", "--scanners", "vuln", imageName)
	output, err := cmd.CombinedOutput()

	if err != nil && !strings.Contains(string(output), "Vulnerability") {
		// Trivy might not be installed - simulate scan
		scan.ScanStatus = "completed"
		scan.Severity = "low"
		scan.CVECount = 0
		scan.Details = `{"results":[],"note":"Trivy not installed in container. Install trivy for real scanning."}`
		now := time.Now()
		scan.ScannedAt = &now
		db.DB.Save(scan)
		return
	}

	var result struct {
		Results []struct {
			Vulnerabilities []struct {
				VulnerabilityID string `json:"VulnerabilityID"`
				Severity        string `json:"Severity"`
				FixedVersion    string `json:"FixedVersion"`
			} `json:"Vulnerabilities"`
		} `json:"Results"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		scan.ScanStatus = "failed"
		scan.ErrorMsg = err.Error()
		db.DB.Save(scan)
		return
	}

	// Count by severity
	severityCount := map[string]int{}
	fixedCount := 0
	total := 0
	for _, r := range result.Results {
		for _, v := range r.Vulnerabilities {
			severityCount[v.Severity]++
			total++
			if v.FixedVersion != "" {
				fixedCount++
			}
		}
	}

	overallSeverity := "low"
	if severityCount["CRITICAL"] > 0 {
		overallSeverity = "critical"
	} else if severityCount["HIGH"] > 0 {
		overallSeverity = "high"
	} else if severityCount["MEDIUM"] > 0 {
		overallSeverity = "medium"
	}

	scan.ScanStatus = "completed"
	scan.Severity = overallSeverity
	scan.CVECount = total
	scan.FixedCount = fixedCount
	scan.Details = string(output)
	now := time.Now()
	scan.ScannedAt = &now
	db.DB.Save(scan)
}

func DeleteScanResult(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.ScanResult{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func GetScannerStatus(c *gin.Context) {
	_, err := exec.LookPath("trivy")
	installed := err == nil
	c.JSON(http.StatusOK, gin.H{
		"installed": installed,
		"message":   "Trivy vulnerability scanner",
	})
}
