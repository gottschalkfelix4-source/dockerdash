import { useEffect, useState } from "react";
import { getSwarmNodes, getSwarmServices, getSwarmStatus, scaleSwarmService, updateSwarmNode } from "../api/swarm";
import { useToastStore } from "../stores/toastStore";
import { Server, Layers } from "lucide-react";

export default function Swarm() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({});
  const [envId] = useState(1);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); }, [envId]);

  const load = async () => {
    try {
      setNodes(await getSwarmNodes(envId));
      setServices(await getSwarmServices(envId));
      setStatus(await getSwarmStatus(envId));
    } catch (e: any) { addToast(e.message, "error"); }
  };

  const scale = async (sid: number, replicas: number) => {
    try { await scaleSwarmService(envId, sid, replicas); load(); addToast("Scaled", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };

  const drainNode = async (nid: number) => {
    try { await updateSwarmNode(envId, nid, { availability: "drain" }); load(); addToast("Node drained", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Docker Swarm</h2>
          <p className="text-sm text-gray-500">Manage swarm nodes and services</p>
        </div>
        <div className={`text-xs px-3 py-1 rounded-full border ${status.swarm_enabled ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
          {status.swarm_enabled ? "Swarm Active" : "Swarm Inactive"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nodes */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Nodes</h3>
          </div>
          <div className="space-y-3">
            {nodes.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div>
                  <div className="font-medium text-sm">{n.hostname}</div>
                  <div className="text-xs text-gray-500">{n.role} · {n.availability} · {n.addr}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${n.status === "ready" ? "bg-green-500" : "bg-red-500"}`} />
                  {n.role === "worker" && (
                    <button onClick={() => drainNode(n.id)} className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700">Drain</button>
                  )}
                </div>
              </div>
            ))}
            {nodes.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">No nodes found</div>}
          </div>
        </div>

        {/* Services */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">Services</h3>
          </div>
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.image}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{s.running_tasks}/{s.replicas}</span>
                  <input type="number" defaultValue={s.replicas} onBlur={(e) => scale(s.id, Number(e.target.value))} className="w-16 px-2 py-1 text-xs border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
                </div>
              </div>
            ))}
            {services.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">No services found</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
