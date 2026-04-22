package bootstrap

import (
	"github.com/dockerpanel/backend/internal/auth"
	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
)

func Seed() error {
	var userCount int64
	db.DB.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		hash, _ := auth.HashPassword("admin")
		admin := models.User{
			Username:     "admin",
			Email:        "admin@dockerpanel.local",
			PasswordHash: hash,
			Role:         "admin",
		}
		if err := db.DB.Create(&admin).Error; err != nil {
			return err
		}
	}

	var envCount int64
	db.DB.Model(&models.Environment{}).Count(&envCount)
	if envCount == 0 {
		local := models.Environment{
			Name:       "Local Docker",
			Type:       "local",
			SocketPath: "/var/run/docker.sock",
			IsDefault:  true,
			Status:     "unknown",
			Timezone:   "UTC",
		}
		if err := db.DB.Create(&local).Error; err != nil {
			return err
		}
	}

	return nil
}
