import { apiFetch } from "./client";

export const getSwarmNodes = (envId: number) => apiFetch(`/swarm/${envId}/nodes`);
export const getSwarmServices = (envId: number) => apiFetch(`/swarm/${envId}/services`);
export const getSwarmService = (envId: number, sid: number) => apiFetch(`/swarm/${envId}/services/${sid}`);
export const scaleSwarmService = (envId: number, sid: number, replicas: number) =>
  apiFetch(`/swarm/${envId}/services/${sid}/scale`, { method: "POST", body: JSON.stringify({ replicas }) });
export const updateSwarmNode = (envId: number, nid: number, data: any) =>
  apiFetch(`/swarm/${envId}/nodes/${nid}`, { method: "PUT", body: JSON.stringify(data) });
export const getSwarmStatus = (envId: number) => apiFetch(`/swarm/${envId}/status`);
