# 🐳 Docker Panel

> Multi-host Docker management Web UI — manage containers, images, volumes, networks, stacks, and more from a single dashboard.

[![Go](https://img.shields.io/badge/Backend-Go%201.26-blue?logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

<p align="center">
  <img src="https://via.placeholder.com/1200x600/1e293b/ffffff?text=Docker+Panel+Dashboard" alt="Dashboard Preview" width="90%">
</p>

---

## ✨ Features

### 🚀 Core Management
- **Containers** — Start, stop, restart, kill, remove, update (pull+recreate), backup volumes
- **Images** — List, pull, remove, prune unused, see which containers use each image
- **Volumes** — Create, remove, prune unused, see container mount mappings
- **Networks** — Create, inspect, remove
- **Stacks** — Deploy / stop / remove Docker Compose stacks, YAML + `.env` editor

### 📊 Monitoring & Metrics
- **Live Dashboard** — Container status pie chart, system info, top memory consumers
- **System Monitoring** — CPU, memory, disk, network RX/TX with time range selector (Live / 1H / 24H / 7D)
- **Container Stats** — Real-time CPU, memory, network charts per container with historical data
- **Metrics Persistence** — Automatic 60-second collector stores up to 7 days of history (SQLite)

### 🛡️ Security
- **JWT Authentication** — Login / register with bcrypt-hashed passwords
- **API Keys** — Create and revoke programmatic access keys
- **Session Management** — View and terminate active sessions
- **Audit Log** — Track all administrative actions
- **RBAC** — Environment-based user roles

### ⚙️ Power Tools
- **Image Scanner** — Vulnerability scanning integration (Trivy)
- **Alert Rules** — Threshold-based alerts with notification channels
- **Webhooks** — Incoming and outgoing webhook support
- **Container Groups** — Organize containers with custom groups
- **Favorites** — Pin important containers for quick access
- **Migration** — Import stacks from Portainer or filesystem paths

### 🔄 Automation
- **Scheduler / Cron Jobs** — Auto-backup, auto-update, system prune, scheduled image scans
- **S3 Backup Destinations** — Upload volume backups to S3-compatible storage (AWS, MinIO, Backblaze)
- **Container Backup** — One-click backup of all container mounts (volumes + bind mounts)

### 🌐 Multi-Host & Swarm
- **Docker Contexts** — Switch between multiple Docker hosts
- **Swarm Management** — Nodes, services, and stack orchestration

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Go 1.26, Gin, Docker SDK v27.5.1, GORM, SQLite (CGO-free) |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS, shadcn/ui, Recharts |
| **Auth** | JWT (24h), bcrypt |
| **Scheduler** | robfig/cron/v3 |
| **Storage** | SQLite + S3 (AWS SDK v2) |
| **Monitoring** | Prometheus metrics endpoint |

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / Mac / Linux)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone the repository

```bash
git clone https://github.com/gottschalkfelix4-source/dockerdash.git
cd dockerdash
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This will start:
- **Backend** on [http://localhost:8080](http://localhost:8080)
- **Frontend** on [http://localhost:8081](http://localhost:8081)

### 3. Login

Open [http://localhost:8081](http://localhost:8081) and use the default credentials:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin` |

> ⚠️ **Change the default password immediately after first login!**

---

## 🛠️ Development Setup

### Backend

```bash
cd backend

# Install Go dependencies
go mod download

# Build and run
go run ./cmd/server
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## 📁 Project Structure

```
dockerdash/
├── backend/
│   ├── cmd/server/          # Entry point
│   ├── internal/
│   │   ├── api/             # REST API handlers
│   │   ├── auth/            # JWT & bcrypt
│   │   ├── db/              # GORM & SQLite
│   │   ├── docker/          # Docker SDK client
│   │   ├── metrics/         # Metrics recorder
│   │   ├── models/          # Database models
│   │   ├── scheduler/       # Cron jobs & metrics collector
│   │   └── ws/              # WebSocket handlers (logs, terminal)
│   └── data/                # SQLite DB & stack storage
├── frontend/
│   ├── src/
│   │   ├── pages/           # Route pages
│   │   ├── components/      # Reusable components
│   │   ├── layouts/         # App layout
│   │   └── stores/          # Zustand state management
│   └── dist/                # Production build
└── docker-compose.yml
```

---

## 📸 Screenshots

| Dashboard | Containers | Container Detail |
|-----------|-----------|------------------|
| <img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=Dashboard" width="100%"> | <img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=Containers" width="100%"> | <img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=Container+Detail" width="100%"> |

| Monitoring | Images | Volumes |
|-----------|--------|---------|
| <img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=Monitoring" width="100%"> | <img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=Images" width="100%"> | <img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=Volumes" width="100%"> |

---

## 🔐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Backend server port |
| `DATABASE_URL` | `/app/data/dockerpanel.db` | SQLite database path |
| `JWT_SECRET` | `docker-panel-secret` | JWT signing secret |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

[MIT](LICENSE)

---

<p align="center">
  Built with ❤️ using Go + React + Docker
</p>
