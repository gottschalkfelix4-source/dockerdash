import { apiFetch } from "./client";

export const getDockerContexts = () => apiFetch("/contexts");
export const getDockerContext = (id: number) => apiFetch(`/contexts/${id}`);
export const createDockerContext = (data: any) => apiFetch("/contexts", { method: "POST", body: JSON.stringify(data) });
export const updateDockerContext = (id: number, data: any) => apiFetch(`/contexts/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteDockerContext = (id: number) => apiFetch(`/contexts/${id}`, { method: "DELETE" });
export const activateDockerContext = (id: number) => apiFetch(`/contexts/${id}/activate`, { method: "POST" });
