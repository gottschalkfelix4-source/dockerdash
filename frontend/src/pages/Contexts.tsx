import { useEffect, useState } from "react";
import { getDockerContexts, createDockerContext, deleteDockerContext, activateDockerContext } from "../api/contexts";
import { useToastStore } from "../stores/toastStore";
import { Globe, Plus, Trash2, Power } from "lucide-react";

export default function Contexts() {
  const [contexts, setContexts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", host: "", tls_verify: true });
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setContexts(await getDockerContexts()); } catch (e: any) { addToast(e.message, "error"); }
  };

  const save = async () => {
    try { await createDockerContext(form); addToast("Context created", "success"); setShowForm(false); load(); }
    catch (e: any) { addToast(e.message, "error"); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete context?")) return;
    try { await deleteDockerContext(id); load(); } catch (e: any) { addToast(e.message, "error"); }
  };

  const activate = async (id: number) => {
    try { await activateDockerContext(id); load(); addToast("Context activated", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Docker Contexts</h2>
          <p className="text-sm text-gray-500">Manage multiple Docker hosts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Context
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            <input placeholder="Host (tcp://host:2376)" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} className="px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm dark:border-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {contexts.map((ctx) => (
          <div key={ctx.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${ctx.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  {ctx.name}
                  {ctx.is_active && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>}
                </div>
                <div className="text-xs text-gray-500">{ctx.host}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!ctx.is_active && (
                <button onClick={() => activate(ctx.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  <Power className="w-3 h-3" /> Activate
                </button>
              )}
              <button onClick={() => remove(ctx.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {contexts.length === 0 && <div className="text-center py-12 text-gray-400"><Globe className="w-10 h-10 mx-auto mb-2" /><p>No contexts configured</p></div>}
      </div>
    </div>
  );
}
