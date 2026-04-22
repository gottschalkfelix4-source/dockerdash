import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Container, Image, HardDrive, Network, Layers } from "lucide-react";
import { apiFetch } from "../api/client";

interface SearchResult {
  type: "container" | "image" | "volume" | "network" | "stack";
  id: string;
  name: string;
  extra?: string;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const fetch = async () => {
      try {
        const [containers, images, volumes, networks] = await Promise.all([
          apiFetch("/environments/1/containers?all=true").catch(() => []),
          apiFetch("/environments/1/images").catch(() => []),
          apiFetch("/environments/1/volumes").catch(() => ({ Volumes: [] })),
          apiFetch("/environments/1/networks").catch(() => []),
        ]);

        const res: SearchResult[] = [];
        containers.forEach((c: any) => {
          const name = c.Names?.[0]?.replace(/^\//, "") || c.Id.slice(0, 12);
          if (name.toLowerCase().includes(q) || c.Image.toLowerCase().includes(q)) {
            res.push({ type: "container", id: c.Id, name, extra: c.Image });
          }
        });
        images.forEach((i: any) => {
          const tag = i.RepoTags?.[0] || "<none>";
          if (tag.toLowerCase().includes(q)) {
            res.push({ type: "image", id: i.Id, name: tag });
          }
        });
        volumes.Volumes?.forEach((v: any) => {
          if (v.Name.toLowerCase().includes(q)) {
            res.push({ type: "volume", id: v.Name, name: v.Name });
          }
        });
        networks.forEach((n: any) => {
          if (n.Name.toLowerCase().includes(q)) {
            res.push({ type: "network", id: n.Id, name: n.Name });
          }
        });
        setResults(res.slice(0, 10));
        setSelected(0);
      } catch (e) {}
    };
    fetch();
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    if (r.type === "container") navigate(`/containers/${r.id}`);
    else if (r.type === "image") navigate("/images");
    else if (r.type === "volume") navigate("/volumes");
    else if (r.type === "network") navigate("/networks");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selected]) {
      handleSelect(results[selected]);
    }
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">Search...</span>
      <span className="hidden md:inline text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">Ctrl K</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search containers, images, volumes, networks..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-auto py-2">
          {results.length === 0 && query && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No results found</div>
          )}
          {results.map((r, i) => {
            const icons = { container: Container, image: Image, volume: HardDrive, network: Network, stack: Layers };
            const Icon = icons[r.type];
            const active = i === selected;
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/60"}`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-gray-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  {r.extra && <div className="text-xs text-gray-500 truncate">{r.extra}</div>}
                </div>
                <span className="text-xs text-gray-400 capitalize">{r.type}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
