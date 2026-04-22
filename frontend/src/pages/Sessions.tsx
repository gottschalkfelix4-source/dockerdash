import { useEffect, useState } from "react";
import { getSessions, terminateSession, terminateAllSessions } from "../api/security";
import { useToastStore } from "../stores/toastStore";
import { Monitor, Trash2 } from "lucide-react";

export default function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setSessions(await getSessions()); } catch (e: any) { addToast(e.message, "error"); }
  };

  const terminate = async (id: number) => {
    try { await terminateSession(id); load(); addToast("Session terminated", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };

  const terminateAll = async () => {
    if (!confirm("Terminate ALL sessions? You will be logged out.")) return;
    try { await terminateAllSessions(); addToast("All sessions terminated", "success"); window.location.reload(); } catch (e: any) { addToast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Active Sessions</h2>
          <p className="text-sm text-gray-500">Manage your active login sessions</p>
        </div>
        <button onClick={terminateAll} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Trash2 className="w-4 h-4" /> Terminate All
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sessions.map((s) => (
          <div key={s.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-sm">{s.user_agent || "Unknown Device"}</div>
                <div className="text-xs text-gray-500">{s.ip_address} · Expires {new Date(s.expires_at).toLocaleString()}</div>
              </div>
            </div>
            <button onClick={() => terminate(s.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Monitor className="w-10 h-10 mx-auto mb-2" />
            <p>No active sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}
