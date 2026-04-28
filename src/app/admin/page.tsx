'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Terminal, Globe, Lock, Database, Shield,
  CheckCircle, RefreshCcw, Plus, Trash2, Eye, EyeOff,
  Zap, Activity, History, Server, LogOut, AlertTriangle,
  Loader2, Play, Check, X, Brain
} from 'lucide-react';

const TABS = [
  { id: 'agents',   label: 'Neural Agents',   icon: Cpu },
  { id: 'prompts',  label: 'Prompt Engine',   icon: Terminal },
  { id: 'scraping', label: 'Crawl Routes',    icon: Globe },
  { id: 'history',  label: 'Prediction Logs', icon: History },
  { id: 'security', label: 'Vault',           icon: Lock },
];

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function AdminPage() {
  const router = useRouter();

  const [active,   setActive]   = useState('agents');
  const [config,   setConfig]   = useState<any>(null);
  const [history,  setHistory]  = useState<any[]>([]);
  const [health,   setHealth]   = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [showKey,  setShowKey]  = useState<Record<string, boolean>>({});
  const [testing,  setTesting]  = useState<Record<string, boolean>>({});
  const [testRes,  setTestRes]  = useState<Record<string, { success: boolean; msg: string }>>({});

  /* ── Single combined fetch ───────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/overview');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setConfig(data.config);
      setHistory(Array.isArray(data.history) ? data.history : []);
      setHealth(data.health);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      fetch('/api/admin/health').then(r => r.json()).then(setHealth);
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  /* ── Save config ─────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  /* ── Logout ──────────────────────────────────────────────── */
  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  /* ── Test Connection ─────────────────────────────────────── */
  const testConnection = async (type: string, provider: string, apiKey: string) => {
    const id = `${type}-${provider}`;
    setTesting(prev => ({ ...prev, [id]: true }));
    setTestRes(prev => {
      const u = { ...prev };
      delete u[id];
      return u;
    });

    try {
      const res = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, provider, apiKey }),
      });
      const data = await res.json();
      setTestRes(prev => ({ ...prev, [id]: { success: data.success, msg: data.success ? data.message : data.error } }));
    } catch (e: any) {
      setTestRes(prev => ({ ...prev, [id]: { success: false, msg: e.message } }));
    } finally {
      setTesting(prev => ({ ...prev, [id]: false }));
    }
  };

  /* ── Update Slip Status ──────────────────────────────────── */
  const updateSlipStatus = async (id: string, status: string) => {
    // In a real app, this would hit an API to update the slip outcome
    setHistory(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  /* ── Loading state ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading admin panel…</p>
      </div>
    );
  }

  const agents = [
    { name: 'Scraper Agent',   icon: Globe,        status: health?.status === 'healthy' ? 'online' : 'offline', load: '12%', color: 'text-cyan-500',    bg: 'bg-cyan-500/10' },
    { name: 'Analyst Agent',   icon: Terminal,      status: health?.status === 'healthy' ? 'online' : 'offline', load: '45%', color: 'text-violet-500',  bg: 'bg-violet-500/10' },
    { name: 'Validator Agent', icon: CheckCircle,   status: 'idle',    load: '0%',  color: 'text-muted-foreground', bg: 'bg-secondary' },
    { name: 'Health Agent',    icon: Shield,        status: 'online',  load: '5%',  color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-purple gap-2">
              <span className="dot-online" />
              Admin OS v4.5
            </span>
          </div>
          <h1 className="font-display text-3xl font-black text-foreground">Control Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage AI consensus, data providers, and system intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {active !== 'history' && (
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving
                ? <Loader2 size={15} className="animate-spin" />
                : saved
                ? <CheckCircle size={15} />
                : <Zap size={15} />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="btn-ghost flex items-center gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>

      {/* ── Layout ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0 space-y-3">
          <nav className="card-base p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={active === id ? 'sidebar-item-active' : 'sidebar-item'}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          {/* Status card — desktop */}
          <div className="hidden lg:block card-base p-4 space-y-3">
            <p className="section-label">System Status</p>
            <div className="flex items-center gap-2 text-sm">
              <span className={health?.database === 'online' ? 'dot-online' : 'dot-offline'} />
              <span className="font-medium text-foreground capitalize">
                {health?.status || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server size={14} className="shrink-0" />
              {health?.database === 'online' ? 'DB Connected' : 'DB Offline'}
            </div>
            <div className="pt-2 border-t border-border">
              <button onClick={load} className="btn-ghost w-full text-xs gap-2 py-1.5">
                <RefreshCcw size={13} /> Refresh
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">

            {/* ── Agents ───────────────────────────────────────── */}
            {active === 'agents' && (
              <motion.div key="agents" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {agents.map(({ name, icon: Icon, status, load, color, bg }) => (
                    <div key={name} className="card-base p-5 flex items-center gap-4">
                      <div className={`p-3 rounded-lg shrink-0 ${bg} ${color}`}>
                        <Icon size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={
                            status === 'online' ? 'dot-online' :
                            status === 'idle'   ? 'dot-idle'   : 'dot-offline'
                          } />
                          <span className="text-xs text-muted-foreground capitalize">{status}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="section-label mb-0.5">Load</p>
                        <p className="font-display font-black text-lg text-foreground">{load}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gateways */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* AI Gateways */}
                  <div className="card-base overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                      <Activity size={16} className="text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">Neural AI Gateways</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {config?.aiProviders && Object.entries(config.aiProviders).map(([id, p]: [string, any]) => (
                        <div key={id} className="px-6 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Zap size={18} className="text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground capitalize">{id}</p>
                              <p className="text-xs text-muted-foreground truncate">AI provider</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={p.enabled ? 'badge badge-purple' : 'badge badge-gray'}>
                              {p.enabled ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => {
                                const u = { ...config.aiProviders, [id]: { ...p, enabled: !p.enabled } };
                                setConfig({ ...config, aiProviders: u });
                              }}
                              className="btn-ghost text-xs px-3 py-1"
                            >
                              Toggle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Football Data Gateways */}
                  <div className="card-base overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                      <Globe size={16} className="text-cyan-500" />
                      <h3 className="font-semibold text-sm text-foreground">Football Data Gateways</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {config?.footballApis && Object.entries(config.footballApis).map(([id, p]: [string, any]) => (
                        <div key={id} className="px-6 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Database size={18} className="text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground capitalize">{id.replace('api', 'Provider ')}</p>
                              <p className="text-xs text-muted-foreground truncate">External API</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={p.enabled ? 'badge badge-purple' : 'badge badge-gray'}>
                              {p.enabled ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => {
                                const u = { ...config.footballApis };
                                // Ensure only one is enabled if preferred, or just toggle
                                Object.keys(u).forEach(key => u[key].enabled = false);
                                u[id].enabled = true;
                                setConfig({ ...config, footballApis: u });
                              }}
                              className="btn-ghost text-xs px-3 py-1"
                            >
                              Enable
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Prompts ──────────────────────────────────────── */}
            {active === 'prompts' && (
              <motion.div key="prompts" variants={fadeIn} initial="hidden" animate="show" exit="hidden">
                <div className="card-base overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Terminal size={16} className="text-primary" /> Agent Behavior Patterns
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      These prompts control how each AI agent reasons and responds.
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="section-label">Analyst Reasoning</label>
                        <span className="badge badge-purple">AI Optimised</span>
                      </div>
                      <textarea
                        rows={8}
                        className="form-textarea"
                        value={config?.agentPrompts?.analyst || ''}
                        onChange={e => setConfig({
                          ...config,
                          agentPrompts: { ...config.agentPrompts, analyst: e.target.value }
                        })}
                        placeholder="Define how the analyst agent reasons about match outcomes…"
                      />
                    </div>
                    <div>
                      <label className="section-label block mb-2">Scraper Heuristics</label>
                      <textarea
                        rows={4}
                        className="form-textarea"
                        value={config?.agentPrompts?.scraper || ''}
                        onChange={e => setConfig({
                          ...config,
                          agentPrompts: { ...config.agentPrompts, scraper: e.target.value }
                        })}
                        placeholder="Define how the scraper agent filters and normalises data…"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Scraping ─────────────────────────────────────── */}
            {active === 'scraping' && (
              <motion.div key="scraping" variants={fadeIn} initial="hidden" animate="show" exit="hidden">
                <div className="card-base overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Globe size={16} className="text-cyan-500" /> Crawl Targets
                    </h3>
                    <button
                      className="btn-primary text-xs px-3 py-1.5"
                      onClick={() => {
                        const url = prompt('Enter target URL:');
                        if (url?.trim()) {
                          setConfig({ ...config, scrapingUrls: [...(config.scrapingUrls || []), url.trim()] });
                        }
                      }}
                    >
                      <Plus size={14} /> Add URL
                    </button>
                  </div>

                  {(config?.scrapingUrls?.length ?? 0) > 0 ? (
                    <div className="divide-y divide-border">
                      {config.scrapingUrls.map((url: string, i: number) => (
                        <div key={i} className="px-6 py-4 flex items-center gap-4">
                          <Globe size={16} className="text-muted-foreground shrink-0" />
                          <p className="text-sm text-foreground font-mono truncate flex-1">{url}</p>
                          <button
                            className="btn-icon shrink-0 hover:text-destructive hover:border-destructive/30"
                            onClick={() => setConfig({
                              ...config,
                              scrapingUrls: config.scrapingUrls.filter((_: any, j: number) => j !== i)
                            })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                      No crawl targets configured. Click "Add URL" to get started.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── History ──────────────────────────────────────── */}
            {active === 'history' && (
              <motion.div key="history" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-6">
                <div className="card-base overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <History size={16} className="text-emerald-500" />
                      Prediction Performance & Learning
                      {history.length > 0 && (
                        <span className="badge badge-green">{history.length}</span>
                      )}
                    </h3>
                    <button className="btn-icon" onClick={load}>
                      <RefreshCcw size={14} />
                    </button>
                  </div>

                  {history.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Target</th>
                            <th>Confidence</th>
                            <th>Outcome</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map(slip => (
                            <tr key={slip.id}>
                              <td className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                {new Date(slip.createdAt).toLocaleString()}
                              </td>
                              <td>
                                <span className="badge badge-purple">{slip.targetOdds}×</span>
                              </td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="progress-bar w-16">
                                    <div className="progress-fill" style={{ width: `${slip.confidence}%` }} />
                                  </div>
                                  <span className="text-xs font-semibold text-foreground">{slip.confidence}%</span>
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${
                                  slip.status === 'WON' ? 'badge-green' :
                                  slip.status === 'LOST' ? 'badge-red' : 'badge-amber'
                                }`}>
                                  {slip.status || 'PENDING'}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateSlipStatus(slip.id, 'WON')}
                                    className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                    title="Mark as Won"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => updateSlipStatus(slip.id, 'LOST')}
                                    className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                    title="Mark as Lost"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                      No prediction history yet. Generate slips from the dashboard to see logs here.
                    </div>
                  )}
                </div>

                <div className="card-base p-6 bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Brain size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Self-Learning Active</h4>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        By marking outcomes above, you provide vital feedback to the neural agents. 
                        The Analyst Agent automatically adjusts weights for the next generation based on your actual win/loss data.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Security ─────────────────────────────────────── */}
            {active === 'security' && (
              <motion.div key="security" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Security Notice</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                      Credentials are encrypted. Test connections after updating to ensure the system remains operational.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Football APIs */}
                  <div className="card-base overflow-hidden h-fit">
                    <div className="px-6 py-4 border-b border-border">
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <Globe size={16} className="text-cyan-500" /> Football Data Vault
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      {['api1', 'api2', 'api3'].map(id => (
                        <div key={id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="section-label capitalize">{id.replace('api', 'Provider ')} Key</label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => testConnection('football', id, config?.footballApis?.[id]?.apiKey)}
                                disabled={testing[`football-${id}`] || !config?.footballApis?.[id]?.apiKey}
                                className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border border-border hover:border-primary transition-colors flex items-center gap-1.5"
                              >
                                {testing[`football-${id}`] ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                Test
                              </button>
                              {testRes[`football-${id}`] && (
                                <span className={`text-[10px] font-bold ${testRes[`football-${id}`].success ? 'text-emerald-500' : 'text-destructive'}`}>
                                  {testRes[`football-${id}`].success ? 'PASS' : 'FAIL'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <input
                              type={showKey[`football-${id}`] ? 'text' : 'password'}
                              value={config?.footballApis?.[id]?.apiKey || ''}
                              onChange={e => {
                                const u = { ...config.footballApis, [id]: { ...config.footballApis[id], apiKey: e.target.value } };
                                setConfig({ ...config, footballApis: u });
                              }}
                              className="form-input pr-10 text-xs"
                              placeholder="Provider API Key"
                            />
                            <button
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setShowKey(prev => ({ ...prev, [`football-${id}`]: !prev[`football-${id}`] }))}
                            >
                              {showKey[`football-${id}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {testRes[`football-${id}`] && !testRes[`football-${id}`].success && (
                            <p className="text-[10px] text-destructive mt-1">{testRes[`football-${id}`].msg}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI APIs */}
                  <div className="card-base overflow-hidden h-fit">
                    <div className="px-6 py-4 border-b border-border">
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <Zap size={16} className="text-primary" /> Neural Intelligence Vault
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      {['gemini', 'grok', 'mistral'].map(id => (
                        <div key={id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="section-label capitalize">{id} Access Key</label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => testConnection('ai', id, config?.aiProviders?.[id]?.apiKey)}
                                disabled={testing[`ai-${id}`] || !config?.aiProviders?.[id]?.apiKey}
                                className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border border-border hover:border-primary transition-colors flex items-center gap-1.5"
                              >
                                {testing[`ai-${id}`] ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                Test
                              </button>
                              {testRes[`ai-${id}`] && (
                                <span className={`text-[10px] font-bold ${testRes[`ai-${id}`].success ? 'text-emerald-500' : 'text-destructive'}`}>
                                  {testRes[`ai-${id}`].success ? 'PASS' : 'FAIL'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <input
                              type={showKey[id] ? 'text' : 'password'}
                              value={config?.aiProviders?.[id]?.apiKey || ''}
                              onChange={e => {
                                const u = { ...config.aiProviders, [id]: { ...config.aiProviders[id], apiKey: e.target.value } };
                                setConfig({ ...config, aiProviders: u });
                              }}
                              className="form-input pr-10 text-xs"
                              placeholder={`${id} Neural Key`}
                            />
                            <button
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setShowKey(prev => ({ ...prev, [id]: !prev[id] }))}
                            >
                              {showKey[id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {testRes[`ai-${id}`] && !testRes[`ai-${id}`].success && (
                            <p className="text-[10px] text-destructive mt-1">{testRes[`ai-${id}`].msg}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
