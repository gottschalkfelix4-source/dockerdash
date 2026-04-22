import { useEffect, useState } from "react";
import { getContainerGroups, createContainerGroup, deleteContainerGroup } from "../api/groups";
import { useToastStore } from "../stores/toastStore";
import { Folder, Plus, Trash2 } from "lucide-react";

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

export default function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#3B82F6", icon: "" });
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setGroups(await getContainerGroups()); } catch (e: any) { addToast(e.message, "error"); }
  };

  const save = async () => {
    try { await createContainerGroup(form); addToast("Group created", "success"); setShowForm(false); load(); }
    catch (e: any) { addToast(e.message, "error"); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this group?")) return;
    try { await deleteContainerGroup(id); load(); } catch (e: any) { addToast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Container Groups</h2>
          <p className="text-sm text-gray-500">Organize containers with tags and colors</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Group Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
            <div className="flex gap-2 items-center">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-6 h-6 rounded-full border-2 ${form.color === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm dark:border-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="font-medium">{g.name}</span>
              </div>
              <button onClick={() => remove(g.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
            <div className="text-xs text-gray-500">Color: {g.color}</div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Folder className="w-10 h-10 mx-auto mb-2" />
            <p>No groups created yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
