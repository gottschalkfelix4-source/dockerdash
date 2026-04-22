import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useToastStore } from "../stores/toastStore";
import { Trash2, Scissors, Container, X, CheckCircle2, AlertTriangle } from "lucide-react";

interface VolumeItem {
  Name: string;
  Driver: string;
  Mountpoint: string;
  Labels?: Record<string, string>;
  used_by?: string[];
}

export default function Volumes() {
  const [volumes, setVolumes] = useState<VolumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prunePhase, setPrunePhase] = useState<"idle" | "confirm" | "running" | "done">("idle");
  const [pruneTargets, setPruneTargets] = useState<VolumeItem[]>([]);
  const [pruneIndex, setPruneIndex] = useState(0);
  const [pruneCurrent, setPruneCurrent] = useState("");
  const [pruneResults, setPruneResults] = useState<{ name: string; ok: boolean; error?: string }[]>([]);
  const addToast = useToastStore((s) => s.addToast);

  const fetchVolumes = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/environments/1/volumes");
      setVolumes(Array.isArray(data) ? data : data.Volumes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolumes();
  }, []);

  const unusedVolumes = volumes.filter((v) => !v.used_by || v.used_by.length === 0);

  const openPruneConfirm = () => {
    if (unusedVolumes.length === 0) {
      addToast("No unused volumes to prune", "info");
      return;
    }
    setPruneTargets(unusedVolumes);
    setPruneResults([]);
    setPrunePhase("confirm");
  };

  const startPrune = async () => {
    setPrunePhase("running");
    setPruneIndex(0);

    const results: { name: string; ok: boolean; error?: string }[] = [];

    for (let i = 0; i < pruneTargets.length; i++) {
      const vol = pruneTargets[i];
      setPruneIndex(i);
      setPruneCurrent(vol.Name);

      try {
        await apiFetch(`/environments/1/volumes/${encodeURIComponent(vol.Name)}`, { method: "DELETE" });
        results.push({ name: vol.Name, ok: true });
      } catch (e: any) {
        results.push({ name: vol.Name, ok: false, error: e.message });
      }
      setPruneResults([...results]);
      await new Promise((r) => setTimeout(r, 120));
    }

    setPruneCurrent("");
    setPrunePhase("done");
    fetchVolumes();
  };

  const removeVolume = async (name: string) => {
    if (!confirm(`Delete volume "${name}"?`)) return;
    try {
      await apiFetch(`/environments/1/volumes/${encodeURIComponent(name)}`, { method: "DELETE" });
      addToast("Volume deleted", "success");
      fetchVolumes();
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const progressPct = pruneTargets.length > 0 ? Math.round(((pruneIndex + 1) / pruneTargets.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Volumes</h2>
        <button
          onClick={openPruneConfirm}
          className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 rounded-xl text-sm font-medium transition-colors"
        >
          <Scissors className="w-4 h-4" /> Prune Unused ({unusedVolumes.length})
        </button>
      </div>

      {/* Confirm Panel */}
      {prunePhase === "confirm" && (
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold">Prune Unused Volumes</h3>
              <p className="text-xs text-gray-500">{pruneTargets.length} volumes will be permanently deleted</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-4 space-y-1">
            {pruneTargets.slice(0, 6).map((vol) => (
              <div key={vol.Name} className="flex items-center justify-between text-sm">
                <span className="font-medium truncate">{vol.Name}</span>
                <span className="text-gray-500 text-xs">{vol.Driver}</span>
              </div>
            ))}
            {pruneTargets.length > 6 && (
              <div className="text-xs text-gray-500 text-center pt-1">+ {pruneTargets.length - 6} more</div>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setPrunePhase("idle")} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
            <button onClick={startPrune} className="px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors">Prune {pruneTargets.length} Volumes</button>
          </div>
        </div>
      )}

      {/* Progress Panel */}
      {prunePhase === "running" && (
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h3 className="font-bold mb-1">Pruning Volumes...</h3>
          <p className="text-sm text-gray-500 mb-5 truncate">
            {pruneCurrent ? `Deleting ${pruneCurrent}` : "Preparing..."}
          </p>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-3 overflow-hidden">
            <div className="bg-orange-500 h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(progressPct, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mb-5">
            <span>{pruneIndex + 1} of {pruneTargets.length}</span>
            <span>{Math.min(progressPct, 100)}%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pruneResults.slice(-8).map((r, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${r.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                {r.ok ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {r.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Done Panel */}
      {prunePhase === "done" && (
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-bold">Prune Complete</h3>
            <p className="text-xs text-gray-500">{pruneResults.filter((r) => r.ok).length} of {pruneResults.length} volumes deleted</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {pruneResults.slice(0, 10).map((r, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${r.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                {r.ok ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {r.name}
              </span>
            ))}
            {pruneResults.length > 10 && (
              <span className="text-xs text-gray-500 self-center">+ {pruneResults.length - 10} more</span>
            )}
          </div>
          <div className="flex justify-center">
            <button onClick={() => setPrunePhase("idle")} className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">Done</button>
          </div>
        </div>
      )}

      {/* Table */}
      {prunePhase === "idle" && (
        loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Mountpoint</th>
                  <th className="px-4 py-3">Used By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {volumes.map((vol) => {
                  const isUsed = vol.used_by && vol.used_by.length > 0;
                  return (
                    <tr key={vol.Name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{vol.Name}</td>
                      <td className="px-4 py-3 text-gray-500">{vol.Driver}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono truncate max-w-xs">{vol.Mountpoint}</td>
                      <td className="px-4 py-3">
                        {isUsed ? (
                          <div className="flex flex-wrap gap-1">
                            {vol.used_by!.map((name) => (
                              <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                <Container className="w-3 h-3" /> {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unused</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeVolume(vol.Name)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {volumes.length === 0 && <div className="p-8 text-center text-gray-500">No volumes found</div>}
          </div>
        )
      )}
    </div>
  );
}
