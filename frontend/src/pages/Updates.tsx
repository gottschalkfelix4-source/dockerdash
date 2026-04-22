import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

interface UpdateItem {
  image: string;
  current_tag: string;
  update_available: boolean;
  message: string;
}

export default function Updates() {
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/updates/check");
      setUpdates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Image Updates</h2>
        <button
          onClick={fetchUpdates}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Check Now
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Current Tag</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {updates.map((u, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium">{u.image}</td>
                  <td className="px-4 py-3">{u.current_tag}</td>
                  <td className="px-4 py-3">
                    {u.update_available ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        Available
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Up to date
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {updates.length === 0 && <div className="p-8 text-center text-gray-500">No containers found</div>}
        </div>
      )}
    </div>
  );
}
