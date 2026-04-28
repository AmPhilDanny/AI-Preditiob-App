'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Terminal, Globe, Lock, Database, Shield,
  CheckCircle, RefreshCcw, Plus, Trash2, Eye, EyeOff,
  Zap, Activity, History, Server, ChevronRight, AlertTriangle
} from 'lucide-react';

const tabs = [
  { id: 'agents',   label: 'Neural Agents',   icon: Cpu },
  { id: 'prompts',  label: 'Prompt Engine',   icon: Terminal },
  { id: 'scraping', label: 'Crawl Routes',    icon: Globe },
  { id: 'history',  label: 'Prediction Logs', icon: History },
  { id: 'security', label: 'Vault',           icon: Lock },
];

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function AdminPage() {
  const [active, setActive]   = useState('agents');
  const [config, setConfig]   = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [health, setHealth]   = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const [cr, hr, hr2] = await Promise.all([
        fetch('/api/admin/config'),
        fetch('/api/admin/history'),
        fetch('/api/admin/health'),
      ]);
      const [cfg, hist, hlth] = await Promise.all([cr.json(), hr.json(), hr2.json()]);
      setConfig(cfg);
      setHistory(Array.isArray(hist) ? hist : []);
      setHealth(hlth);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      fetch('/api/admin/health').then(r => r.json()).then(setHealth);
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

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

  /* ── Loading ── */
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading admin panel…</p>
      </div>
    );
  }

  const agents = [
    { name: 'Scraper Agent',   icon: Globe,        status: health?.status === 'online' ? 'online' : 'offline', load: '12%', color: 'text-cyan-500',    bg: 'bg-cyan-500/10' },
    { name: 'Analyst Agent',   icon: Terminal,      status: health?.status === 'online' ? 'online' : 'offline', load: '45%', color: 'text-violet-500',  bg: 'bg-violet-500/10' },
    { name: 'Validator Agent', icon: CheckCircle,   status: 'idle',                                              load: '0%',  color: 'text-muted-foreground', bg: 'bg-secondary' },
    { name: 'Health Agent',    icon: Shield,        status: 'online',                                            load: '5%',  color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-purple gap-2">
              <span className="dot-online" />
              Admin OS v4.2
            </span>
          </div>
          <h1 className="font-display text-3xl font-black text-foreground">Control Center</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage AI agents, prompts, scrapers, and system credentials.
          </p>
        </div>

        {active !== 'history' && (
          <button onClick={handleSave} disabled={saving} className="btn-primary shrink-0">
            {saving
              ? <RefreshCcw size={15} className="animate-spin" />
              : saved
              ? <CheckCircle size={15} />
              : <Zap size={15} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* ── Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0">
          <nav className="card-base p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
            {tabs.map(({ id, label, icon: Icon }) => (
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

          {/* System load card (desktop only) */}
          <div className="hidden lg:block card-base p-4 mt-4 space-y-3">
            <p className="section-label">System Status</p>
            <div className="flex items-center gap-2 text-sm">
              <span className={health?.status === 'online' ? 'dot-online' : 'dot-offline'} />
              <span className="font-medium text-foreground capitalize">{health?.status || '…'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Server size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">{health?.dbStatus === 'online' ? 'DB Connected' : 'DB Offline'}</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">

            {/* ── Agents ───────────────────────────────────────── */}
            {active === 'agents' && (
              <motion.div key="agents" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-6">

                {/* Agent grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {agents.map(({ name, icon: Icon, status, load, color, bg }) => (
                    <div key={name} className="card-base p-5 flex items-center gap-4">
                      <div className={`p-3 rounded-lg shrink-0 ${bg} ${color}`}>
                        <Icon size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={status === 'online' ? 'dot-online' : status === 'idle' ? 'dot-idle' : 'dot-offline'} />
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

                {/* Gateway status */}
                <div className="card-base overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                    <Activity size={16} className="text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">Neural Gateways</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {/* DB row */}
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database size={18} className="text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Neon PostgreSQL</p>
                          <p className="text-xs text-muted-foreground">Primary cluster</p>
                        </div>
                      </div>
                      <span className={health?.dbStatus === 'online' ? 'badge badge-green' : 'badge badge-red'}>
                        {health?.dbStatus || 'checking…'}
                      </span>
                    </div>
                    {/* AI providers */}
                    {config?.aiProviders && Object.entries(config.aiProviders).map(([id, p]: [string, any]) => (
                      <div key={id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Zap size={18} className="text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground capitalize">{id}</p>
                            <p className="text-xs text-muted-foreground">AI neural net</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={p.enabled ? 'badge badge-purple' : 'badge badge-gray'}>
                            {p.enabled ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => {
                              const u = { ...config.aiProviders };
                              u[id] = { ...u[id], enabled: !u[id].enabled };
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
              </motion.div>
            )}

            {/* ── Prompts ──────────────────────────────────────── */}
            {active === 'prompts' && (
              <motion.div key="prompts" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-6">
                <div className="card-base overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Terminal size={16} className="text-primary" />
                      Agent Behavior Patterns
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Configure how each agent reasons and responds.</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="section-label">Analyst Reasoning</label>
                        <span className="badge badge-purple">Gemini Optimised</span>
                      </div>
                      <textarea
                        rows={7}
                        className="form-textarea"
                        value={config?.agentPrompts?.analyst || ''}
                        onChange={e => setConfig({ ...config, agentPrompts: { ...config.agentPrompts, analyst: e.target.value } })}
                        placeholder="Define how the analyst agent reasons about match outcomes…"
                      />
                    </div>
                    <div>
                      <label className="section-label block mb-2">Scraper Heuristics</label>
                      <textarea
                        rows={4}
                        className="form-textarea"
                        value={config?.agentPrompts?.scraper || ''}
                        onChange={e => setConfig({ ...config, agentPrompts: { ...config.agentPrompts, scraper: e.target.value } })}
                        placeholder="Define how the scraper agent filters and normalises data…"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Scraping ─────────────────────────────────────── */}
            {active === 'scraping' && (
              <motion.div key="scraping" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-6">
                <div className="card-base overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Globe size={16} className="text-cyan-500" />
                      Crawl Targets
                    </h3>
                    <button
                      className="btn-primary text-xs px-3 py-1.5"
                      onClick={() => {
                        const url = prompt('Enter scraping URL:');
                        if (url) setConfig({ ...config, scrapingUrls: [...(config.scrapingUrls || []), url] });
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {config?.scrapingUrls?.length > 0 ? (
                    <div className="divide-y divide-border">
                      {config.scrapingUrls.map((url: string, i: number) => (
                        <div key={i} className="px-6 py-4 flex items-center gap-4">
                          <Globe size={16} className="text-muted-foreground shrink-0" />
                          <p className="text-sm text-foreground font-mono truncate flex-1">{url}</p>
                          <button
                            className="btn-icon shrink-0 hover:text-destructive hover:border-destructive/30"
                            onClick={() => setConfig({ ...config, scrapingUrls: config.scrapingUrls.filter((_: any, j: number) => j !== i) })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                      No crawl targets configured. Click "Add" to get started.
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
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <History size={16} className="text-emerald-500" />
                      Prediction Logs
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
                            <th>Actual Odds</th>
                            <th>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map(slip => (
                            <tr key={slip.id}>
                              <td className="text-xs font-mono text-muted-foreground">
                                {new Date(slip.createdAt).toLocaleString()}
                              </td>
                              <td>
                                <span className="badge badge-purple">{slip.targetOdds}×</span>
                              </td>
                              <td>
                                <span className="font-display font-bold text-foreground">{slip.totalOdds}</span>
                              </td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="progress-bar w-24">
                                    <div className="progress-fill" style={{ width: `${slip.confidence}%` }} />
                                  </div>
                                  <span className="text-sm font-semibold text-foreground">{slip.confidence}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                      No prediction history yet. Generate slips from the dashboard first.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Security ─────────────────────────────────────── */}
            {active === 'security' && (
              <motion.div key="security" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="space-y-6">

                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Credentials are encrypted at rest and never logged to client-side output.
                  </p>
                </div>

                <div className="card-base overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Lock size={16} className="text-primary" />
                      Credential Vault
                    </h3>
                  </div>
                  <div className="p-6 space-y-5">
                    {[
                      { id: 'football', label: 'Football-API Token',       value: config?.footballApiKey },
                      { id: 'gemini',   label: 'Gemini Neural Key',         value: config?.aiProviders?.gemini?.apiKey },
                      { id: 'db',       label: 'Neon DB Connection String', value: 'postgres://***@***.neon.tech/neondb' },
                    ].map(({ id, label, value }) => (
                      <div key={id}>
                        <label className="section-label block mb-2">{label}</label>
                        <div className="relative">
                          <input
                            type={showKey[id] ? 'text' : 'password'}
                            readOnly
                            value={value || '••••••••••••••••••••••••'}
                            className="form-input pr-12"
                          />
                          <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowKey(prev => ({ ...prev, [id]: !prev[id] }))}
                          >
                            {showKey[id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    ))}
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
