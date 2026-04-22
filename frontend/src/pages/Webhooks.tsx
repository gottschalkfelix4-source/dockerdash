import { useEffect, useState } from "react";
import { getWebhooks, createWebhook, deleteWebhook, testWebhook } from "../api/webhooks";
import { useToastStore } from "../stores/toastStore";
import { Webhook, Plus, Trash2, Play, Send, ArrowRightLeft } from "lucide-react";

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "outgoing", url: "", method: "POST", headers: "{}", events: "[\"container.start\",\"container.stop\"]", secret: "" });
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setHooks(await getWebhooks()); } catch (e: any) { addToast(e.message, "error"); }
  };

  const save = async () => {
    try {
      await createWebhook(form);
      addToast("Webhook created", "success");
      setShowForm(false);
      load();
    } catch (e: any) { addToast(e.message, "error"); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this webhook?")) return;
    try { await deleteWebhook(id); load(); addToast("Deleted", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };

  const test = async (id: number) => {
    try {
      const res = await testWebhook(id);
      addToast(`Test returned HTTP ${res.status}`, res.status >= 200 && res.status < 300 ? "success" : "warning");
    } catch (e: any) { addToast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Webhooks</h2>
          <p className="text-sm text-gray-500">Incoming and outgoing webhooks</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Webhook
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <h3 className="font-semibold">New Webhook</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700">
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm dark:border-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {hooks.map((h) => (
          <div key={h.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${h.type === "outgoing" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600"}`}>
                {h.type === "outgoing" ? <Send className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-medium">{h.name}</div>
                <div className="text-xs text-gray-500 truncate max-w-xs">{h.url}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {h.last_status > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${h.last_status >= 200 && h.last_status < 300 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>HTTP {h.last_status}</span>}
              <button onClick={() => test(h.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Test">
                <Play className="w-4 h-4 text-green-600" />
              </button>
              <button onClick={() => remove(h.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {hooks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Webhook className="w-10 h-10 mx-auto mb-2" />
            <p>No webhooks configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
