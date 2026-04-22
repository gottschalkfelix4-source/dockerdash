import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";

// Lazy-load all pages for code-splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Containers = lazy(() => import("./pages/Containers"));
const Images = lazy(() => import("./pages/Images"));
const Volumes = lazy(() => import("./pages/Volumes"));
const Networks = lazy(() => import("./pages/Networks"));
const Stacks = lazy(() => import("./pages/Stacks"));
const ContainerDetail = lazy(() => import("./pages/ContainerDetail"));
const Updates = lazy(() => import("./pages/Updates"));
const Backups = lazy(() => import("./pages/Backups"));
const Monitoring = lazy(() => import("./pages/Monitoring"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Alerts = lazy(() => import("./pages/Alerts"));
const WebhooksPage = lazy(() => import("./pages/Webhooks"));
const Scanner = lazy(() => import("./pages/Scanner"));
const Swarm = lazy(() => import("./pages/Swarm"));
const Contexts = lazy(() => import("./pages/Contexts"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Groups = lazy(() => import("./pages/Groups"));
const Schedules = lazy(() => import("./pages/Schedules"));
const Migrate = lazy(() => import("./pages/Migrate"));

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3" />
            <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded mb-1" />
            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
      <div className="h-80 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="h-5 w-32 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
        <div className="h-60 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)();
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense>} />
        <Route path="containers" element={<Suspense fallback={<PageSkeleton />}><Containers /></Suspense>} />
        <Route path="containers/:cid" element={<Suspense fallback={<PageSkeleton />}><ContainerDetail /></Suspense>} />
        <Route path="images" element={<Suspense fallback={<PageSkeleton />}><Images /></Suspense>} />
        <Route path="volumes" element={<Suspense fallback={<PageSkeleton />}><Volumes /></Suspense>} />
        <Route path="networks" element={<Suspense fallback={<PageSkeleton />}><Networks /></Suspense>} />
        <Route path="stacks" element={<Suspense fallback={<PageSkeleton />}><Stacks /></Suspense>} />
        <Route path="updates" element={<Suspense fallback={<PageSkeleton />}><Updates /></Suspense>} />
        <Route path="backups" element={<Suspense fallback={<PageSkeleton />}><Backups /></Suspense>} />
        <Route path="monitoring" element={<Suspense fallback={<PageSkeleton />}><Monitoring /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageSkeleton />}><SettingsPage /></Suspense>} />
        <Route path="alerts" element={<Suspense fallback={<PageSkeleton />}><Alerts /></Suspense>} />
        <Route path="webhooks" element={<Suspense fallback={<PageSkeleton />}><WebhooksPage /></Suspense>} />
        <Route path="scanner" element={<Suspense fallback={<PageSkeleton />}><Scanner /></Suspense>} />
        <Route path="swarm" element={<Suspense fallback={<PageSkeleton />}><Swarm /></Suspense>} />
        <Route path="contexts" element={<Suspense fallback={<PageSkeleton />}><Contexts /></Suspense>} />
        <Route path="auditlog" element={<Suspense fallback={<PageSkeleton />}><AuditLog /></Suspense>} />
        <Route path="apikeys" element={<Suspense fallback={<PageSkeleton />}><ApiKeys /></Suspense>} />
        <Route path="sessions" element={<Suspense fallback={<PageSkeleton />}><Sessions /></Suspense>} />
        <Route path="groups" element={<Suspense fallback={<PageSkeleton />}><Groups /></Suspense>} />
        <Route path="schedules" element={<Suspense fallback={<PageSkeleton />}><Schedules /></Suspense>} />
        <Route path="migrate" element={<Suspense fallback={<PageSkeleton />}><Migrate /></Suspense>} />
      </Route>
    </Routes>
  );
}

export default App;
