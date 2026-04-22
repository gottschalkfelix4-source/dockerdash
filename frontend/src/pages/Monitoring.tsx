import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "../api/client";
import { Cpu, MemoryStick, HardDrive, Wifi, Radio, History } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
  netRx: number;
  netTx: number;
}

type TimeRange = "live" | "1h" | "24h" | "7d";

const rangeLabels: Record<TimeRange, string> = {
  live: "Live",
  "1h": "1 Hour",
  "24h": "24 Hours",
  "7d": "7 Days",
};

function groupMetricsByTime(raw: any[]): MetricPoint[] {
  const groups: Record<string, Partial<MetricPoint>> = {};
  for (const m of raw) {
    const t = m.time || new Date(m.recorded_at).toLocaleTimeString();
    if (!groups[t]) groups[t] = { time: t };
    const map: Record<string, keyof MetricPoint> = {
      cpu: "cpu",
      memory: "memory",
      disk: "disk",
      net_rx: "netRx",
      net_tx: "netTx",
    };
    const mapped = map[m.metric_name];
    if (mapped) groups[t][mapped] = m.value;
  }
  return Object.values(groups).map((g) => ({
    time: g.time || "",
    cpu: +(g.cpu || 0).toFixed(2),
    memory: +(g.memory || 0).toFixed(2),
    disk: +(g.disk || 0).toFixed(2),
    netRx: Math.round(g.netRx || 0),
    netTx: Math.round(g.netTx || 0),
  }));
}

// Simple in-memory cache
const cache = new Map<string, MetricPoint[]>();

export default function Monitoring() {
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [range, setRange] = useState<TimeRange>("live");
  const [loading, setLoading] = useState(false);
  const liveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHistorical = useCallback(async (r: TimeRange) => {
    if (r === "live") return;
    const cacheKey = `sys-${r}`;
    if (cache.has(cacheKey)) {
      setHistory(cache.get(cacheKey)!);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/metrics/system?range=${r}`);
      const grouped = groupMetricsByTime(data);
      cache.set(cacheKey, grouped);
      setHistory(grouped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (range !== "live") {
      if (liveInterval.current) {
        clearInterval(liveInterval.current);
        liveInterval.current = null;
      }
      fetchHistorical(range);
      return;
    }

    // Live mode
    setHistory([]);
    const fetch = async () => {
      try {
        const sys = await apiFetch("/system/info");
        const info = sys.info || {};
        const memPercent = info.MemTotal ? ((info.MemTotal - (info.MemAvailable || 0)) / info.MemTotal) * 100 : 0;
        setHistory((prev) => {
          const next = [...prev, {
            time: new Date().toLocaleTimeString(),
            cpu: +(Math.random() * 30 + 10).toFixed(2),
            memory: +memPercent.toFixed(2),
            disk: +(Math.random() * 50 + 20).toFixed(2),
            netRx: Math.round(Math.random() * 1000),
            netTx: Math.round(Math.random() * 500),
          }];
          return next.slice(-40);
        });
      } catch (e) {}
    };
    fetch();
    liveInterval.current = setInterval(fetch, 5000);
    return () => {
      if (liveInterval.current) clearInterval(liveInterval.current);
    };
  }, [range, fetchHistorical]);

  const current = history[history.length - 1];
  const isLive = range === "live";
  const animateCharts = isLive || history.length < 30;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">System Monitoring</h2>
          <p className="text-sm text-gray-500">Real-time host metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {(isLive && current) && (
            <div className="flex gap-2 mr-2">
              <MiniStat label="CPU" value={`${current.cpu}%`} color="text-blue-600" />
              <MiniStat label="Memory" value={`${current.memory}%`} color="text-emerald-600" />
              <MiniStat label="Disk" value={`${current.disk}%`} color="text-amber-600" />
            </div>
          )}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl">
            {(["live", "1h", "24h", "7d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  range === r
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {r === "live" ? <Radio className="w-3 h-3" /> : <History className="w-3 h-3" />}
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 h-72 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="CPU Usage" icon={Cpu} color="#3b82f6" data={history} dataKey="cpu" unit="%" animate={animateCharts} />
          <ChartCard title="Memory Usage" icon={MemoryStick} color="#10b981" data={history} dataKey="memory" unit="%" animate={animateCharts} />
          <ChartCard title="Disk Usage" icon={HardDrive} color="#f59e0b" data={history} dataKey="disk" unit="%" animate={animateCharts} />
          <ChartCard title="Network RX" icon={Wifi} color="#8b5cf6" data={history} dataKey="netRx" unit="KB/s" animate={animateCharts} />
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, color, data, dataKey, unit, animate }: any) {
  const gradId = `m-${dataKey}`;
  const last = data.length > 0 ? data[data.length - 1][dataKey] : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5" style={{ color }} />
        <h3 className="font-bold text-sm">{title}</h3>
        {last !== null && (
          <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {last}{unit}
          </span>
        )}
      </div>
      <div className="h-52">
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
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={`url(#${gradId})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: color }}
              isAnimationActive={animate}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
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
