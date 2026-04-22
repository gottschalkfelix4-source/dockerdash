import { apiFetch } from "./client";

export const getSchedules = (params = "") => apiFetch(`/schedules?${params}`);
export const getSchedule = (id: number) => apiFetch(`/schedules/${id}`);
export const createSchedule = (data: any) => apiFetch("/schedules", { method: "POST", body: JSON.stringify(data) });
export const updateSchedule = (id: number, data: any) => apiFetch(`/schedules/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteSchedule = (id: number) => apiFetch(`/schedules/${id}`, { method: "DELETE" });
export const toggleSchedule = (id: number) => apiFetch(`/schedules/${id}/toggle`, { method: "POST" });
export const runScheduleNow = (id: number) => apiFetch(`/schedules/${id}/run`, { method: "POST" });
