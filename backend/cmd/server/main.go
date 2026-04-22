package main

import (
	"log"

	"github.com/dockerpanel/backend/internal/api"
	"github.com/dockerpanel/backend/internal/auth"
	"github.com/dockerpanel/backend/internal/bootstrap"
	"github.com/dockerpanel/backend/internal/config"
	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/scheduler"
)

func main() {
	cfg := config.Load()

	if err := db.Init(cfg.DatabaseURL); err != nil {
		log.Fatal("Failed to init database:", err)
	}
	if err := bootstrap.Seed(); err != nil {
		log.Fatal("Failed to seed database:", err)
	}

	auth.Init()
	scheduler.Init()
	defer scheduler.Stop()
	scheduler.StartMetricsCollector()
	defer scheduler.StopMetricsCollector()

	r := api.SetupRouter()

	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Println("Docker Panel server starting on port", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
