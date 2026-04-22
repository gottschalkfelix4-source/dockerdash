import { apiFetch } from "./client";

export const getAlertRules = () => apiFetch("/alerts");
export const getAlertRule = (id: number) => apiFetch(`/alerts/${id}`);
export const createAlertRule = (data: any) => apiFetch("/alerts", { method: "POST", body: JSON.stringify(data) });
export const updateAlertRule = (id: number, data: any) => apiFetch(`/alerts/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteAlertRule = (id: number) => apiFetch(`/alerts/${id}`, { method: "DELETE" });
export const testAlert = (id: number) => apiFetch(`/alerts/${id}/test`, { method: "POST" });
