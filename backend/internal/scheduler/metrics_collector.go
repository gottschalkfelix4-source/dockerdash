package scheduler

import (
	"encoding/json"
	"log"
	"time"

	"github.com/dockerpanel/backend/internal/docker"
	"github.com/dockerpanel/backend/internal/metrics"
)

var metricsTicker *time.Ticker
var metricsStop chan struct{}

// StartMetricsCollector begins collecting container and system metrics every 60s
func StartMetricsCollector() {
	metricsStop = make(chan struct{})
	metricsTicker = time.NewTicker(60 * time.Second)

	// Collect immediately on start
	go collectAllMetrics()

	go func() {
		for {
			select {
			case <-metricsTicker.C:
				collectAllMetrics()
			case <-metricsStop:
				return
			}
		}
	}()

	log.Println("Metrics collector started (60s interval)")
}

// StopMetricsCollector stops the metrics ticker
func StopMetricsCollector() {
	if metricsTicker != nil {
		metricsTicker.Stop()
		close(metricsStop)
	}
}

func collectAllMetrics() {
	client, err := docker.NewDockerClient()
	if err != nil {
		log.Printf("Metrics collector: failed to create docker client: %v", err)
		return
	}
	defer client.Close()

	containers, err := client.ListContainers(true)
	if err != nil {
		log.Printf("Metrics collector: failed to list containers: %v", err)
		return
	}

	var sysCPU, sysMemoryPercent, sysNetRx, sysNetTx, sysDisk float64
	var totalMemUsage, totalMemLimit uint64
	containerCount := 0

	for _, ctr := range containers {
		if ctr.State != "running" {
			continue
		}
		containerCount++

		reader, err := client.ContainerStats(ctr.ID, false)
		if err != nil {
			continue
		}

		var stats containerStatsJSON
		if err := json.NewDecoder(reader).Decode(&stats); err != nil {
			reader.Close()
			continue
		}
		reader.Close()

		// CPU %
		cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
		systemDelta := float64(stats.CPUStats.SystemCPUUsage - stats.PreCPUStats.SystemCPUUsage)
		onlineCPUs := float64(stats.CPUStats.OnlineCPUs)
		if onlineCPUs == 0 {
			onlineCPUs = float64(len(stats.CPUStats.CPUUsage.PercpuUsage))
		}
		if onlineCPUs == 0 {
			onlineCPUs = 1
		}
		cpuPercent := 0.0
		if systemDelta > 0 {
			cpuPercent = (cpuDelta / systemDelta) * onlineCPUs * 100
		}

		// Memory %
		memUsage := stats.MemoryStats.Usage
		memLimit := stats.MemoryStats.Limit
		memPercent := 0.0
		if memLimit > 0 {
			memPercent = (float64(memUsage) / float64(memLimit)) * 100
		}

		// Network
		var netRx, netTx uint64
		for _, net := range stats.Networks {
			netRx += net.RxBytes
			netTx += net.TxBytes
		}

		// Store container metrics
		metrics.RecordMetric(1, "container", ctr.ID, "cpu", cpuPercent)
		metrics.RecordMetric(1, "container", ctr.ID, "memory", memPercent)
		metrics.RecordMetric(1, "container", ctr.ID, "net_rx", float64(netRx)/1024)
		metrics.RecordMetric(1, "container", ctr.ID, "net_tx", float64(netTx)/1024)

		// Accumulate system totals
		sysCPU += cpuPercent
		sysMemoryPercent += memPercent
		totalMemUsage += memUsage
		totalMemLimit += memLimit
		sysNetRx += float64(netRx) / 1024
		sysNetTx += float64(netTx) / 1024
		sysDisk += float64(ctr.SizeRw) / 1024 / 1024
	}

	// Store system metrics
	if containerCount > 0 {
		avgMemPercent := sysMemoryPercent / float64(containerCount)
		if totalMemLimit > 0 {
			avgMemPercent = (float64(totalMemUsage) / float64(totalMemLimit)) * 100
		}
		metrics.RecordMetric(1, "system", "host", "cpu", sysCPU)
		metrics.RecordMetric(1, "system", "host", "memory", avgMemPercent)
		metrics.RecordMetric(1, "system", "host", "net_rx", sysNetRx)
		metrics.RecordMetric(1, "system", "host", "net_tx", sysNetTx)
		metrics.RecordMetric(1, "system", "host", "disk", sysDisk)
	}

	// Prune old metrics older than 7 days (run every ~10 min based on minute check)
	if time.Now().Minute()%10 == 0 {
		go pruneOldMetrics(7)
	}
}

func pruneOldMetrics(days int) {
	_ = time.Now().Add(-time.Duration(days) * 24 * time.Hour)
	// Pruning is handled via the admin API endpoint /metrics/prune
}

type containerStatsJSON struct {
	CPUStats struct {
		CPUUsage struct {
			TotalUsage  uint64   `json:"total_usage"`
			PercpuUsage []uint64 `json:"percpu_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs     uint64 `json:"online_cpus"`
	} `json:"cpu_stats"`
	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`
	MemoryStats struct {
		Usage uint64 `json:"usage"`
		Limit uint64 `json:"limit"`
	} `json:"memory_stats"`
	Networks map[string]struct {
		RxBytes uint64 `json:"rx_bytes"`
		TxBytes uint64 `json:"tx_bytes"`
	} `json:"networks"`
}
