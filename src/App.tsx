import { useEffect, useState } from 'react';
import { CheckCircle2, Server, Terminal, Shield, RefreshCw } from 'lucide-react';

interface HealthData {
  status: string;
  runtime: string;
  framework: string;
  timestamp: string;
  kernelReady: boolean;
}

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data: HealthData = await res.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to server runtime');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 antialiased font-sans">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5 mb-6">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              OB / NBE Regulatory Reporting
            </h1>
            <p className="text-xs text-slate-400">
              Technical Landing Environment & Runtime Kernel
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6 p-4 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-slate-200">
                Landing Pad Active
              </span>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 px-2.5 rounded hover:bg-slate-700/50"
              title="Refresh health check"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Standing by for authoritative application package import.
          </p>
        </div>

        {/* Runtime Diagnostics */}
        <div className="space-y-3 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Runtime Diagnostics
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Server className="w-3.5 h-3.5" />
                <span>Backend Service</span>
              </div>
              <p className="font-mono text-emerald-400 font-medium">
                {error ? 'Degraded' : health?.status || (loading ? 'Probing...' : 'Offline')}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>Runtime</span>
              </div>
              <p className="font-mono text-slate-200">
                {health?.runtime || 'Node.js'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Client Architecture</span>
              </div>
              <p className="font-mono text-slate-200">React 19 + Vite</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>API Protocol</span>
              </div>
              <p className="font-mono text-slate-200">/api/health (200 OK)</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
              <span className="font-medium">Diagnostic Error:</span> {error}
            </div>
          )}
        </div>

        {/* Verification Status */}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Target: OB / NBE Import</span>
          <span>Timestamp: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Synchronizing...'}</span>
        </div>
      </div>
    </main>
  );
}
