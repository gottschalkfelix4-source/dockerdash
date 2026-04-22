package api

import (
	"github.com/dockerpanel/backend/internal/auth"
	"github.com/dockerpanel/backend/internal/middleware"
	"github.com/dockerpanel/backend/internal/ws"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())

	// Prometheus metrics (no auth for scraping)
	r.GET("/metrics", PrometheusHandler())

	// Incoming webhooks (no auth)
	r.POST("/webhooks/incoming/:token", HandleIncomingWebhook)

	api := r.Group("/api")
	{
		// Auth
		api.POST("/auth/login", Login)
		api.POST("/auth/register", Register)
		api.GET("/auth/me", auth.AuthMiddleware(), Me)

		// System
		api.GET("/system/info", auth.AuthMiddleware(), GetSystemInfo)

		// Stacks
		api.GET("/stacks", auth.AuthMiddleware(), GetStacks)
		api.POST("/stacks", auth.AuthMiddleware(), CreateStack)
		api.GET("/stacks/:id", auth.AuthMiddleware(), GetStack)
		api.PUT("/stacks/:id", auth.AuthMiddleware(), UpdateStack)
		api.DELETE("/stacks/:id", auth.AuthMiddleware(), DeleteStack)
		api.POST("/stacks/:id/deploy", auth.AuthMiddleware(), DeployStack)
		api.POST("/stacks/:id/stop", auth.AuthMiddleware(), StopStack)
		api.POST("/stacks/:id/restart", auth.AuthMiddleware(), RestartStack)

		// Updates
		api.GET("/updates/check", auth.AuthMiddleware(), CheckUpdates)

		// Backups
		api.GET("/backups", auth.AuthMiddleware(), GetBackups)
		api.POST("/backups", auth.AuthMiddleware(), CreateBackup)
		api.DELETE("/backups/:id", auth.AuthMiddleware(), DeleteBackup)
		api.GET("/backups/:id/download", auth.AuthMiddleware(), DownloadBackup)

		// Registries
		api.GET("/registries", auth.AuthMiddleware(), GetRegistries)
		api.POST("/registries", auth.AuthMiddleware(), CreateRegistry)
		api.DELETE("/registries/:id", auth.AuthMiddleware(), DeleteRegistry)

		// Security: API Keys
		api.GET("/apikeys", auth.AuthMiddleware(), GetAPIKeys)
		api.POST("/apikeys", auth.AuthMiddleware(), middleware.RequireRole("admin"), CreateAPIKey)
		api.POST("/apikeys/:id/revoke", auth.AuthMiddleware(), middleware.RequireRole("admin"), RevokeAPIKey)
		api.DELETE("/apikeys/:id", auth.AuthMiddleware(), middleware.RequireRole("admin"), DeleteAPIKey)

		// Security: Sessions
		api.GET("/sessions", auth.AuthMiddleware(), GetSessions)
		api.DELETE("/sessions/:id", auth.AuthMiddleware(), TerminateSession)
		api.DELETE("/sessions", auth.AuthMiddleware(), TerminateAllSessions)

		// Security: Audit Log
		api.GET("/auditlog", auth.AuthMiddleware(), GetAuditLog)

		// User Preferences
		api.GET("/preferences", auth.AuthMiddleware(), GetUserPreferences)
		api.PUT("/preferences", auth.AuthMiddleware(), UpdateUserPreferences)

		// RBAC: Environment Roles
		api.GET("/envroles", auth.AuthMiddleware(), middleware.RequireRole("admin"), GetUserEnvironmentRoles)
		api.POST("/envroles", auth.AuthMiddleware(), middleware.RequireRole("admin"), CreateUserEnvironmentRole)
		api.DELETE("/envroles/:id", auth.AuthMiddleware(), middleware.RequireRole("admin"), DeleteUserEnvironmentRole)

		// Alert Rules
		api.GET("/alerts", auth.AuthMiddleware(), GetAlertRules)
		api.GET("/alerts/:id", auth.AuthMiddleware(), GetAlertRule)
		api.POST("/alerts", auth.AuthMiddleware(), CreateAlertRule)
		api.PUT("/alerts/:id", auth.AuthMiddleware(), UpdateAlertRule)
		api.DELETE("/alerts/:id", auth.AuthMiddleware(), DeleteAlertRule)
		api.POST("/alerts/:id/test", auth.AuthMiddleware(), TriggerAlertTest)

		// Schedules
		api.GET("/schedules", auth.AuthMiddleware(), GetSchedules)
		api.GET("/schedules/:id", auth.AuthMiddleware(), GetSchedule)
		api.POST("/schedules", auth.AuthMiddleware(), CreateSchedule)
		api.PUT("/schedules/:id", auth.AuthMiddleware(), UpdateSchedule)
		api.DELETE("/schedules/:id", auth.AuthMiddleware(), DeleteSchedule)
		api.POST("/schedules/:id/toggle", auth.AuthMiddleware(), ToggleSchedule)
		api.POST("/schedules/:id/run", auth.AuthMiddleware(), RunScheduleNow)

		// Webhooks
		api.GET("/webhooks", auth.AuthMiddleware(), GetWebhooks)
		api.GET("/webhooks/:id", auth.AuthMiddleware(), GetWebhook)
		api.POST("/webhooks", auth.AuthMiddleware(), CreateWebhook)
		api.PUT("/webhooks/:id", auth.AuthMiddleware(), UpdateWebhook)
		api.DELETE("/webhooks/:id", auth.AuthMiddleware(), DeleteWebhook)
		api.POST("/webhooks/:id/test", auth.AuthMiddleware(), TestWebhook)

		// Scanner
		api.GET("/scanner/status", auth.AuthMiddleware(), GetScannerStatus)
		api.GET("/scanner/results", auth.AuthMiddleware(), GetScanResults)
		api.GET("/scanner/results/:id", auth.AuthMiddleware(), GetScanResult)
		api.POST("/scanner/scan", auth.AuthMiddleware(), StartImageScan)
		api.DELETE("/scanner/results/:id", auth.AuthMiddleware(), DeleteScanResult)

		// Metrics History
		api.GET("/metrics/history", auth.AuthMiddleware(), GetMetricsHistory)
		api.GET("/metrics/system", auth.AuthMiddleware(), GetSystemMetrics)
		api.GET("/metrics/containers/:cid", auth.AuthMiddleware(), GetContainerMetricsHistory)
		api.GET("/metrics/uptime/:id/:cid", auth.AuthMiddleware(), GetContainerUptime)
		api.POST("/metrics/prune", auth.AuthMiddleware(), middleware.RequireRole("admin"), PruneOldMetrics)

		// Swarm
		api.GET("/swarm/:id/nodes", auth.AuthMiddleware(), GetSwarmNodes)
		api.GET("/swarm/:id/services", auth.AuthMiddleware(), GetSwarmServices)
		api.GET("/swarm/:id/services/:sid", auth.AuthMiddleware(), GetSwarmService)
		api.POST("/swarm/:id/services/:sid/scale", auth.AuthMiddleware(), ScaleSwarmService)
		api.PUT("/swarm/:id/nodes/:nid", auth.AuthMiddleware(), UpdateSwarmNode)
		api.GET("/swarm/:id/status", auth.AuthMiddleware(), GetSwarmStatus)

		// Docker Contexts
		api.GET("/contexts", auth.AuthMiddleware(), GetDockerContexts)
		api.GET("/contexts/:id", auth.AuthMiddleware(), GetDockerContext)
		api.POST("/contexts", auth.AuthMiddleware(), CreateDockerContext)
		api.PUT("/contexts/:id", auth.AuthMiddleware(), UpdateDockerContext)
		api.DELETE("/contexts/:id", auth.AuthMiddleware(), DeleteDockerContext)
		api.POST("/contexts/:id/activate", auth.AuthMiddleware(), ActivateDockerContext)

		// Container Groups
		api.GET("/groups", auth.AuthMiddleware(), GetContainerGroups)
		api.GET("/groups/:id", auth.AuthMiddleware(), GetContainerGroup)
		api.POST("/groups", auth.AuthMiddleware(), CreateContainerGroup)
		api.PUT("/groups/:id", auth.AuthMiddleware(), UpdateContainerGroup)
		api.DELETE("/groups/:id", auth.AuthMiddleware(), DeleteContainerGroup)

		// Favorites
		api.GET("/favorites", auth.AuthMiddleware(), GetFavorites)
		api.POST("/favorites/toggle", auth.AuthMiddleware(), ToggleFavorite)

		// Container Meta
		api.POST("/containers/meta", auth.AuthMiddleware(), UpdateContainerMeta)

		// Migration
		api.POST("/migrate/discover", auth.AuthMiddleware(), DiscoverPortainerStacks)
		api.POST("/migrate/import", auth.AuthMiddleware(), ImportPortainerStacks)

		// S3 Backup Destinations
		api.GET("/s3configs", auth.AuthMiddleware(), GetS3Configs)
		api.GET("/s3configs/:id", auth.AuthMiddleware(), GetS3Config)
		api.POST("/s3configs", auth.AuthMiddleware(), CreateS3Config)
		api.PUT("/s3configs/:id", auth.AuthMiddleware(), UpdateS3Config)
		api.DELETE("/s3configs/:id", auth.AuthMiddleware(), DeleteS3Config)
		api.POST("/s3configs/:id/test", auth.AuthMiddleware(), TestS3Config)
		api.GET("/s3configs/default", auth.AuthMiddleware(), GetDefaultS3Config)
		api.POST("/s3configs/:id/default", auth.AuthMiddleware(), SetDefaultS3Config)

		// Environments
		env := api.Group("/environments", auth.AuthMiddleware())
		{
			env.GET("", GetEnvironments)
			env.POST("", CreateEnvironment)
			env.GET("/:id", GetEnvironment)
			env.PUT("/:id", UpdateEnvironment)
			env.DELETE("/:id", DeleteEnvironment)
			env.POST("/:id/ping", PingEnvironment)

			// Containers
			env.GET("/:id/containers", GetContainers)
			env.GET("/:id/containers/:cid", GetContainer)
			env.POST("/:id/containers/:cid/start", StartContainer)
			env.POST("/:id/containers/:cid/stop", StopContainer)
			env.POST("/:id/containers/:cid/restart", RestartContainer)
			env.POST("/:id/containers/:cid/kill", KillContainer)
			env.POST("/:id/containers/:cid/update", UpdateContainer)
			env.POST("/:id/containers/:cid/backup", BackupContainer)
			env.DELETE("/:id/containers/:cid", RemoveContainer)
			env.GET("/:id/containers/:cid/logs", GetContainerLogs)
			env.GET("/:id/containers/:cid/stats", GetContainerStats)
			env.GET("/:id/containers/:cid/files", ListContainerFiles)
			env.GET("/:id/containers/:cid/files/download", DownloadContainerFile)
			env.POST("/:id/containers/:cid/files/upload", UploadContainerFile)

			// Images
			env.GET("/:id/images", GetImages)
			env.POST("/:id/images/pull", PullImage)
			env.DELETE("/:id/images/:iid", RemoveImage)
			env.POST("/:id/images/prune", PruneImages)

			// Volumes
			env.GET("/:id/volumes", GetVolumes)
			env.POST("/:id/volumes", CreateVolume)
			env.DELETE("/:id/volumes/:vid", RemoveVolume)
			env.POST("/:id/volumes/prune", PruneVolumes)

			// Networks
			env.GET("/:id/networks", GetNetworks)
			env.POST("/:id/networks", CreateNetwork)
			env.DELETE("/:id/networks/:nid", RemoveNetwork)
		}
	}

	// WebSocket endpoints
	r.GET("/ws/logs/:envId/:cid", ws.HandleContainerLogs)
	r.GET("/ws/terminal/:envId/:cid", ws.HandleTerminal)

	return r
}
