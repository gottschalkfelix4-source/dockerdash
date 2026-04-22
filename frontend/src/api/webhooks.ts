import { apiFetch } from "./client";

export const getWebhooks = () => apiFetch("/webhooks");
export const getWebhook = (id: number) => apiFetch(`/webhooks/${id}`);
export const createWebhook = (data: any) => apiFetch("/webhooks", { method: "POST", body: JSON.stringify(data) });
export const updateWebhook = (id: number, data: any) => apiFetch(`/webhooks/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteWebhook = (id: number) => apiFetch(`/webhooks/${id}`, { method: "DELETE" });
export const testWebhook = (id: number) => apiFetch(`/webhooks/${id}/test`, { method: "POST" });
