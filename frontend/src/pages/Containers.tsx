import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useToastStore } from "../stores/toastStore";
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Search,
  ExternalLink,
  Container,
  Activity,
  HeartPulse,
  CheckSquare,
  Square as SquareIcon,
  ArrowUpCircle,
  ArrowUpDown,
  Archive,
} from "lucide-react";

interface ContainerItem {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports: { PublicPort: number; PrivatePort: number; Type: string }[];
  Labels: Record<string, string>;
}

interface UpdateInfo {
  container_id: string;
  image: string;
  current_tag: string;
  update_available: boolean;
}

export default function Containers() {
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [all, setAll] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const [data, upd] = await Promise.all([
        apiFetch(`/environments/1/containers?all=${all}`),
        apiFetch("/updates/check").catch(() => []),
      ]);
      setContainers(data);
      setUpdates(upd);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, [all]);

  const doAction = async (id: string, action: string) => {
    setActionId(id);
    try {
      await apiFetch(`/environments/1/containers/${id}/${action}`, { method: "POST" });
      addToast(`Container ${action}ed`, "success");
      fetchContainers();
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setActionId(null);
    }
  };

  const removeContainer = async (id: string) => {
    if (!confirm("Delete this container?")) return;
    setActionId(id);
    try {
      await apiFetch(`/environments/1/containers/${id}?force=true`, { method: "DELETE" });
      addToast("Container deleted", "success");
      fetchContainers();
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setActionId(null);
    }
  };

  const updateContainer = async (id: string) => {
    if (!confirm("Update this container to the latest image? The container will be recreated.")) return;
    setActionId(id);
    try {
      await apiFetch(`/environments/1/containers/${id}/update`, { method: "POST" });
      addToast("Container updated", "success");
      fetchContainers();
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setActionId(null);
    }
  };

  const backupContainer = async (id: string) => {
    setActionId(id);
    try {
      await apiFetch(`/environments/1/containers/${id}/backup`, { method: "POST" });
      addToast("Container backup started", "success");
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setActionId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.Id)));
    }
  };

  const bulkAction = async (action: string) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    for (const id of ids) {
      try {
        await apiFetch(`/environments/1/containers/${id}/${action}`, { method: "POST" });
      } catch (e) {}
    }
    addToast(`${ids.length} containers ${action}ed`, "success");
    setSelected(new Set());
    fetchContainers();
  };

  const filtered = containers.filter((c) => {
    const name = c.Names?.[0]?.replace(/^\//, "") || "";
    return name.toLowerCase().includes(search.toLowerCase()) || c.Image.toLowerCase().includes(search.toLowerCase());
  });

  const runningCount = containers.filter((c) => c.State === "running").length;

  const getUpdateFor = (id: string) => updates.find((u) => u.container_id === id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <Container className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">{containers.length} Total</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">{runningCount} Running</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <HeartPulse className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">{containers.length - runningCount} Stopped</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search containers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              bulkMode ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {bulkMode ? "Done" : "Bulk"}
          </button>
          <label className="flex items-center gap-2 text-sm bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="rounded text-blue-600" />
            All
          </label>
        </div>
      </div>

      {bulkMode && selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => bulkAction("start")} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium">Start</button>
            <button onClick={() => bulkAction("stop")} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium">Stop</button>
            <button onClick={() => bulkAction("restart")} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">Restart</button>
          </div>
        </div>
      )}

      {loading && containers.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <tr>
                  {bulkMode && (
                    <th className="px-4 py-3.5">
                      <button onClick={selectAll}>
                        {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-4 h-4" /> : <SquareIcon className="w-4 h-4" />}
                      </button>
                    </th>
                  )}
                  <th className="px-5 py-3.5 font-semibold">Name</th>
                  <th className="px-5 py-3.5 font-semibold">Image</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Ports</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((c) => {
                  const name = c.Names?.[0]?.replace(/^\//, "") || c.Id?.slice(0, 12);
                  const isRunning = c.State === "running";
                  const update = getUpdateFor(c.Id);
                  return (
                    <tr key={c.Id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      {bulkMode && (
                        <td className="px-4 py-4">
                          <button onClick={() => toggleSelect(c.Id)}>
                            {selected.has(c.Id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <SquareIcon className="w-4 h-4 text-gray-400" />}
                          </button>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <Link to={`/containers/${c.Id}`} className="flex items-center gap-2 group">
                          <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500" : "bg-gray-400"}`} />
                          <span className="font-semibold group-hover:text-blue-600 transition-colors">{name}</span>
                          {update?.update_available && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 rounded text-xs font-medium">
                              <ArrowUpCircle className="w-3 h-3" />
                              Update
                            </span>
                          )}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.Image}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isRunning
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                          {c.Status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {c.Ports?.slice(0, 2).map((p, i) => (
                          <div key={i} className="font-mono">
                            <span className="text-blue-600 dark:text-blue-400">{p.PublicPort}</span>:{p.PrivatePort}/{p.Type}
                          </div>
                        ))}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isRunning ? (
                            <button onClick={() => doAction(c.Id, "start")} disabled={actionId === c.Id} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Start">
                              <Play className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => doAction(c.Id, "stop")} disabled={actionId === c.Id} className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Stop">
                              <Square className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => doAction(c.Id, "restart")} disabled={actionId === c.Id} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Restart">
                            <RotateCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateContainer(c.Id)} disabled={actionId === c.Id} className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title="Update to latest image">
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                          <button onClick={() => backupContainer(c.Id)} disabled={actionId === c.Id} className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="Backup volumes">
                            <Archive className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeContainer(c.Id)} disabled={actionId === c.Id} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Container className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No containers found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
