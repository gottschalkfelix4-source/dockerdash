import { useEffect, useState } from "react";
import { getAlertRules, createAlertRule, deleteAlertRule, testAlert } from "../api/alerts";
import { useToastStore } from "../stores/toastStore";
import { Plus, Trash2, Play, AlertTriangle, Cpu, HardDrive, Activity } from "lucide-react";

export default function Alerts() {
  const [rules, setRules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", resource_type: "container", resource_id: "", metric: "cpu", condition: "gt", threshold: 80, duration: 60, cooldown: 300, channels: "[]" });
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setRules(await getAlertRules()); } catch (e: any) { addToast(e.message, "error"); }
  };

  const save = async () => {
    try {
      await createAlertRule(form);
      addToast("Alert rule created", "success");
      setShowForm(false);
      load();
    } catch (e: any) { addToast(e.message, "error"); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this alert rule?")) return;
    try { await deleteAlertRule(id); load(); addToast("Deleted", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };

  const test = async (id: number) => {
    try { await testAlert(id); addToast("Test alert sent", "info"); } catch (e: any) { addToast(e.message, "error"); }
  };

  const metricIcon = (m: string) => {
    if (m === "cpu") return <Cpu className="w-4 h-4" />;
    if (m === "memory") return <HardDrive className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Alert Rules</h2>
          <p className="text-sm text-gray-500">Monitor resources and get notified</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h3 className="font-semibold">New Alert Rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Resource Type</label>
              <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700">
                <option value="container">Container</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Resource ID</label>
              <input value={form.resource_id} onChange={(e) => setForm({ ...form, resource_id: e.target.value })} placeholder="Container ID (empty for system)" className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Metric</label>
              <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700">
                <option value="cpu">CPU %</option>
                <option value="memory">Memory %</option>
                <option value="disk">Disk %</option>
                <option value="health">Health Status</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700">
                <option value="gt">&gt; Greater than</option>
                <option value="lt">&lt; Less than</option>
                <option value="eq">= Equal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Threshold</label>
              <input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Create Rule</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm dark:border-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {rules.map((r) => (
          <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${r.enabled ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                {metricIcon(r.metric)}
              </div>
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-gray-500">{r.metric} {r.condition} {r.threshold} for {r.duration}s</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => test(r.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Test">
                <Play className="w-4 h-4 text-green-600" />
              </button>
              <button onClick={() => remove(r.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
            <p>No alert rules configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
