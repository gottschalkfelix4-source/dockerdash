import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { Plus, Play, Square, Trash2 } from "lucide-react";

interface StackItem {
  id: number;
  name: string;
  status: string;
  compose_yaml: string;
  env_vars: string;
  created_at: string;
}

export default function Stacks() {
  const [stacks, setStacks] = useState<StackItem[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [yaml, setYaml] = useState("version: '3.8'\nservices:\n  app:\n    image: nginx:latest\n    ports:\n      - '80:80'\n");
  const [envVars, setEnvVars] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchStacks = async () => {
    try {
      const data = await apiFetch("/stacks");
      setStacks(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStacks();
  }, []);

  const createStack = async () => {
    try {
      await apiFetch("/stacks", {
        method: "POST",
        body: JSON.stringify({ name, compose_yaml: yaml, env_vars: envVars }),
      });
      setShowNew(false);
      setName("");
      fetchStacks();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deployStack = async (id: number) => {
    setActionId(id);
    try {
      await apiFetch(`/stacks/${id}/deploy`, { method: "POST" });
      fetchStacks();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  };

  const stopStack = async (id: number) => {
    setActionId(id);
    try {
      await apiFetch(`/stacks/${id}/stop`, { method: "POST" });
      fetchStacks();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  };

  const deleteStack = async (id: number) => {
    if (!confirm("Delete this stack?")) return;
    try {
      await apiFetch(`/stacks/${id}`, { method: "DELETE" });
      fetchStacks();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Docker Compose Stacks</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Stack
        </button>
      </div>

      {showNew && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Stack Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Compose YAML</label>
            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Environment Variables (.env)</label>
            <textarea
              value={envVars}
              onChange={(e) => setEnvVars(e.target.value)}
              rows={4}
              placeholder="KEY=value"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={createStack} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Create</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {stacks.map((stack) => (
              <tr key={stack.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium">{stack.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    stack.status === "running"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}>
                    {stack.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(stack.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => deployStack(stack.id)}
                      disabled={actionId === stack.id}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                      title="Deploy"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => stopStack(stack.id)}
                      disabled={actionId === stack.id}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md"
                      title="Stop"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteStack(stack.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stacks.length === 0 && <div className="p-8 text-center text-gray-500">No stacks yet</div>}
      </div>
    </div>
  );
}
