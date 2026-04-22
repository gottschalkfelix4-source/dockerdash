import { apiFetch } from "./client";

export const getScannerStatus = () => apiFetch("/scanner/status");
export const getScanResults = (params = "") => apiFetch(`/scanner/results?${params}`);
export const getScanResult = (id: number) => apiFetch(`/scanner/results/${id}`);
export const startImageScan = (data: any) => apiFetch("/scanner/scan", { method: "POST", body: JSON.stringify(data) });
export const deleteScanResult = (id: number) => apiFetch(`/scanner/results/${id}`, { method: "DELETE" });
