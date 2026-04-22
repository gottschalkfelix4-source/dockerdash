import { useEffect, useState } from "react";
import { getAPIKeys, createAPIKey, revokeAPIKey, deleteAPIKey } from "../api/security";
import { useToastStore } from "../stores/toastStore";
import { Key, Plus, Copy, Trash2, Ban } from "lucide-react";

export default function ApiKeys() {
  const [keys, setKeys] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [form, setForm] = useState({ name: "", role: "viewer", expires: "" });
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setKeys(await getAPIKeys()); } catch (e: any) { addToast(e.message, "error"); }
  };

  const save = async () => {
    try {
      const res = await createAPIKey(form);
      setNewKey(res.key);
      addToast("API Key created - copy it now!", "success");
      setShowForm(false);
      load();
    } catch (e: any) { addToast(e.message, "error"); }
  };

  const revoke = async (id: number) => {
    try { await revokeAPIKey(id); load(); addToast("Revoked", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };

  const remove = async (id: number) => {
    if (!confirm("Permanently delete this key?")) return;
    try { await deleteAPIKey(id); load(); } catch (e: any) { addToast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">API Keys</h2>
          <p className="text-sm text-gray-500">Manage keys for CI/CD and external integrations</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Key
        </button>
      </div>

      {newKey && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="font-mono text-sm break-all">{newKey}</div>
          <button onClick={() => { navigator.clipboard.writeText(newKey); addToast("Copied!", "success"); }} className="p-2 hover:bg-amber-100 rounded-lg transition-colors">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Key Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700">
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <input type="date" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} className="px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Generate Key</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm dark:border-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {keys.map((k) => (
          <div key={k.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${k.is_revoked ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"}`}>
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  {k.name}
                  {k.is_revoked && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Revoked</span>}
                </div>
                <div className="text-xs text-gray-500">{k.key_prefix}... · {k.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!k.is_revoked && (
                <button onClick={() => revoke(k.id)} className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Revoke">
                  <Ban className="w-4 h-4 text-amber-500" />
                </button>
              )}
              <button onClick={() => remove(k.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {keys.length === 0 && <div className="text-center py-12 text-gray-400"><Key className="w-10 h-10 mx-auto mb-2" /><p>No API keys</p></div>}
      </div>
    </div>
  );
}
