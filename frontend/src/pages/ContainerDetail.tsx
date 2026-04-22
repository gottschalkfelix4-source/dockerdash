import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useToastStore } from "../stores/toastStore";
import {
  ArrowLeft, Play, Square, RotateCw, Trash2, Terminal, FileText,
  Activity, HeartPulse, Calendar, Tag, Globe, Cpu, MemoryStick,
  HardDrive, Wifi, Search, Download, ArrowUpDown, Archive, Radio, History,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ContainerInfo {
  Id: string;
  Name: string;
  Config: { Image: string; Labels: Record<string, string>; Env: string[]; Hostname: string };
  State: { Status: string; Running: boolean; StartedAt: string; FinishedAt: string; ExitCode: number; Health?: { Status: string } };
  NetworkSettings: { Ports: Record<string, { HostIp: string; HostPort: string }[]>; Networks: Record<string, { IPAddress: string; Gateway: string }> };
  HostConfig: { RestartPolicy: { Name: string } };
}

interface StatPoint {
  time: string;
  cpu: number;
  memory: number;
  netRx: number;
  netTx: number;
}

export default function ContainerDetail() {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [info, setInfo] = useState<ContainerInfo | null>(null);
  const [tab, setTab] = useState<"logs" | "terminal" | "stats" | "files">("logs");
  const [logs, setLogs] = useState<string>("");
  const [logFilter, setLogFilter] = useState("");
  const [logLevel, setLogLevel] = useState<"all" | "error" | "warn" | "info">("all");
  const [terminalReady, setTerminalReady] = useState(false);
  const [files, setFiles] = useState<string>("");
  const [statHistory, setStatHistory] = useState<StatPoint[]>([]);
  const [timeRange, setTimeRange] = useState<"live" | "1h" | "24h" | "7d">("live");
  const [statsLoading, setStatsLoading] = useState(false);
  const containerCache = useRef(new Map<string, StatPoint[]>());
  const liveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const fetchInfo = async () => {
    try { const data = await apiFetch(`/environments/1/containers/${cid}`); setInfo(data); } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchInfo(); }, [cid]);

  useEffect(() => {
    if (tab !== "logs" || !cid) return;
    const ws = new WebSocket(`ws://localhost:8080/ws/logs/1/${cid}?tail=200&follow=true`);
    ws.binaryType = "arraybuffer";
    ws.onmessage = (ev) => { const text = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data); setLogs((prev) => prev + text); };
    return () => ws.close();
  }, [tab, cid]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  useEffect(() => {
    if (tab !== "terminal" || !cid) return;
    const ws = new WebSocket(`ws://localhost:8080/ws/terminal/1/${cid}`);
    ws.binaryType = "arraybuffer";
    const termEl = document.getElementById("terminal-output");
    if (!termEl) return;
    let buffer = "";
    ws.onmessage = (ev) => { const text = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data); buffer += text; termEl.innerHTML = escapeHtml(buffer).replace(/\n/g, "<br>"); termEl.scrollTop = termEl.scrollHeight; setTerminalReady(true); };
    const handleKey = (e: KeyboardEvent) => { if (ws.readyState === WebSocket.OPEN) ws.send(e.key); };
    window.addEventListener("keydown", handleKey);
    return () => { ws.close(); window.removeEventListener("keydown", handleKey); };
  }, [tab, cid]);

  const fetchHistoricalStats = async (range: string) => {
    if (!cid || range === "live") return;
    const cacheKey = `${cid}-${range}`;
    if (containerCache.current.has(cacheKey)) { setStatHistory(containerCache.current.get(cacheKey)!); return; }
    setStatsLoading(true);
    try {
      const data = await apiFetch(`/metrics/containers/${cid}?range=${range}`);
      const grouped = groupContainerMetrics(data);
      containerCache.current.set(cacheKey, grouped);
      setStatHistory(grouped);
    } catch (e) { console.error(e); } finally { setStatsLoading(false); }
  };

  useEffect(() => {
    if (tab !== "stats" || !cid) return;
    if (timeRange !== "live") {
      if (liveInterval.current) { clearInterval(liveInterval.current); liveInterval.current = null; }
      fetchHistoricalStats(timeRange);
      return;
    }
    setStatHistory([]);
    const fetchStats = async () => {
      try {
        const data = await apiFetch(`/environments/1/containers/${cid}/stats`);
        if (data?.cpu_stats && data?.memory_stats) {
          const cpuDelta = data.cpu_stats.cpu_usage.total_usage - (data.precpu_stats?.cpu_usage?.total_usage || 0);
          const systemDelta = data.cpu_stats.system_cpu_usage - (data.precpu_stats?.system_cpu_usage || 0);
          const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * 100 * (data.cpu_stats.online_cpus || 1) : 0;
          const memUsage = data.memory_stats.usage || 0;
          const memLimit = data.memory_stats.limit || 1;
          const memPercent = (memUsage / memLimit) * 100;
          const netRx = data.networks?.eth0?.rx_bytes || 0;
          const netTx = data.networks?.eth0?.tx_bytes || 0;
          setStatHistory((prev) => [...prev, { time: new Date().toLocaleTimeString(), cpu: +cpuPercent.toFixed(2), memory: +memPercent.toFixed(2), netRx: Math.round(netRx / 1024), netTx: Math.round(netTx / 1024) }].slice(-40));
        }
      } catch (e) {}
    };
    fetchStats();
    liveInterval.current = setInterval(fetchStats, 2000);
    return () => { if (liveInterval.current) clearInterval(liveInterval.current); };
  }, [tab, cid, timeRange]);

  useEffect(() => {
    if (tab !== "files" || !cid) return;
    const fetchFiles = async () => { try { const data = await apiFetch(`/environments/1/containers/${cid}/files?path=/`); setFiles(data); } catch (e) {} };
    fetchFiles();
  }, [tab, cid]);

  const filteredLogs = useMemo(() => {
    let lines = logs.split("\n");
    if (logFilter) lines = lines.filter((l) => l.toLowerCase().includes(logFilter.toLowerCase()));
    if (logLevel !== "all") {
      const patterns: Record<string, RegExp> = { error: /error|err|fatal|exception|panic/i, warn: /warn|warning|caution/i, info: /info|debug|log/i };
      lines = lines.filter((l) => patterns[logLevel].test(l));
    }
    return lines.join("\n");
  }, [logs, logFilter, logLevel]);

  const doAction = async (action: string) => {
    try { await apiFetch(`/environments/1/containers/${cid}/${action}`, { method: "POST" }); addToast(`Container ${action}ed`, "success"); fetchInfo(); } catch (e: any) { addToast(e.message, "error"); }
  };
  const remove = async () => {
    if (!confirm("Delete container?")) return;
    try { await apiFetch(`/environments/1/containers/${cid}?force=true`, { method: "DELETE" }); addToast("Container deleted", "success"); navigate("/containers"); } catch (e: any) { addToast(e.message, "error"); }
  };
  const updateContainer = async () => {
    if (!confirm("Update this container to the latest image? It will be recreated.")) return;
    try { await apiFetch(`/environments/1/containers/${cid}/update`, { method: "POST" }); addToast("Container updated to latest image", "success"); fetchInfo(); } catch (e: any) { addToast(e.message, "error"); }
  };
  const backupContainer = async () => {
    try { await apiFetch(`/environments/1/containers/${cid}/backup`, { method: "POST" }); addToast("Container volumes backed up", "success"); } catch (e: any) { addToast(e.message, "error"); }
  };
  const downloadLogs = () => {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${info?.Name?.replace(/^\//, "") || "container"}_logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!info) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  const name = info.Name?.replace(/^\//, "") || cid;
  const isRunning = info.State?.Running;
  const ports = info.NetworkSettings?.Ports || {};
  const portList = Object.entries(ports).flatMap(([containerPort, bindings]) => bindings?.map((b) => `${b.HostPort}:${containerPort}`) || []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/containers")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{name}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isRunning ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                {info.State?.Status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">{info.Config?.Image}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isRunning ? (
            <button onClick={() => doAction("start")} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5">
              <Play className="w-4 h-4" /> Start
            </button>
          ) : (
            <button onClick={() => doAction("stop")} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5">
              <Square className="w-4 h-4" /> Stop
            </button>
          )}
          <button onClick={() => doAction("restart")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5">
            <RotateCw className="w-4 h-4" /> Restart
          </button>
          <button onClick={updateContainer} className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 rounded-xl text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5">
            <ArrowUpDown className="w-4 h-4" /> Update
          </button>
          <button onClick={backupContainer} className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-xl text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5">
            <Archive className="w-4 h-4" /> Backup
          </button>
          <button onClick={remove} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-xl text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoCard icon={Tag} label="Container ID" value={cid?.slice(0, 12) || "N/A"} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-900/20" delay={1} />
        <InfoCard icon={Calendar} label="Started" value={info.State?.StartedAt ? new Date(info.State.StartedAt).toLocaleString() : "N/A"} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-900/20" delay={2} />
        <InfoCard icon={HeartPulse} label="Health" value={info.State?.Health?.Status || "N/A"} color="text-rose-500" bg="bg-rose-50 dark:bg-rose-900/20" delay={3} />
        <InfoCard icon={Globe} label="Ports" value={portList.slice(0, 2).join(", ") || "None"} color="text-violet-500" bg="bg-violet-50 dark:bg-violet-900/20" delay={4} />
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-fit">
        {[{ key: "logs", label: "Logs", icon: FileText }, { key: "terminal", label: "Terminal", icon: Terminal }, { key: "stats", label: "Stats", icon: Activity }, { key: "files", label: "Files", icon: HardDrive }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t.key ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "logs" && (
        <div className="space-y-3 tab-fade">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={logFilter} onChange={(e) => setLogFilter(e.target.value)} placeholder="Filter logs..." className="pl-9 pr-4 py-2 w-full border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            </div>
            <select value={logLevel} onChange={(e) => setLogLevel(e.target.value as any)} className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
              <option value="all">All Levels</option><option value="error">Error</option><option value="warn">Warning</option><option value="info">Info</option>
            </select>
            <button onClick={downloadLogs} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
          <div className="bg-gray-950 rounded-2xl p-4 min-h-[400px] overflow-auto font-mono text-sm text-gray-300 border border-gray-800">
            <div ref={logRef} className="whitespace-pre-wrap max-h-[500px] overflow-auto">{filteredLogs || "Waiting for logs..."}</div>
          </div>
        </div>
      )}

      {tab === "terminal" && (
        <div className="tab-fade bg-gray-950 rounded-2xl p-4 min-h-[450px] overflow-auto font-mono text-sm text-gray-300 border border-gray-800">
          <div id="terminal-output" className="whitespace-pre-wrap max-h-[500px] overflow-auto outline-none" tabIndex={0}>{!terminalReady && "Connecting to terminal..."}</div>
        </div>
      )}

      {tab === "stats" && (
        <div className="space-y-4 tab-fade">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl">
              {(["live", "1h", "24h", "7d"] as const).map((r) => (
                <button key={r} onClick={() => setTimeRange(r)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${timeRange === r ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  {r === "live" ? <Radio className="w-3 h-3" /> : <History className="w-3 h-3" />}
                  {r === "live" ? "Live" : r === "1h" ? "1 Hour" : r === "24h" ? "24 Hours" : "7 Days"}
                </button>
              ))}
            </div>
            {timeRange === "live" && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
              </span>
            )}
          </div>
          {statsLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600" />
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="CPU Usage" icon={Cpu} color="#3b82f6" data={statHistory} dataKey="cpu" unit="%" animate={timeRange === "live" || statHistory.length < 30} />
            <ChartCard title="Memory Usage" icon={MemoryStick} color="#10b981" data={statHistory} dataKey="memory" unit="%" animate={timeRange === "live" || statHistory.length < 30} />
            <ChartCard title="Network RX" icon={Wifi} color="#f59e0b" data={statHistory} dataKey="netRx" unit="KB" animate={timeRange === "live" || statHistory.length < 30} />
            <ChartCard title="Network TX" icon={Wifi} color="#ef4444" data={statHistory} dataKey="netTx" unit="KB" animate={timeRange === "live" || statHistory.length < 30} />
          </div>
        </div>
      )}

      {tab === "files" && (
        <div className="tab-fade bg-gray-950 rounded-2xl p-4 min-h-[400px] overflow-auto font-mono text-sm text-gray-300 border border-gray-800">
          <div className="whitespace-pre-wrap">{files || "Loading files..."}</div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color, bg, delay }: { icon: any; label: string; value: string; color: string; bg: string; delay: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300" style={{ animation: `fadeInUp 0.3s ease-out ${delay * 0.05}s both` }}>
      <div className={`p-2 rounded-lg ${bg} ${color}`}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, color, data, dataKey, unit, animate }: any) {
  const gradId = `cd-${dataKey}`;
  const last = data.length > 0 ? data[data.length - 1][dataKey] : null;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5" style={{ color }} />
        <h3 className="font-bold text-sm">{title}</h3>
        {last !== null && (
          <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{last}{unit}</span>
        )}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
            <YAxis tick={{ fontSize: 10 }} unit={unit} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<AreaTooltip unit={unit} />} />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} activeDot={{ r: 3, strokeWidth: 0, fill: color }} isAnimationActive={animate} animationDuration={300} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function groupContainerMetrics(raw: any[]): StatPoint[] {
  const groups: Record<string, Partial<StatPoint>> = {};
  for (const m of raw) {
    const t = m.time || new Date(m.recorded_at).toLocaleTimeString();
    if (!groups[t]) groups[t] = { time: t };
    const map: Record<string, keyof StatPoint> = { cpu: "cpu", memory: "memory", net_rx: "netRx", net_tx: "netTx" };
    const key = map[m.metric_name];
    if (key) groups[t][key] = m.value;
  }
  return Object.values(groups).map((g) => ({
    time: g.time || "", cpu: +(g.cpu || 0).toFixed(2), memory: +(g.memory || 0).toFixed(2), netRx: Math.round(g.netRx || 0), netTx: Math.round(g.netTx || 0),
  }));
}

function AreaTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-lg border border-gray-700 backdrop-blur-sm">
      <div className="text-gray-400 mb-0.5">{label}</div>
      <div className="font-semibold">{+(payload[0].value).toFixed(2)}{unit}</div>
    </div>
  );
}

function escapeHtml(text: string) {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
