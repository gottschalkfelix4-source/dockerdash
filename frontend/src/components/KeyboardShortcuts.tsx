import { X, Command, Search, ArrowLeft, RefreshCw, Sun, Bell, HelpCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "?", description: "Show this help", icon: HelpCircle },
  { key: "Cmd/Ctrl + K", description: "Global search", icon: Search },
  { key: "Q", description: "Quick actions", icon: Command },
  { key: "Esc", description: "Close modals", icon: X },
  { key: "R", description: "Refresh data", icon: RefreshCw },
  { key: "D", description: "Toggle dark mode", icon: Sun },
  { key: "N", description: "Notifications", icon: Bell },
  { key: "← / →", description: "Navigate pages", icon: ArrowLeft },
];

export default function KeyboardShortcuts({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <s.icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{s.description}</span>
              </div>
              <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
