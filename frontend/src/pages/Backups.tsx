import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { getS3Configs, createS3Config, deleteS3Config, testS3Config, setDefaultS3Config } from "../api/s3";
import { useToastStore } from "../stores/toastStore";
import { Plus, Trash2, Download, Cloud, HardDrive, Server, Check, RotateCw, Database } from "lucide-react";

interface BackupItem {
  id: number;
  volume_name: string;
  stack_name: string;
  file_path: string;
  size_bytes: number;
  storage_type: string;
  created_at: string;
}

interface S3ConfigItem {
  id: number;
  name: string;
  endpoint: string;
  region: string;
  bucket: string;
  access_key: string;
  path_style: boolean;
  prefix: string;
  is_default: boolean;
}

export default function Backups() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [s3configs, setS3Configs] = useState<S3ConfigItem[]>([]);
  const [tab, setTab] = useState<"backups" | "destinations">("backups");
  const [showNew, setShowNew] = useState(false);
  const [showS3Form, setShowS3Form] = useState(false);
  const [volumeName, setVolumeName] = useState("");
  const [s3ConfigId, setS3ConfigId] = useState<number | undefined>(undefined);
  const addToast = useToastStore((s) => s.addToast);

  const [s3Form, setS3Form] = useState({
    name: "",
    endpoint: "",
    region: "us-east-1",
    bucket: "",
    access_key: "",
    secret_key: "",
    path_style: false,
    prefix: "backups/",
  });

  const fetchBackups = async () => {
    try {
      const data = await apiFetch("/backups");
      setBackups(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchS3Configs = async () => {
    try {
      setS3Configs(await getS3Configs());
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchS3Configs();
  }, []);

  const createBackup = async () => {
    try {
      const body: any = { volume_name: volumeName };
      if (s3ConfigId) body.s3_config_id = s3ConfigId;
      await apiFetch("/backups", {
        method: "POST",
        body: JSON.stringify(body),
      });
      addToast("Backup created", "success");
      setShowNew(false);
      setVolumeName("");
      setS3ConfigId(undefined);
      fetchBackups();
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const deleteBackup = async (id: number) => {
    if (!confirm("Delete this backup?")) return;
    try {
      await apiFetch(`/backups/${id}`, { method: "DELETE" });
      fetchBackups();
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const saveS3Config = async () => {
    try {
      await createS3Config(s3Form);
      addToast("S3 destination saved", "success");
      setShowS3Form(false);
      setS3Form({ name: "", endpoint: "", region: "us-east-1", bucket: "", access_key: "", secret_key: "", path_style: false, prefix: "backups/" });
      fetchS3Configs();
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const removeS3Config = async (id: number) => {
    if (!confirm("Delete this S3 destination?")) return;
    try {
      await deleteS3Config(id);
      fetchS3Configs();
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const testS3 = async (id: number) => {
    try {
      await testS3Config(id);
      addToast("S3 connection successful", "success");
    } catch (e: any) {
      addToast("S3 connection failed: " + e.message, "error");
    }
  };

  const makeDefault = async (id: number) => {
    try {
      await setDefaultS3Config(id);
      fetchS3Configs();
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Backups</h2>
          <p className="text-sm text-gray-500">Manage volume and mount point backups</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("backups")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "backups" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"}`}>
            <Database className="w-4 h-4" /> Backups
          </button>
          <button onClick={() => setTab("destinations")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "destinations" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"}`}>
            <Cloud className="w-4 h-4" /> Destinations
          </button>
        </div>
      </div>

      {tab === "backups" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> New Backup
            </button>
          </div>

          {showNew && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
              <h3 className="font-semibold">Create Backup</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Volume Name</label>
                  <input type="text" value={volumeName} onChange={(e) => setVolumeName(e.target.value)} placeholder="e.g. myapp_data" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Destination</label>
                  <select value={s3ConfigId || ""} onChange={(e) => setS3ConfigId(e.target.value ? Number(e.target.value) : undefined)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm">
                    <option value="">Local Storage</option>
                    {s3configs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} (S3)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createBackup} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Backup</button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3.5">Volume / Mount</th>
                  <th className="px-4 py-3.5">Stack</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5">Storage</th>
                  <th className="px-4 py-3.5">Created</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{b.volume_name}</td>
                    <td className="px-4 py-3 text-gray-500">{b.stack_name || "—"}</td>
                    <td className="px-4 py-3">{formatSize(b.size_bytes)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${b.storage_type === "s3" ? "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400" : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"}`}>
                        {b.storage_type === "s3" ? <Cloud className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
                        {b.storage_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {b.file_path && (
                          <a href={`http://localhost:8080/api/backups/${b.id}/download`} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md" title="Download">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => deleteBackup(b.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {backups.length === 0 && <div className="p-8 text-center text-gray-500">No backups yet</div>}
          </div>
        </>
      )}

      {tab === "destinations" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setShowS3Form(!showS3Form)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add S3 Destination
            </button>
          </div>

          {showS3Form && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
              <h3 className="font-semibold">Add S3 Backup Destination</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input value={s3Form.name} onChange={(e) => setS3Form({ ...s3Form, name: e.target.value })} placeholder="My S3" className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Endpoint (leave empty for AWS)</label>
                  <input value={s3Form.endpoint} onChange={(e) => setS3Form({ ...s3Form, endpoint: e.target.value })} placeholder="https://s3.amazonaws.com" className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Region</label>
                  <input value={s3Form.region} onChange={(e) => setS3Form({ ...s3Form, region: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bucket</label>
                  <input value={s3Form.bucket} onChange={(e) => setS3Form({ ...s3Form, bucket: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Access Key</label>
                  <input value={s3Form.access_key} onChange={(e) => setS3Form({ ...s3Form, access_key: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Secret Key</label>
                  <input type="password" value={s3Form.secret_key} onChange={(e) => setS3Form({ ...s3Form, secret_key: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prefix</label>
                  <input value={s3Form.prefix} onChange={(e) => setS3Form({ ...s3Form, prefix: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="pathstyle" checked={s3Form.path_style} onChange={(e) => setS3Form({ ...s3Form, path_style: e.target.checked })} className="rounded" />
                  <label htmlFor="pathstyle" className="text-sm">Path-style (MinIO / self-hosted)</label>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveS3Config} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Save</button>
                <button onClick={() => setShowS3Form(false)} className="px-4 py-2 border rounded-xl text-sm dark:border-gray-700">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {s3configs.map((cfg) => (
              <div key={cfg.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {cfg.name}
                      {cfg.is_default && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Default</span>}
                    </div>
                    <div className="text-xs text-gray-500">{cfg.endpoint} · {cfg.bucket} · {cfg.region}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => testS3(cfg.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Test">
                    <RotateCw className="w-4 h-4 text-blue-600" />
                  </button>
                  {!cfg.is_default && (
                    <button onClick={() => makeDefault(cfg.id)} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Set default">
                      <Check className="w-4 h-4 text-green-600" />
                    </button>
                  )}
                  <button onClick={() => removeS3Config(cfg.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
            {s3configs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Server className="w-10 h-10 mx-auto mb-2" />
                <p>No S3 destinations configured</p>
                <p className="text-xs mt-1">Works with AWS S3, MinIO, Wasabi, Backblaze B2</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
