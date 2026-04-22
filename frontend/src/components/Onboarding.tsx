import { useState, useEffect } from "react";
import { X, Container, Activity, Bell, Shield, ChevronRight, ChevronLeft, Check } from "lucide-react";

const steps = [
  {
    title: "Welcome to Docker Panel",
    description: "Your centralized Docker management dashboard. Let's show you around.",
    icon: Shield,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    title: "Containers",
    description: "View, start, stop, and manage all your containers. Check live stats, logs, and even open a terminal.",
    icon: Container,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    title: "Monitoring",
    description: "Track CPU, memory, and network usage in real-time. Set up alerts to get notified when things go wrong.",
    icon: Activity,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  {
    title: "Alerts & Security",
    description: "Configure alert rules, scan images for vulnerabilities, and review the audit log for compliance.",
    icon: Bell,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding_seen");
    if (!seen) setShow(true);
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem("onboarding_seen", "true");
  };

  if (!show) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-8">
        <button onClick={close} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className={`w-16 h-16 ${current.bg} rounded-2xl flex items-center justify-center mb-6`}>
          <Icon className={`w-8 h-8 ${current.color}`} />
        </div>

        <h2 className="text-2xl font-bold mb-2">{current.title}</h2>
        <p className="text-gray-500 mb-8">{current.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 px-4 py-2 border rounded-xl text-sm dark:border-gray-700">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={close} className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
                <Check className="w-4 h-4" /> Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
