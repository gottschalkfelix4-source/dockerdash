import { useState } from "react";
import { discoverPortainerStacks, importPortainerStacks } from "../api/migrate";
import { useToastStore } from "../stores/toastStore";
import { FolderOpen, Import, Check, AlertTriangle, FileText, HardDrive, Database } from "lucide-react";

interface DiscoveredStack {
  name: string;
  path: string;
  compose_yaml: string;
  env_vars: string;
  has_env_file: boolean;
}

export default function Migrate() {
  const [sourcePath, setSourcePath] = useState("/data/compose");
  const [discovered, setDiscovered] = useState<DiscoveredStack[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const addToast = useToastStore((s) => s.addToast);

  const scan = async () => {
    setLoading(true);
    setDiscovered([]);
    setResults(null);
    try {
      const res = await discoverPortainerStacks(sourcePath);
      setDiscovered(res.stacks || []);
      // Select all by default
      setSelected(new Set((res.stacks || []).map((_: any, i: number) => i)));
      if (res.count === 0) {
        addToast("No docker-compose files found at that path", "warning");
      } else {
        addToast(`Found ${res.count} stack(s)`, "success");
      }
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === discovered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(discovered.map((_, i) => i)));
    }
  };

  const doImport = async () => {
    const stacks = Array.from(selected).map((i) => discovered[i]);
    if (stacks.length === 0) {
      addToast("No stacks selected", "warning");
      return;
    }
    setImporting(true);
    try {
      const res = await importPortainerStacks(sourcePath, stacks);
      setResults(res);
      addToast(`Imported ${res.count} stack(s)`, "success");
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Stack Migration</h2>
        <p className="text-sm text-gray-500">Import Docker Compose stacks from Portainer or any folder</p>
      </div>

      {/* Scan Step */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
            <FolderOpen className="w-4 h-4" />
          </div>
          <h3 className="font-semibold">1. Select Source</h3>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Source Path</label>
            <input
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
              placeholder="/data/compose or /var/lib/docker/volumes/portainer_data/_data/compose"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm font-mono"
            />
            <div className="text-xs text-gray-400 mt-1">
              Portainer default: <span className="font-mono">/data/compose</span> · 
              Any folder containing docker-compose.yml files will work
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={scan}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              Scan
            </button>
          </div>
        </div>
      </div>

      {/* Results Step */}
      {discovered.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-semibold">2. Discovered Stacks ({discovered.length})</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {selected.size === discovered.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={doImport}
                disabled={importing || selected.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Import className="w-4 h-4" />
                )}
                Import {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {discovered.map((stack, idx) => (
              <div
                key={idx}
                onClick={() => toggleSelect(idx)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selected.has(idx)
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
                    : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  selected.has(idx) ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-gray-600"
                }`}>
                  {selected.has(idx) && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {stack.name}
                    {stack.has_env_file && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded">.env</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-mono truncate">{stack.path}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {(stack.compose_yaml.length / 1024).toFixed(1)} KB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Results */}
      {results && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
              <Check className="w-4 h-4" />
            </div>
            <h3 className="font-semibold">3. Import Results</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{results.count}</div>
              <div className="text-sm text-emerald-600 dark:text-emerald-300">Imported</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">{results.failed?.length || 0}</div>
              <div className="text-sm text-red-600 dark:text-red-300">Failed</div>
            </div>
          </div>

          {results.imported?.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Successfully imported:</div>
              <div className="flex flex-wrap gap-2">
                {results.imported.map((name: string) => (
                  <span key={name} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg">{name}</span>
                ))}
              </div>
            </div>
          )}

          {results.failed?.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2 text-red-600">Failed:</div>
              <div className="space-y-1">
                {results.failed.map((err: string, i: number) => (
                  <div key={i} className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {err}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Card */}
      {!discovered.length && !results && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-gray-400" />
            How to migrate from Portainer
          </h4>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span>Mount your Portainer data volume into the Docker Panel backend container</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span>Enter the path where the Portainer compose files are stored (usually <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs">/data/compose</code>)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span>Click <strong>Scan</strong> to discover all docker-compose.yml files</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
              <span>Select the stacks you want to import and click <strong>Import</strong></span>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> Portainer stores stacks in numbered folders. Stack names will be auto-generated 
            (e.g. <span className="font-mono">compose_1</span>). You can rename them after import in the Stacks page.
          </div>
        </div>
      )}
    </div>
  );
}
