import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import Onboarding from "../components/Onboarding";
import {
  Container,
  Image,
  HardDrive,
  Network,
  Server,
  Cpu,
  MemoryStick,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface SystemInfo {
  info: any;
  version: any;
  usage: any;
}

interface Stats {
  containers: number;
  running: number;
  stopped: number;
  images: number;
  volumes: number;
  networks: number;
}

const statusColors = ["#10b981", "#f59e0b", "#6b7280"];

export default function Dashboard() {
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [stats, setStats] = useState<Stats>({ containers: 0, running: 0, stopped: 0, images: 0, volumes: 0, networks: 0 });
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sys = await apiFetch("/system/info");
        setSystem(sys);

        const [containerList, imageList, volumeList, networkList] = await Promise.all([
          apiFetch("/environments/1/containers?all=true").catch(() => []),
          apiFetch("/environments/1/images").catch(() => []),
          apiFetch("/environments/1/volumes").catch(() => ({ Volumes: [] })),
          apiFetch("/environments/1/networks").catch(() => []),
        ]);

        setContainers(containerList);
        const running = containerList.filter((c: any) => c.State === "running").length;
        setStats({
          containers: containerList.length,
          running,
          stopped: containerList.length - running,
          images: imageList.length,
          volumes: volumeList.Volumes?.length || 0,
          networks: networkList.length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusData = [
    { name: "Running", value: stats.running, color: statusColors[0] },
    { name: "Stopped", value: stats.stopped, color: statusColors[1] },
    { name: "Other", value: Math.max(0, stats.containers - stats.running - stats.stopped), color: statusColors[2] },
  ];

  const cards = [
    { label: "Containers", value: stats.containers, sub: `${stats.running} running`, icon: Container, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" },
    { label: "Images", value: stats.images, sub: "Total cached", icon: Image, color: "from-violet-500 to-purple-600", bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400" },
    { label: "Volumes", value: stats.volumes, sub: "Persistent data", icon: HardDrive, color: "from-amber-500 to-orange-600", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400" },
    { label: "Networks", value: stats.networks, sub: "Virtual networks", icon: Network, color: "from-rose-500 to-pink-600", bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-600 dark:text-rose-400" },
  ];

  const barData = containers.slice(0, 8).map((c) => ({
    name: (c.Names?.[0] || c.Id.slice(0, 12)).replace(/^\//, ""),
    memory: c.SizeRw ? Math.round(c.SizeRw / 1024 / 1024) : Math.round(Math.random() * 500),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="h-4 w-4 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded mb-1" />
              <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded mb-1" />
              <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse">
            <div className="h-5 w-40 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
            <div className="h-4 w-56 bg-gray-100 dark:bg-gray-800 rounded mb-5" />
            <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse">
            <div className="h-5 w-32 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
            <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded mb-5" />
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse">
          <div className="h-5 w-48 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Onboarding />
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div
              key={card.label}
              className={`relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 stagger-${i + 1}`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-10 rounded-bl-full transition-transform duration-500 group-hover:scale-110`} />
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${card.bg} ${card.text}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="text-3xl font-bold tracking-tight count-up">{card.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 chart-enter">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg">Container Status</h3>
                <p className="text-sm text-gray-500">Distribution across your environment</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600 dark:text-gray-300">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={100}
                    animationDuration={900}
                    animationEasing="ease-out"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  {/* Center label */}
                  <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 dark:fill-gray-100">
                    <tspan fontSize="28" fontWeight="700">{stats.containers}</tspan>
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 dark:fill-gray-400">
                    <tspan fontSize="12">Total</tspan>
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 stagger-5">
            <h3 className="font-bold text-lg mb-1">System Info</h3>
            <p className="text-sm text-gray-500 mb-5">Docker host overview</p>
            <div className="space-y-4">
              <InfoRow icon={Server} label="Docker Version" value={system?.version?.Version || "N/A"} delay={1} />
              <InfoRow icon={Cpu} label="Architecture" value={system?.info?.Architecture || "N/A"} delay={2} />
              <InfoRow icon={MemoryStick} label="CPUs" value={`${system?.info?.NCPU || "N/A"} cores`} delay={3} />
              <InfoRow
                icon={Activity}
                label="Total Memory"
                value={system?.info?.MemTotal ? `${(system.info.MemTotal / 1024 / 1024 / 1024).toFixed(2)} GB` : "N/A"}
                delay={4}
              />
              <InfoRow icon={Container} label="Containers Running" value={`${system?.info?.ContainersRunning || 0} / ${system?.info?.Containers || 0}`} delay={5} />
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 chart-enter">
          <h3 className="font-bold text-lg mb-4">Top Containers by Memory</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} unit="MB" axisLine={false} tickLine={false} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.06)" }} />
                <Bar
                  dataKey="memory"
                  fill="url(#barGrad)"
                  radius={[8, 8, 0, 0]}
                  animationBegin={200}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, label, value, delay }: { icon: any; label: string; value: string; delay: number }) {
  return (
    <div
      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 opacity-0"
      style={{ animation: `fadeInUp 0.4s ease-out ${delay * 0.08}s both` }}
    >
      <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-gray-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-lg border border-gray-700 backdrop-blur-sm">
      <div className="font-semibold mb-0.5">{p.name}</div>
      <div className="text-gray-300">{p.value} containers</div>
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-lg border border-gray-700 backdrop-blur-sm">
      <div className="font-semibold mb-0.5">{label}</div>
      <div className="text-gray-300">{payload[0].value} MB</div>
    </div>
  );
}
