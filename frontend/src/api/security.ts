import { apiFetch } from "./client";

export const getAPIKeys = () => apiFetch("/apikeys");
export const createAPIKey = (data: any) => apiFetch("/apikeys", { method: "POST", body: JSON.stringify(data) });
export const revokeAPIKey = (id: number) => apiFetch(`/apikeys/${id}/revoke`, { method: "POST" });
export const deleteAPIKey = (id: number) => apiFetch(`/apikeys/${id}`, { method: "DELETE" });

export const getSessions = () => apiFetch("/sessions");
export const terminateSession = (id: number) => apiFetch(`/sessions/${id}`, { method: "DELETE" });
export const terminateAllSessions = () => apiFetch("/sessions", { method: "DELETE" });

export const getAuditLog = (params = "") => apiFetch(`/auditlog?${params}`);

export const getPreferences = () => apiFetch("/preferences");
export const updatePreferences = (data: any) => apiFetch("/preferences", { method: "PUT", body: JSON.stringify(data) });

export const getEnvRoles = () => apiFetch("/envroles");
export const createEnvRole = (data: any) => apiFetch("/envroles", { method: "POST", body: JSON.stringify(data) });
export const deleteEnvRole = (id: number) => apiFetch(`/envroles/${id}`, { method: "DELETE" });
