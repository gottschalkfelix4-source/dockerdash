import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";
import ToastContainer from "../components/ToastContainer";
import GlobalSearch from "../components/GlobalSearch";
import KeyboardShortcuts from "../components/KeyboardShortcuts";
import Breadcrumbs from "../components/Breadcrumbs";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Container,
  Image,
  HardDrive,
  Network,
  Layers,
  LogOut,
  Menu,
  X,
  Shield,
  Sun,
  Moon,
  RefreshCw,
  Archive,
  Activity,
  ChevronRight,
  ChevronDown,
  Webhook,
  Scan,
  Folder,
  HelpCircle,
  Command,
  Zap,
  Calendar,
  ArrowLeftRight,
  Settings,
  Wrench,
} from "lucide-react";

// Primary navigation — always visible
const primaryNav = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { path: "/containers", label: "Containers", icon: Container, color: "text-emerald-500" },
  { path: "/images", label: "Images", icon: Image, color: "text-violet-500" },
  { path: "/volumes", label: "Volumes", icon: HardDrive, color: "text-amber-500" },
  { path: "/networks", label: "Networks", icon: Network, color: "text-rose-500" },
  { path: "/stacks", label: "Stacks", icon: Layers, color: "text-cyan-500" },
  { path: "/monitoring", label: "Monitoring", icon: Activity, color: "text-red-500" },
  { path: "/backups", label: "Backups", icon: Archive, color: "text-pink-500" },
];

// Tools submenu — collapsible
const toolsNav = [
  { path: "/updates", label: "Updates", icon: RefreshCw, color: "text-orange-500" },
  { path: "/scanner", label: "Scanner", icon: Scan, color: "text-teal-500" },
  { path: "/webhooks", label: "Webhooks", icon: Webhook, color: "text-purple-500" },
  { path: "/schedules", label: "Schedules", icon: Calendar, color: "text-teal-500" },
  { path: "/groups", label: "Groups", icon: Folder, color: "text-lime-500" },
  { path: "/migrate", label: "Migrate", icon: ArrowLeftRight, color: "text-rose-500" },
];

function isActive(path: string, location: string) {
  return location === path || location.startsWith(path + "/");
}

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  useEffect(() => {
    useThemeStore.getState().init();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        setShortcutsOpen(true);
      }
      if (e.key === "Escape") {
        setShortcutsOpen(false);
        setQuickActionsOpen(false);
      }
      if (e.key.toLowerCase() === "q" && !e.ctrlKey && !e.metaKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        setQuickActionsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderNavItem = (item: typeof primaryNav[0]) => {
    const active = isActive(item.path, location.pathname);
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
      >
        <item.icon className={`w-5 h-5 ${active ? item.color : ""} transition-colors`} />
        {item.label}
        {active && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Docker Panel
            </span>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
          {/* Primary */}
          {primaryNav.map(renderNavItem)}

          {/* Tools — collapsible */}
          <div className="pt-2">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                toolsNav.some((t) => isActive(t.path, location.pathname))
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60"
              }`}
            >
              <Wrench className="w-5 h-5" />
              <span>Tools</span>
              {toolsOpen ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
            {toolsOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-800 pl-2">
                {toolsNav.map((item) => {
                  const active = isActive(item.path, location.pathname);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${active ? item.color : ""}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settings */}
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive("/settings", location.pathname)
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Settings className={`w-5 h-5 ${isActive("/settings", location.pathname) ? "text-orange-500" : ""}`} />
            Settings
            {isActive("/settings", location.pathname) && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
          </Link>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="text-sm min-w-0">
              <div className="font-semibold truncate">{user?.username}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggle}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {dark ? "Light" : "Dark"}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <ToastContainer />
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Quick Actions Modal */}
      {quickActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={() => setQuickActionsOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-medium text-gray-500 mb-3">Quick Actions (press Q to toggle)</div>
            <div className="space-y-1">
              {[...primaryNav, ...toolsNav].map((a) => (
                <button
                  key={a.path}
                  onClick={() => { navigate(a.path); setQuickActionsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <a.icon className={`w-4 h-4 ${a.color}`} />
                  <span className="text-sm font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center px-4 lg:px-5 gap-3">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 mr-2 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h1 className="text-base font-bold">
              {[...primaryNav, ...toolsNav].find((i) => isActive(i.path, location.pathname))?.label ||
                (isActive("/settings", location.pathname) ? "Settings" : "Docker Panel")}
            </h1>
          </div>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setQuickActionsOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Command className="w-3 h-3" /> Q
            </button>
            <button
              onClick={() => setShortcutsOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <HelpCircle className="w-3 h-3" /> ?
            </button>
            <GlobalSearch />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
