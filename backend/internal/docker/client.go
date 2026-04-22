package docker

import (
	"context"
	"io"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/system"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
)

type DockerClient struct {
	cli *client.Client
	ctx context.Context
}

func NewDockerClient() (*DockerClient, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return &DockerClient{cli: cli, ctx: context.Background()}, nil
}

func NewDockerClientWithHost(host string) (*DockerClient, error) {
	cli, err := client.NewClientWithOpts(client.WithHost(host), client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return &DockerClient{cli: cli, ctx: context.Background()}, nil
}

func (d *DockerClient) Close() error {
	return d.cli.Close()
}

func (d *DockerClient) Ping() (types.Ping, error) {
	return d.cli.Ping(d.ctx)
}

func (d *DockerClient) ListContainers(all bool) ([]types.Container, error) {
	return d.cli.ContainerList(d.ctx, container.ListOptions{All: all})
}

func (d *DockerClient) InspectContainer(id string) (types.ContainerJSON, error) {
	return d.cli.ContainerInspect(d.ctx, id)
}

func (d *DockerClient) StartContainer(id string) error {
	return d.cli.ContainerStart(d.ctx, id, container.StartOptions{})
}

func (d *DockerClient) StopContainer(id string) error {
	return d.cli.ContainerStop(d.ctx, id, container.StopOptions{})
}

func (d *DockerClient) RestartContainer(id string) error {
	return d.cli.ContainerRestart(d.ctx, id, container.StopOptions{})
}

func (d *DockerClient) KillContainer(id string) error {
	return d.cli.ContainerKill(d.ctx, id, "SIGKILL")
}

func (d *DockerClient) RemoveContainer(id string, force bool) error {
	return d.cli.ContainerRemove(d.ctx, id, container.RemoveOptions{Force: force})
}

func (d *DockerClient) ContainerLogs(id string, tail string, follow bool) (io.ReadCloser, error) {
	return d.cli.ContainerLogs(d.ctx, id, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Tail:       tail,
	})
}

func (d *DockerClient) ContainerStats(id string, stream bool) (io.ReadCloser, error) {
	stats, err := d.cli.ContainerStats(d.ctx, id, stream)
	if err != nil {
		return nil, err
	}
	return stats.Body, nil
}

func (d *DockerClient) ListImages() ([]image.Summary, error) {
	return d.cli.ImageList(d.ctx, image.ListOptions{})
}

func (d *DockerClient) PullImage(ref string) (io.ReadCloser, error) {
	return d.cli.ImagePull(d.ctx, ref, image.PullOptions{})
}

func (d *DockerClient) RemoveImage(id string, force bool) ([]image.DeleteResponse, error) {
	return d.cli.ImageRemove(d.ctx, id, image.RemoveOptions{Force: force})
}

func (d *DockerClient) PruneImages() (image.PruneReport, error) {
	// dangling=false deletes ALL unused images (including tagged ones), not just dangling
	return d.cli.ImagesPrune(d.ctx, filters.NewArgs(filters.Arg("dangling", "false")))
}

func (d *DockerClient) ListVolumes() (volume.ListResponse, error) {
	return d.cli.VolumeList(d.ctx, volume.ListOptions{})
}

func (d *DockerClient) CreateVolume(name string, driver string, labels map[string]string) (volume.Volume, error) {
	return d.cli.VolumeCreate(d.ctx, volume.CreateOptions{
		Name:   name,
		Driver: driver,
		Labels: labels,
	})
}

func (d *DockerClient) RemoveVolume(name string, force bool) error {
	return d.cli.VolumeRemove(d.ctx, name, force)
}

func (d *DockerClient) PruneVolumes() (volume.PruneReport, error) {
	return d.cli.VolumesPrune(d.ctx, filters.NewArgs())
}

func (d *DockerClient) ListNetworks() ([]network.Summary, error) {
	return d.cli.NetworkList(d.ctx, network.ListOptions{})
}

func (d *DockerClient) CreateNetwork(name string, driver string) (network.CreateResponse, error) {
	return d.cli.NetworkCreate(d.ctx, name, network.CreateOptions{Driver: driver})
}

func (d *DockerClient) RemoveNetwork(id string) error {
	return d.cli.NetworkRemove(d.ctx, id)
}

func (d *DockerClient) PruneNetworks() (network.PruneReport, error) {
	return d.cli.NetworksPrune(d.ctx, filters.NewArgs())
}

func (d *DockerClient) ExecCreate(id string, cmd []string) (string, error) {
	exec, err := d.cli.ContainerExecCreate(d.ctx, id, container.ExecOptions{
		Cmd:          cmd,
		AttachStdout: true,
		AttachStderr: true,
	})
	if err != nil {
		return "", err
	}
	return exec.ID, nil
}

func (d *DockerClient) ExecAttach(execID string) (types.HijackedResponse, error) {
	return d.cli.ContainerExecAttach(d.ctx, execID, container.ExecStartOptions{})
}

func (d *DockerClient) ExecResize(execID string, height, width uint) error {
	return d.cli.ContainerExecResize(d.ctx, execID, container.ResizeOptions{
		Height: height,
		Width:  width,
	})
}

func (d *DockerClient) Events() (<-chan events.Message, <-chan error) {
	return d.cli.Events(d.ctx, events.ListOptions{})
}

func (d *DockerClient) CopyFromContainer(containerID, srcPath string) (io.ReadCloser, container.PathStat, error) {
	return d.cli.CopyFromContainer(d.ctx, containerID, srcPath)
}

func (d *DockerClient) CopyToContainer(containerID, dstPath string, content io.Reader) error {
	return d.cli.CopyToContainer(d.ctx, containerID, dstPath, content, container.CopyToContainerOptions{})
}

func (d *DockerClient) SystemInfo() (system.Info, error) {
	return d.cli.Info(d.ctx)
}

func (d *DockerClient) SystemVersion() (types.Version, error) {
	return d.cli.ServerVersion(d.ctx)
}

func (d *DockerClient) DiskUsage() (types.DiskUsage, error) {
	return d.cli.DiskUsage(d.ctx, types.DiskUsageOptions{})
}
