package models

import "time"

type User struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Username     string    `json:"username" gorm:"uniqueIndex;not null"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash string    `json:"-" gorm:"not null"`
	Role         string    `json:"role" gorm:"default:'admin'"`
	MFAEnabled   bool      `json:"mfa_enabled" gorm:"default:false"`
	MFASecret    string    `json:"-"`
	IPWhitelist  string    `json:"ip_whitelist"` // comma-separated
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Environment struct {
	ID              uint       `json:"id" gorm:"primaryKey"`
	Name            string     `json:"name" gorm:"not null"`
	Type            string     `json:"type" gorm:"not null"` // local, remote-agent, remote-api
	SocketPath      string     `json:"socket_path"`           // for local
	AgentToken      string     `json:"agent_token,omitempty"` // for remote-agent
	APIURL          string     `json:"api_url,omitempty"`     // for remote-api
	APITLSCert      []byte     `json:"-"`
	Labels          string     `json:"labels"` // JSON
	IsDefault       bool       `json:"is_default" gorm:"default:false"`
	CollectMetrics  bool       `json:"collect_metrics" gorm:"default:true"`
	CollectActivity bool       `json:"collect_activity" gorm:"default:true"`
	Timezone        string     `json:"timezone" gorm:"default:'UTC'"`
	Status          string     `json:"status" gorm:"default:'unknown'"` // online, offline, error
	LastSeen        *time.Time `json:"last_seen"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type ContainerMeta struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	EnvID        uint      `json:"env_id" gorm:"index"`
	ContainerID  string    `json:"container_id"`
	Name         string    `json:"name"`
	Image        string    `json:"image"`
	ImageDigest  string    `json:"image_digest"`
	Labels       string    `json:"labels"` // JSON
	AutoUpdate   bool      `json:"auto_update" gorm:"default:false"`
	UpdateMode   string    `json:"update_mode" gorm:"default:'disabled'"`   // respect_tag, minor, major, disabled
	UpdatePolicy string    `json:"update_policy" gorm:"default:'warn'"`     // always, warn, block
	GroupID      *uint     `json:"group_id" gorm:"index"`
	IsFavorite   bool      `json:"is_favorite" gorm:"default:false"`
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Stack struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	EnvID           uint      `json:"env_id" gorm:"index"`
	Name            string    `json:"name" gorm:"not null"`
	ComposeYAML     string    `json:"compose_yaml" gorm:"type:text"`
	EnvVars         string    `json:"env_vars" gorm:"type:text"`
	GitURL          string    `json:"git_url"`
	GitBranch       string    `json:"git_branch" gorm:"default:'main'"`
	GitWebhookToken string    `json:"git_webhook_token"`
	AutoSync        bool      `json:"auto_sync" gorm:"default:false"`
	Status          string    `json:"status" gorm:"default:'stopped'"` // running, stopped, error, deploying
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type VolumeBackup struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	EnvID       uint      `json:"env_id"`
	VolumeName  string    `json:"volume_name"`
	StackName   string    `json:"stack_name"`
	FilePath    string    `json:"file_path"`
	SizeBytes   int64     `json:"size_bytes"`
	StorageType string    `json:"storage_type" gorm:"default:'local'"` // local, s3, sftp
	CreatedAt   time.Time `json:"created_at"`
}

type ActivityLog struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       *uint     `json:"user_id"`
	Username     string    `json:"username"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resource_type"`
	ResourceID   string    `json:"resource_id"`
	Details      string    `json:"details"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
	CreatedAt    time.Time `json:"created_at"`
}

type Registry struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Username  string    `json:"username"`
	Password  string    `json:"-"` // encrypted
	IsDefault bool      `json:"is_default" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}

type AppTemplate struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	IconURL     string    `json:"icon_url"`
	ComposeYAML string    `json:"compose_yaml" gorm:"type:text"`
	Variables   string    `json:"variables"` // JSON schema
	SourceURL   string    `json:"source_url"`
	CreatedAt   time.Time `json:"created_at"`
}

type NotificationChannel struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // smtp, webhook, discord, slack, telegram
	Config    string    `json:"config"` // JSON
	IsEnabled bool      `json:"is_enabled" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
}

type Schedule struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Name        string     `json:"name"`
	Type        string     `json:"type"` // backup, update, scan, prune, webhook
	CronExpr    string     `json:"cron_expr"`
	TargetID    uint       `json:"target_id"`
	TargetType  string     `json:"target_type"` // container, stack, volume, image
	Config      string     `json:"config"`      // JSON
	IsEnabled   bool       `json:"is_enabled" gorm:"default:true"`
	LastRun     *time.Time `json:"last_run"`
	NextRun     *time.Time `json:"next_run"`
	LastStatus  string     `json:"last_status"` // success, failed, running
	LastError   string     `json:"last_error"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ==================== NEW MODELS ====================

// APIKey for external integrations / CI-CD
type APIKey struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	KeyHash   string    `json:"-" gorm:"not null"`
	KeyPrefix string    `json:"key_prefix"` // e.g. "dp_abc..."
	UserID    uint      `json:"user_id"`
	Role      string    `json:"role" gorm:"default:'viewer'"`
	ExpiresAt *time.Time `json:"expires_at"`
	LastUsed  *time.Time `json:"last_used"`
	IsRevoked bool      `json:"is_revoked" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}

// Session for active session management
type Session struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"index"`
	TokenHash string    `json:"-"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// UserPreference for per-user settings
type UserPreference struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	UserID          uint      `json:"user_id" gorm:"uniqueIndex"`
	DefaultEnvID    *uint     `json:"default_env_id"`
	AutoRefresh     bool      `json:"auto_refresh" gorm:"default:true"`
	RefreshInterval int       `json:"refresh_interval" gorm:"default:10"`
	ShowOnboarding  bool      `json:"show_onboarding" gorm:"default:true"`
	CompactMode     bool      `json:"compact_mode" gorm:"default:false"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// UserEnvironmentRole for fine-grained RBAC per environment
type UserEnvironmentRole struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	UserID        uint      `json:"user_id" gorm:"index"`
	EnvironmentID uint      `json:"environment_id" gorm:"index"`
	Role          string    `json:"role" gorm:"default:'viewer'"` // admin, manager, viewer
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// AlertRule for monitoring alerts
type AlertRule struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	Name            string    `json:"name"`
	Enabled         bool      `json:"enabled" gorm:"default:true"`
	ResourceType    string    `json:"resource_type"` // container, system, image
	ResourceID      string    `json:"resource_id"`   // container ID or empty for system
	Metric          string    `json:"metric"`        // cpu, memory, disk, network, health
	Condition       string    `json:"condition"`     // gt, lt, eq
	Threshold       float64   `json:"threshold"`
	Duration        int       `json:"duration"`      // seconds the condition must hold
	Cooldown        int       `json:"cooldown" gorm:"default:300"` // seconds between alerts
	Channels        string    `json:"channels"`      // JSON array of notification channel IDs
	LastTriggeredAt *time.Time `json:"last_triggered_at"`
	TriggerCount    int       `json:"trigger_count" gorm:"default:0"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Webhook for incoming/outgoing webhooks
type Webhook struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Type        string    `json:"type"` // incoming, outgoing
	URL         string    `json:"url"`
	Method      string    `json:"method" gorm:"default:'POST'"`
	Headers     string    `json:"headers"` // JSON
	Secret      string    `json:"-"`
	Events      string    `json:"events"` // JSON array: container.start, container.stop, etc.
	IsEnabled   bool      `json:"is_enabled" gorm:"default:true"`
	LastCalled  *time.Time `json:"last_called"`
	LastStatus  int       `json:"last_status"`
	CreatedAt   time.Time `json:"created_at"`
}

// ContainerGroup for grouping containers with tags
type ContainerGroup struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	Color     string    `json:"color" gorm:"default:'#3B82F6'"`
	Icon      string    `json:"icon"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ScanResult for image vulnerability scanning (Trivy)
type ScanResult struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	ImageID     string    `json:"image_id"`
	ImageName   string    `json:"image_name"`
	ScanType    string    `json:"scan_type" gorm:"default:'vulnerability'"`
	Severity    string    `json:"severity"` // critical, high, medium, low, unknown
	CVECount    int       `json:"cve_count"`
	Details     string    `json:"details" gorm:"type:text"` // JSON
	FixedCount  int       `json:"fixed_count"`
	ScanStatus  string    `json:"scan_status" gorm:"default:'pending'"` // pending, running, completed, failed
	ErrorMsg    string    `json:"error_msg"`
	ScannedAt   *time.Time `json:"scanned_at"`
	CreatedAt   time.Time `json:"created_at"`
}

// MetricData for historical metrics storage
type MetricData struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	EnvID        uint      `json:"env_id" gorm:"index:idx_metric_env_type_id_name_time,priority:1"`
	ResourceType string    `json:"resource_type" gorm:"index:idx_metric_env_type_id_name_time,priority:2"` // container, system
	ResourceID   string    `json:"resource_id" gorm:"index:idx_metric_env_type_id_name_time,priority:3"`
	MetricName   string    `json:"metric_name" gorm:"index:idx_metric_env_type_id_name_time,priority:4"` // cpu, memory, net_rx, net_tx, disk
	Value        float64   `json:"value"`
	RecordedAt   time.Time `json:"recorded_at" gorm:"index:idx_metric_env_type_id_name_time,priority:5;index:idx_metric_time"`
}

// SwarmNode for Docker Swarm node management
type SwarmNode struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	EnvID           uint      `json:"env_id" gorm:"index"`
	NodeID          string    `json:"node_id" gorm:"uniqueIndex"`
	Hostname        string    `json:"hostname"`
	Role            string    `json:"role"` // manager, worker
	Status          string    `json:"status"` // ready, down
	Availability    string    `json:"availability"` // active, pause, drain
	Addr            string    `json:"addr"`
	EngineVersion   string    `json:"engine_version"`
	Labels          string    `json:"labels"` // JSON
	CPUCores        int       `json:"cpu_cores"`
	MemoryBytes     int64     `json:"memory_bytes"`
	LastSeen        time.Time `json:"last_seen"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// SwarmService for Docker Swarm service management
type SwarmService struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	EnvID        uint      `json:"env_id" gorm:"index"`
	ServiceID    string    `json:"service_id" gorm:"uniqueIndex"`
	Name         string    `json:"name"`
	Image        string    `json:"image"`
	Replicas     uint64    `json:"replicas"`
	RunningTasks uint64    `json:"running_tasks"`
	Ports        string    `json:"ports"` // JSON
	Labels       string    `json:"labels"` // JSON
	Status       string    `json:"status"` // running, pending, failed
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// DockerContext for multi-host context switching
type DockerContext struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"uniqueIndex"`
	Description string    `json:"description"`
	Host        string    `json:"host"`
	TLSVerify   bool      `json:"tls_verify" gorm:"default:true"`
	TLSCaCert   string    `json:"tls_ca_cert"`
	TLSCert     string    `json:"tls_cert"`
	TLSKey      string    `json:"tls_key"`
	IsDefault   bool      `json:"is_default" gorm:"default:false"`
	IsActive    bool      `json:"is_active" gorm:"default:false"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// S3Config for backup destinations
type S3Config struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	Endpoint  string    `json:"endpoint"` // e.g. s3.amazonaws.com or minio.local:9000
	Region    string    `json:"region" gorm:"default:'us-east-1'"`
	Bucket    string    `json:"bucket"`
	AccessKey string    `json:"access_key"`
	SecretKey string    `json:"-"` // encrypted
	PathStyle bool      `json:"path_style" gorm:"default:false"` // for MinIO
	Prefix    string    `json:"prefix" gorm:"default:'backups/'"`
	IsDefault bool      `json:"is_default" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GitOpsConfig for GitOps stack sync
type GitOpsConfig struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	StackID     uint      `json:"stack_id" gorm:"index"`
	RepoURL     string    `json:"repo_url"`
	Branch      string    `json:"branch" gorm:"default:'main'"`
	FilePath    string    `json:"file_path" gorm:"default:'docker-compose.yml'"`
	AuthType    string    `json:"auth_type" gorm:"default:'none'"` // none, ssh, token
	AuthToken   string    `json:"-"`
	SSHKey      string    `json:"-"`
	AutoSync    bool      `json:"auto_sync" gorm:"default:false"`
	SyncInterval int      `json:"sync_interval" gorm:"default:300"` // seconds
	LastSync    *time.Time `json:"last_sync"`
	LastCommit  string     `json:"last_commit"`
	IsEnabled   bool       `json:"is_enabled" gorm:"default:true"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
