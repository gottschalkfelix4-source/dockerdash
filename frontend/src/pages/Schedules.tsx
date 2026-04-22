import { useEffect, useState } from "react";
import { getSchedules, createSchedule, deleteSchedule, toggleSchedule, runScheduleNow } from "../api/schedules";
import { useToastStore } from "../stores/toastStore";
import { Clock, Plus, Trash2, Play, Pause, Calendar, RotateCcw, AlertCircle } from "lucide-react";

const cronPresets = [
  { label: "Every minute", value: "0 * * * * *" },
  { label: "Every 5 minutes", value: "0 */5 * * * *" },
  { label: "Every hour", value: "0 0 * * * *" },
  { label: "Every day at 2am", value: "0 0 2 * * *" },
  { label: "Every Sunday", value: "0 0 2 * * 0" },
  { label: "Monthly", value: "0 0 2 1 * *" },
];

const jobTypes = [
  { key: "backup", label: "Volume Backup", icon: RotateCcw },
  { key: "update", label: "Auto Update", icon: Play },
  { key: "prune", label: "System Prune", icon: Trash2 },
  { key: "scan", label: "Image Scan", icon: AlertCircle },
];

export default function Schedules() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "backup",
    cron_expr: "0 0 2 * * *",
    target_id: 0,
    target_type: "volume",
    config: "{}",
    is_enabled: true,
  });
  const [configJson, setConfigJson] = useState('{"volume_name":"","retention":5}');
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setSchedules(await getSchedules()); } catch (e: any) { addToast(e.message, "error"); }
  };

  const save = async () => {
    try {
      const data = { ...form, config: configJson };
      await createSchedule(data);
      addToast("Schedule created", "success");
      setShowForm(false);
      load();
    } catch (e: any) { addToast(e.message, "error"); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this schedule?")) return;
    try { await deleteSchedule(id); load(); } catch (e: any) { addToast(e.message, "error"); }
  };

  const toggle = async (id: number) => {
    try { await toggleSchedule(id); load(); } catch (e: any) { addToast(e.message, "error"); }
  };

  const runNow = async (id: number) => {
    try { await runScheduleNow(id); addToast("Job triggered", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };

  const getConfigHelp = () => {
    switch (form.type) {
      case "backup": return '{"volume_name":"mydata","stack_name":"app","retention":5}';
      case "update": return '{"container_id":"abc123","image_name":"nginx:latest"}';
      case "prune": return '{"targets":["images","volumes","networks"]}';
      case "scan": return '{"image_name":"nginx:latest","image_id":"sha256:..."}';
      default: return "{}";
    }
  };

  const getTypeIcon = (type: string) => {
    const t = jobTypes.find((j) => j.key === type);
    return t ? <t.icon className="w-4 h-4" /> : <Clock className="w-4 h-4" />;
  };

  const getTypeLabel = (type: string) => {
    return jobTypes.find((j) => j.key === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Scheduled Jobs</h2>
          <p className="text-sm text-gray-500">Automate backups, updates, pruning and scans</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h3 className="font-semibold">Create Scheduled Job</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Daily Backup" className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.type} onChange={(e) => { setForm({ ...form, type: e.target.value }); setConfigJson(getConfigHelp()); }} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700">
                {jobTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cron Expression</label>
              <select value={form.cron_expr} onChange={(e) => setForm({ ...form, cron_expr: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700">
                {cronPresets.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Custom Cron</label>
            <input value={form.cron_expr} onChange={(e) => setForm({ ...form, cron_expr: e.target.value })} placeholder="0 0 2 * * *" className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Config JSON</label>
            <textarea value={configJson} onChange={(e) => setConfigJson(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700 font-mono" />
            <div className="text-xs text-gray-400 mt-1">Example: {getConfigHelp()}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Create Schedule</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm dark:border-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {schedules.map((s) => (
          <div key={s.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.is_enabled ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" : "bg-gray-100 text-gray-400"}`}>
                {getTypeIcon(s.type)}
              </div>
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-gray-500">
                  {getTypeLabel(s.type)} · {s.cron_expr} ·
                  {s.last_run ? ` Last: ${new Date(s.last_run).toLocaleString()}` : " Never run"}
                  {s.last_status && ` · ${s.last_status}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.last_status === "failed" && <span className="text-xs text-red-500">{s.last_error}</span>}
              <button onClick={() => runNow(s.id)} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Run now">
                <Play className="w-4 h-4 text-green-600" />
              </button>
              <button onClick={() => toggle(s.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title={s.is_enabled ? "Pause" : "Resume"}>
                {s.is_enabled ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-blue-500" />}
              </button>
              <button onClick={() => remove(s.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-2" />
            <p>No scheduled jobs configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
