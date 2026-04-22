import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useToastStore } from "../stores/toastStore";
import {
  Settings,
  Users,
  Database,
  Shield,
  Save,
  Bell,
  Globe,
  Server,
  Folder,
  ArrowLeftRight,
  HardDrive,
  Webhook,
  Scan,
  Calendar,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

type TabKey = "general" | "users" | "registry" | "s3";

interface SettingsCard {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  to: string;
}

const configCards: SettingsCard[] = [
  {
    title: "Alerts & Notifications",
    description: "Alert rules, thresholds, and notification channels",
    icon: Bell,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    to: "/alerts",
  },
  {
    title: "Security",
    description: "API keys, sessions, audit log, and environment roles",
    icon: Shield,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    to: "/apikeys",
  },
  {
    title: "Docker Contexts",
    description: "Manage multi-host Docker connections",
    icon: Globe,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    to: "/contexts",
  },
  {
    title: "Swarm",
    description: "Swarm nodes and services management",
    icon: Server,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    to: "/swarm",
  },
  {
    title: "Scanner",
    description: "Vulnerability scanning configuration",
    icon: Scan,
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    to: "/scanner",
  },
  {
    title: "Webhooks",
    description: "Incoming and outgoing webhook setup",
    icon: Webhook,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    to: "/webhooks",
  },
  {
    title: "Schedules",
    description: "Cron jobs, auto-backup and auto-update tasks",
    icon: Calendar,
    color: "text-lime-500",
    bg: "bg-lime-50 dark:bg-lime-900/20",
    to: "/schedules",
  },
  {
    title: "Migration",
    description: "Import stacks from Portainer or filesystem",
    icon: ArrowLeftRight,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    to: "/migrate",
  },
  {
    title: "Groups & Favorites",
    description: "Organize containers with groups and favorites",
    icon: Folder,
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    to: "/groups",
  },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("general");
  const addToast = useToastStore((s) => s.addToast);
  const [registry, setRegistry] = useState({ name: "", url: "", username: "", password: "" });
  const [s3, setS3] = useState({ name: "", endpoint: "", region: "us-east-1", bucket: "", access_key: "", secret_key: "", prefix: "", path_style: false });

  const saveRegistry = async () => {
    try {
      await apiFetch("/registries", { method: "POST", body: JSON.stringify(registry) });
      addToast("Registry saved", "success");
      setRegistry({ name: "", url: "", username: "", password: "" });
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const saveS3 = async () => {
    try {
      await apiFetch("/s3configs", { method: "POST", body: JSON.stringify(s3) });
      addToast("S3 destination saved", "success");
      setS3({ name: "", endpoint: "", region: "us-east-1", bucket: "", access_key: "", secret_key: "", prefix: "", path_style: false });
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-gray-500">Configure your Docker Panel instance</p>
      </div>

      {/* Configuration Hub */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Configuration Hub</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {configCards.map((card) => (
            <Link
              key={card.title}
              to={card.to}
              className="group flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
            >
              <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold truncate">{card.title}</span>
                  <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{card.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 self-center group-hover:text-gray-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-fit">
        {[
          { key: "general" as TabKey, label: "General", icon: Settings },
          { key: "users" as TabKey, label: "Users", icon: Users },
          { key: "registry" as TabKey, label: "Registries", icon: Database },
          { key: "s3" as TabKey, label: "S3 Destinations", icon: HardDrive },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === "general" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <Settings className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold">General Settings</h3>
              <p className="text-sm text-gray-500">Basic configuration options</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Panel Name</label>
              <input type="text" defaultValue="Docker Panel" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm">
                <option>UTC</option>
                <option>Europe/Berlin</option>
                <option>America/New_York</option>
                <option>Asia/Tokyo</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
            <div>
              <div className="font-medium">Auto-refresh</div>
              <div className="text-sm text-gray-500">Automatically refresh container list</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
            <div>
              <div className="font-medium">Compact Mode</div>
              <div className="text-sm text-gray-500">Reduce padding for denser layouts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold">User Management</h3>
              <p className="text-sm text-gray-500">Manage access to Docker Panel</p>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>User management coming soon</p>
            <p className="text-xs mt-1">Use the Security card above for API keys and sessions</p>
          </div>
        </div>
      )}

      {/* Registries */}
      {tab === "registry" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <Database className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold">Docker Registries</h3>
              <p className="text-sm text-gray-500">Add private registry credentials</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={registry.name} onChange={(e) => setRegistry({ ...registry, name: e.target.value })} placeholder="My Registry" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input value={registry.url} onChange={(e) => setRegistry({ ...registry, url: e.target.value })} placeholder="https://registry.example.com" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input value={registry.username} onChange={(e) => setRegistry({ ...registry, username: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password / Token</label>
              <input type="password" value={registry.password} onChange={(e) => setRegistry({ ...registry, password: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
          </div>
          <button onClick={saveRegistry} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Save Registry
          </button>
        </div>
      )}

      {/* S3 Destinations */}
      {tab === "s3" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold">S3 Backup Destinations</h3>
              <p className="text-sm text-gray-500">Configure S3-compatible storage for backups</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={s3.name} onChange={(e) => setS3({ ...s3, name: e.target.value })} placeholder="My S3" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Endpoint</label>
              <input value={s3.endpoint} onChange={(e) => setS3({ ...s3, endpoint: e.target.value })} placeholder="https://s3.amazonaws.com" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Region</label>
              <input value={s3.region} onChange={(e) => setS3({ ...s3, region: e.target.value })} placeholder="us-east-1" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bucket</label>
              <input value={s3.bucket} onChange={(e) => setS3({ ...s3, bucket: e.target.value })} placeholder="my-bucket" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Access Key</label>
              <input value={s3.access_key} onChange={(e) => setS3({ ...s3, access_key: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret Key</label>
              <input type="password" value={s3.secret_key} onChange={(e) => setS3({ ...s3, secret_key: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prefix (optional)</label>
              <input value={s3.prefix} onChange={(e) => setS3({ ...s3, prefix: e.target.value })} placeholder="backups/" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={s3.path_style} onChange={(e) => setS3({ ...s3, path_style: e.target.checked })} id="pathStyle" className="rounded" />
              <label htmlFor="pathStyle" className="text-sm">Path-style addressing (for MinIO / self-hosted S3)</label>
            </div>
          </div>
          <button onClick={saveS3} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Save Destination
          </button>
        </div>
      )}
    </div>
  );
}
