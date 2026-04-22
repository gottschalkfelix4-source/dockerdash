import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const pathMap: Record<string, string> = {
  "": "Dashboard",
  containers: "Containers",
  images: "Images",
  volumes: "Volumes",
  networks: "Networks",
  stacks: "Stacks",
  updates: "Updates",
  backups: "Backups",
  monitoring: "Monitoring",
  settings: "Settings",
  alerts: "Alerts",
  webhooks: "Webhooks",
  scanner: "Scanner",
  swarm: "Swarm",
  contexts: "Contexts",
  auditlog: "Audit Log",
  apikeys: "API Keys",
  sessions: "Sessions",
  groups: "Groups",
};

export default function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  if (parts.length <= 1 && location.pathname === "/") return null;

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm text-gray-500 ml-4">
      <Link to="/" className="hover:text-blue-600 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        const path = "/" + parts.slice(0, i + 1).join("/");
        const label = pathMap[part] || part.slice(0, 12);
        return (
          <div key={part + i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-gray-300" />
            {isLast ? (
              <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
            ) : (
              <Link to={path} className="hover:text-blue-600 transition-colors">{label}</Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
