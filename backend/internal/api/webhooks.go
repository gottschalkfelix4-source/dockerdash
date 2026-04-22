package api

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func GetWebhooks(c *gin.Context) {
	var webhooks []models.Webhook
	if err := db.DB.Find(&webhooks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, webhooks)
}

func GetWebhook(c *gin.Context) {
	id := c.Param("id")
	var wh models.Webhook
	if err := db.DB.First(&wh, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, wh)
}

func CreateWebhook(c *gin.Context) {
	var wh models.Webhook
	if err := c.ShouldBindJSON(&wh); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.DB.Create(&wh).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, wh)
}

func UpdateWebhook(c *gin.Context) {
	id := c.Param("id")
	var wh models.Webhook
	if err := db.DB.First(&wh, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err := c.ShouldBindJSON(&wh); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	wh.ID = 0
	if err := db.DB.Model(&models.Webhook{}).Where("id = ?", id).Updates(wh).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func DeleteWebhook(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.Webhook{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func TestWebhook(c *gin.Context) {
	id := c.Param("id")
	var wh models.Webhook
	if err := db.DB.First(&wh, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	payload := map[string]interface{}{
		"event":     "webhook.test",
		"timestamp": time.Now().UTC(),
		"message":   "This is a test webhook from Docker Panel",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(wh.Method, wh.URL, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "DockerPanel/1.0")
	req.Header.Set("X-DockerPanel-Event", "webhook.test")

	if wh.Secret != "" {
		mac := hmac.New(sha256.New, []byte(wh.Secret))
		mac.Write(body)
		sig := hex.EncodeToString(mac.Sum(nil))
		req.Header.Set("X-Hub-Signature-256", "sha256="+sig)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	status := 0
	if resp != nil {
		status = resp.StatusCode
		resp.Body.Close()
	}

	now := time.Now()
	db.DB.Model(&wh).Updates(map[string]interface{}{
		"last_called": &now,
		"last_status": status,
	})

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"status": 0, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": status})
}

// HandleIncomingWebhook receives external triggers
func HandleIncomingWebhook(c *gin.Context) {
	token := c.Param("token")
	var wh models.Webhook
	if err := db.DB.Where("secret = ? AND type = ? AND is_enabled = ?", token, "incoming", true).First(&wh).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invalid webhook"})
		return
	}

	// Log the incoming request
	var payload map[string]interface{}
	c.ShouldBindJSON(&payload)

	now := time.Now()
	db.DB.Model(&wh).Update("last_called", &now)

	c.JSON(http.StatusOK, gin.H{"message": "received", "webhook": wh.Name})
}
