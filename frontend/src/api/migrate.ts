import { apiFetch } from "./client";

export const discoverPortainerStacks = (sourcePath: string) =>
  apiFetch("/migrate/discover", { method: "POST", body: JSON.stringify({ source_path: sourcePath }) });

export const importPortainerStacks = (sourcePath: string, stacks: any[]) =>
  apiFetch("/migrate/import", { method: "POST", body: JSON.stringify({ source_path: sourcePath, stacks }) });
