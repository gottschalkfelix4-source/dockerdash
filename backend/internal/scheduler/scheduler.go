package scheduler

import (
	"fmt"
	"log"
	"time"

	"github.com/dockerpanel/backend/internal/db"
	"github.com/dockerpanel/backend/internal/models"
	"github.com/robfig/cron/v3"
)

var (
	c        *cron.Cron
	jobMap   map[uint]cron.EntryID
)

func Init() {
	jobMap = make(map[uint]cron.EntryID)
	c = cron.New(cron.WithSeconds())
	c.Start()

	// Load existing schedules from DB
	LoadSchedulesFromDB()

	log.Println("Scheduler initialized")
}

func Stop() {
	if c != nil {
		c.Stop()
	}
}

func LoadSchedulesFromDB() {
	var schedules []models.Schedule
	if err := db.DB.Where("is_enabled = ?", true).Find(&schedules).Error; err != nil {
		log.Printf("Failed to load schedules: %v", err)
		return
	}

	for _, s := range schedules {
		AddSchedule(&s)
	}
}

func AddSchedule(s *models.Schedule) {
	RemoveSchedule(s.ID)

	entryID, err := c.AddFunc(s.CronExpr, func() {
		executeJob(s)
	})
	if err != nil {
		log.Printf("Failed to schedule job %d: %v", s.ID, err)
		db.DB.Model(s).Update("last_status", "failed").Update("last_error", err.Error())
		return
	}

	jobMap[s.ID] = entryID
	log.Printf("Scheduled job %d (%s) with cron: %s", s.ID, s.Name, s.CronExpr)
}

func RemoveSchedule(id uint) {
	if entryID, ok := jobMap[id]; ok {
		c.Remove(entryID)
		delete(jobMap, id)
	}
}

func ReloadSchedule(id uint) {
	var s models.Schedule
	if err := db.DB.First(&s, id).Error; err != nil {
		return
	}
	if s.IsEnabled {
		AddSchedule(&s)
	} else {
		RemoveSchedule(id)
	}
}

func executeJob(s *models.Schedule) {
	log.Printf("Executing scheduled job: %s (type=%s)", s.Name, s.Type)
	now := time.Now()
	db.DB.Model(s).Updates(map[string]interface{}{
		"last_run": &now,
	})

	var err error
	switch s.Type {
	case "backup":
		err = runBackupJob(s)
	case "update":
		err = runUpdateJob(s)
	case "prune":
		err = runPruneJob(s)
	case "scan":
		err = runScanJob(s)
	default:
		err = fmt.Errorf("unknown job type: %s", s.Type)
	}

	status := "success"
	errMsg := ""
	if err != nil {
		status = "failed"
		errMsg = err.Error()
		log.Printf("Job %d failed: %v", s.ID, err)
	}

	db.DB.Model(s).Updates(map[string]interface{}{
		"last_status": status,
		"last_error":  errMsg,
	})
}
