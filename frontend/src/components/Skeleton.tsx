export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
      <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="ml-auto w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${80 + Math.random() * 20}%` }} />
      ))}
    </div>
  );
}
