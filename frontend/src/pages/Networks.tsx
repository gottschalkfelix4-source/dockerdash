import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { Trash2 } from "lucide-react";

interface NetworkItem {
  Id: string;
  Name: string;
  Driver: string;
  Scope: string;
}

export default function Networks() {
  const [networks, setNetworks] = useState<NetworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNetworks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/environments/1/networks");
      setNetworks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  const removeNetwork = async (id: string) => {
    if (!confirm("Delete this network?")) return;
    try {
      await apiFetch(`/environments/1/networks/${id}`, { method: "DELETE" });
      fetchNetworks();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {networks.map((net) => (
                <tr key={net.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium">{net.Name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{net.Id.slice(0, 12)}</td>
                  <td className="px-4 py-3">{net.Driver}</td>
                  <td className="px-4 py-3 text-gray-500">{net.Scope}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeNetwork(net.Id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {networks.length === 0 && <div className="p-8 text-center text-gray-500">No networks found</div>}
        </div>
      )}
    </div>
  );
}
