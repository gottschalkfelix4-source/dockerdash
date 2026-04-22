import { useEffect, useState } from "react";
import { getAuditLog } from "../api/security";
import { useToastStore } from "../stores/toastStore";
import { ClipboardList, Filter } from "lucide-react";

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState({ action: "", resource_type: "" });
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.action) params.append("action", filter.action);
      if (filter.resource_type) params.append("resource_type", filter.resource_type);
      setLogs(await getAuditLog(params.toString()));
    } catch (e: any) { addToast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Audit Log</h2>
        <p className="text-sm text-gray-500">Track all actions performed in Docker Panel</p>
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value })} className="bg-transparent text-sm outline-none">
            <option value="">All Actions</option>
            <option value="start">Start</option>
            <option value="stop">Stop</option>
            <option value="create">Create</option>
            <option value="delete">Delete</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filter.resource_type} onChange={(e) => setFilter({ ...filter, resource_type: e.target.value })} className="bg-transparent text-sm outline-none">
            <option value="">All Resources</option>
            <option value="container">Container</option>
            <option value="stack">Stack</option>
            <option value="volume">Volume</option>
            <option value="image">Image</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Action</th>
              <th className="text-left px-4 py-3 font-medium">Resource</th>
              <th className="text-left px-4 py-3 font-medium">Details</th>
              <th className="text-left px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{log.username || "system"}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 rounded-full">{log.action}</span></td>
                <td className="px-4 py-3 text-gray-500">{log.resource_type}:{log.resource_id}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.details}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2" />
            <p>No audit log entries</p>
          </div>
        )}
      </div>
    </div>
  );
}
