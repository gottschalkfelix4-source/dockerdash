import { useEffect, useState } from "react";
import { getScanResults, getScannerStatus, startImageScan, deleteScanResult } from "../api/scanner";
import { useToastStore } from "../stores/toastStore";
import { Shield, ShieldAlert, ShieldCheck, Trash2, Scan, AlertTriangle } from "lucide-react";

const severityColor: Record<string, string> = {
  critical: "text-red-600 bg-red-50 dark:bg-red-900/20",
  high: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  medium: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  low: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
};

export default function Scanner() {
  const [results, setResults] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({});
  const [scanImage, setScanImage] = useState({ image_id: "", image_name: "" });
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { load(); loadStatus(); }, []);

  const load = async () => {
    try { setResults(await getScanResults()); } catch (e: any) { addToast(e.message, "error"); }
  };

  const loadStatus = async () => {
    try { setStatus(await getScannerStatus()); } catch {};
  };

  const startScan = async () => {
    if (!scanImage.image_name) return;
    try {
      await startImageScan(scanImage);
      addToast("Scan started", "success");
      load();
    } catch (e: any) { addToast(e.message, "error"); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete scan result?")) return;
    try { await deleteScanResult(id); load(); } catch (e: any) { addToast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Image Scanner</h2>
          <p className="text-sm text-gray-500">Vulnerability scanning with Trivy</p>
        </div>
        <div className={`text-xs px-3 py-1 rounded-full border ${status.installed ? "border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800" : "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800"}`}>
          {status.installed ? "Trivy Installed" : "Trivy Not Installed"}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
        <h3 className="font-semibold">Start New Scan</h3>
        <div className="flex gap-3">
          <input placeholder="Image Name (e.g. nginx:latest)" value={scanImage.image_name} onChange={(e) => setScanImage({ ...scanImage, image_name: e.target.value })} className="flex-1 px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
          <input placeholder="Image ID" value={scanImage.image_id} onChange={(e) => setScanImage({ ...scanImage, image_id: e.target.value })} className="flex-1 px-3 py-2 border rounded-xl text-sm dark:bg-gray-900 dark:border-gray-700" />
          <button onClick={startScan} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Scan className="w-4 h-4" /> Scan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {results.map((r) => (
          <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${severityColor[r.severity] || "text-gray-600 bg-gray-100"}`}>
                {r.severity === "critical" ? <ShieldAlert className="w-5 h-5" /> : r.cve_count === 0 ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-medium">{r.image_name}</div>
                <div className="text-xs text-gray-500">{r.cve_count} CVEs · {r.fixed_count} fixable · {r.scan_status}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${severityColor[r.severity] || "bg-gray-100 text-gray-600"}`}>{r.severity}</span>
              <button onClick={() => remove(r.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
            <p>No scan results yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
