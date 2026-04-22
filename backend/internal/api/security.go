package api

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dockerpanel/backend/internal/auth"
	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// ==================== API KEYS ====================

func GetAPIKeys(c *gin.Context) {
	var keys []models.APIKey
	if err := db.DB.Find(&keys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, keys)
}

func CreateAPIKey(c *gin.Context) {
	var req struct {
		Name    string `json:"name" binding:"required"`
		Role    string `json:"role"`
		Expires string `json:"expires"` // ISO date or empty for no expiry
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate key: dp_<random>
	raw := make([]byte, 32)
	rand.Read(raw)
	key := "dp_" + hex.EncodeToString(raw)
	prefix := key[:12]

	hash, err := bcrypt.GenerateFromPassword([]byte(key), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash key"})
		return
	}

	user := auth.GetUser(c)
	apiKey := models.APIKey{
		Name:      req.Name,
		KeyHash:   string(hash),
		KeyPrefix: prefix,
		UserID:    user.ID,
		Role:      req.Role,
	}
	if req.Expires != "" {
		t, _ := time.Parse(time.RFC3339, req.Expires)
		apiKey.ExpiresAt = &t
	}

	if err := db.DB.Create(&apiKey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the plain key ONCE
	c.JSON(http.StatusOK, gin.H{
		"key":     key,
		"api_key": apiKey,
	})
}

func RevokeAPIKey(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Model(&models.APIKey{}).Where("id = ?", id).Update("is_revoked", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "revoked"})
}

func DeleteAPIKey(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.APIKey{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// ==================== SESSIONS ====================

func GetSessions(c *gin.Context) {
	user := auth.GetUser(c)
	var sessions []models.Session
	if err := db.DB.Where("user_id = ?", user.ID).Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sessions)
}

func TerminateSession(c *gin.Context) {
	user := auth.GetUser(c)
	id := c.Param("id")
	if err := db.DB.Where("id = ? AND user_id = ?", id, user.ID).Delete(&models.Session{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "terminated"})
}

func TerminateAllSessions(c *gin.Context) {
	user := auth.GetUser(c)
	if err := db.DB.Where("user_id = ?", user.ID).Delete(&models.Session{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "all sessions terminated"})
}

// ==================== AUDIT LOG ====================

func GetAuditLog(c *gin.Context) {
	var logs []models.ActivityLog
	query := db.DB.Order("created_at DESC")

	if resourceType := c.Query("resource_type"); resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}
	if action := c.Query("action"); action != "" {
		query = query.Where("action = ?", action)
	}
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	limit := 100
	if l := c.Query("limit"); l != "" {
		// simple parse
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 1000 {
			limit = n
		}
	}

	if err := query.Limit(limit).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// LogAction helper
func LogAction(user *models.User, action, resourceType, resourceID, details string, c *gin.Context) {
	log := models.ActivityLog{
		UserID:       &user.ID,
		Username:     user.Username,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Details:      details,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}
	db.DB.Create(&log)
}

// ==================== USER PREFERENCES ====================

func GetUserPreferences(c *gin.Context) {
	user := auth.GetUser(c)
	var pref models.UserPreference
	if err := db.DB.Where("user_id = ?", user.ID).First(&pref).Error; err != nil {
		// Create default
		pref = models.UserPreference{UserID: user.ID}
		db.DB.Create(&pref)
	}
	c.JSON(http.StatusOK, pref)
}

func UpdateUserPreferences(c *gin.Context) {
	var req models.UserPreference
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user := auth.GetUser(c)
	req.UserID = user.ID
	req.ID = 0 // Let GORM handle

	var existing models.UserPreference
	if err := db.DB.Where("user_id = ?", user.ID).First(&existing).Error; err != nil {
		db.DB.Create(&req)
	} else {
		db.DB.Model(&existing).Updates(req)
	}
	c.JSON(http.StatusOK, req)
}

// ==================== RBAC: ENVIRONMENT ROLES ====================

func GetUserEnvironmentRoles(c *gin.Context) {
	var roles []models.UserEnvironmentRole
	if err := db.DB.Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, roles)
}

func CreateUserEnvironmentRole(c *gin.Context) {
	var req models.UserEnvironmentRole
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

func DeleteUserEnvironmentRole(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.UserEnvironmentRole{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// RequireEnvRole middleware
func RequireEnvRole(minRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := auth.GetUser(c)
		if user == nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		if strings.ToLower(user.Role) == "admin" {
			c.Next()
			return
		}
		envID := c.Param("id")
		if envID == "" {
			c.Next()
			return
		}
		var role models.UserEnvironmentRole
		if err := db.DB.Where("user_id = ? AND environment_id = ?", user.ID, envID).First(&role).Error; err != nil {
			c.AbortWithStatusJSON(403, gin.H{"error": "no access to this environment"})
			return
		}
		if !roleSufficient(role.Role, minRole) {
			c.AbortWithStatusJSON(403, gin.H{"error": "insufficient environment permissions"})
			return
		}
		c.Next()
	}
}

func roleSufficient(userRole, required string) bool {
	levels := map[string]int{"viewer": 1, "manager": 2, "admin": 3}
	return levels[userRole] >= levels[required]
}
