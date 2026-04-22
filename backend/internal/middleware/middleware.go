package middleware

import (
	"github.com/dockerpanel/backend/internal/auth"
	"github.com/gin-gonic/gin"
	"strings"
	"time"
)

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = "*"
		}
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func Logger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return param.TimeStamp.Format(time.RFC3339) + " " + param.Method + " " + param.Path + " " + param.ErrorMessage + "\n"
	})
}

func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := auth.GetUser(c)
		if user == nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		if strings.ToLower(user.Role) != strings.ToLower(role) && strings.ToLower(user.Role) != "admin" {
			c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Next()
	}
}
