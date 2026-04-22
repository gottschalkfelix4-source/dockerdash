import { apiFetch } from "./client";

export const getContainerGroups = () => apiFetch("/groups");
export const getContainerGroup = (id: number) => apiFetch(`/groups/${id}`);
export const createContainerGroup = (data: any) => apiFetch("/groups", { method: "POST", body: JSON.stringify(data) });
export const updateContainerGroup = (id: number, data: any) => apiFetch(`/groups/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteContainerGroup = (id: number) => apiFetch(`/groups/${id}`, { method: "DELETE" });

export const getFavorites = () => apiFetch("/favorites");
export const toggleFavorite = (containerId: string) => apiFetch("/favorites/toggle", { method: "POST", body: JSON.stringify({ container_id: containerId }) });
export const updateContainerMeta = (data: any) => apiFetch("/containers/meta", { method: "POST", body: JSON.stringify(data) });
