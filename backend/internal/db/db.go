package db

import (
	"github.com/dockerpanel/backend/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"time"
	"log"
	"os"
)

var DB *gorm.DB

func Init(databasePath string) error {
	if databasePath == "" {
		databasePath = "data/dockerpanel.db"
	}

	dir := "data"
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		os.MkdirAll(dir, 0755)
	}

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Silent,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	var err error
	DB, err = gorm.Open(sqlite.Open(databasePath), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		return err
	}

	return DB.AutoMigrate(
		&models.User{},
		&models.Environment{},
		&models.ContainerMeta{},
		&models.Stack{},
		&models.VolumeBackup{},
		&models.ActivityLog{},
		&models.Registry{},
		&models.AppTemplate{},
		&models.NotificationChannel{},
		&models.Schedule{},
		// New models
		&models.APIKey{},
		&models.Session{},
		&models.UserPreference{},
		&models.UserEnvironmentRole{},
		&models.AlertRule{},
		&models.Webhook{},
		&models.ContainerGroup{},
		&models.ScanResult{},
		&models.MetricData{},
		&models.SwarmNode{},
		&models.SwarmService{},
		&models.DockerContext{},
		&models.GitOpsConfig{},
		&models.S3Config{},
	)
}
