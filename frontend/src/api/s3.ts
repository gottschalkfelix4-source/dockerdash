import { apiFetch } from "./client";

export const getS3Configs = () => apiFetch("/s3configs");
export const getS3Config = (id: number) => apiFetch(`/s3configs/${id}`);
export const createS3Config = (data: any) => apiFetch("/s3configs", { method: "POST", body: JSON.stringify(data) });
export const updateS3Config = (id: number, data: any) => apiFetch(`/s3configs/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteS3Config = (id: number) => apiFetch(`/s3configs/${id}`, { method: "DELETE" });
export const testS3Config = (id: number) => apiFetch(`/s3configs/${id}/test`, { method: "POST" });
export const getDefaultS3Config = () => apiFetch("/s3configs/default");
export const setDefaultS3Config = (id: number) => apiFetch(`/s3configs/${id}/default`, { method: "POST" });
