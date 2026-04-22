package api

import (
	"net/http"
	"strconv"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/dockerpanel/backend/internal/storage"
	"github.com/gin-gonic/gin"
)

func GetS3Configs(c *gin.Context) {
	var configs []models.S3Config
	if err := db.DB.Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, configs)
}

func GetS3Config(c *gin.Context) {
	id := c.Param("id")
	var cfg models.S3Config
	if err := db.DB.First(&cfg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func CreateS3Config(c *gin.Context) {
	var cfg models.S3Config
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.DB.Create(&cfg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func UpdateS3Config(c *gin.Context) {
	id := c.Param("id")
	var cfg models.S3Config
	if err := db.DB.First(&cfg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cfg.ID = 0
	if err := db.DB.Model(&models.S3Config{}).Where("id = ?", id).Updates(cfg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func DeleteS3Config(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.S3Config{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func TestS3Config(c *gin.Context) {
	id := c.Param("id")
	var cfg models.S3Config
	if err := db.DB.First(&cfg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create client: " + err.Error()})
		return
	}

	// Try listing objects to verify connection
	_, err = storage.ListS3Objects(client, cfg.Bucket, cfg.Prefix)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "connection failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "connection successful"})
}

func GetDefaultS3Config(c *gin.Context) {
	var cfg models.S3Config
	if err := db.DB.Where("is_default = ?", true).First(&cfg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no default config"})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func SetDefaultS3Config(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	db.DB.Model(&models.S3Config{}).Update("is_default", false)
	db.DB.Model(&models.S3Config{}).Where("id = ?", id).Update("is_default", true)
	c.JSON(http.StatusOK, gin.H{"message": "set as default"})
}
