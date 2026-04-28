'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Shield, 
  Activity, 
  Globe, 
  Terminal, 
  CheckCircle, 
  AlertCircle, 
  RefreshCcw,
  Plus,
  Trash2,
  Lock,
  Cpu,
  Database,
  Cloud,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('agents');
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    try {
      const [configRes, historyRes, healthRes] = await Promise.all([
        fetch('/api/admin/config'),
        fetch('/api/admin/history'),
        fetch('/api/admin/health')
      ]);
      
      const [configData, historyData, healthData] = await Promise.all([
        configRes.json(),
        historyRes.json(),
        healthRes.json()
      ]);

      setConfig(configData);
      setHistory(historyData);
      setHealth(healthData);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll health every 30 seconds
    const interval = setInterval(() => {
      fetch('/api/admin/health')
        .then(res => res.json())
        .then(data => setHealth(data));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const toggleKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const agents = [
    { name: 'Scraper Agent', status: health?.status === 'online' ? 'Active' : 'Offline', load: '12%', color: 'text-blue-500', icon: Globe },
    { name: 'Analyst Agent', status: health?.status === 'online' ? 'Active' : 'Offline', load: '45%', color: 'text-purple-500', icon: Terminal },
    { name: 'Validator Agent', status: 'Idle', load: '0%', color: 'text-green-500', icon: CheckCircle },
    { name: 'Health Agent', status: 'Active', load: '5%', color: 'text-orange-500', icon: Shield },
  ];

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-mono">AUTHORIZING SYSTEM ACCESS...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Navigation Sidebar */}
        <aside className="lg:w-72 space-y-2">
          <div className="mb-10 px-4">
            <h1 className="text-2xl font-black font-outfit tracking-tight">Admin <span className="text-primary">OS</span></h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">Core Command Center</p>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'agents', label: 'Neural Agents', icon: Cpu },
              { id: 'config', label: 'Prompt Engine', icon: Terminal },
              { id: 'scraping', label: 'Crawl Routes', icon: Globe },
              { id: 'history', label: 'Prediction Logs', icon: Database },
              { id: 'security', label: 'Vault Access', icon: Lock },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  {item.label}
                </div>
                <ChevronRight size={16} className={activeTab === item.id ? 'opacity-100' : 'opacity-0'} />
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Interface */}
        <main className="flex-1">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-4xl font-black tracking-tight capitalize font-outfit">{activeTab.replace('-', ' ')}</h2>
              <p className="text-muted-foreground mt-1">Modify core system parameters and monitor agent health.</p>
            </div>
            {activeTab !== 'history' && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 bg-primary text-primary-foreground hover:scale-105 active:scale-95 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-xl shadow-primary/20 disabled:opacity-50"
              >
                {isSaving ? <RefreshCcw className="animate-spin" size={18} /> : 'Synchronize Config'}
              </button>
            )}
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'agents' && (
              <motion.div
                key="agents"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agents.map((agent, i) => (
                    <div key={agent.name} className="glass-card flex items-center justify-between group">
                      <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl bg-foreground/5 ${agent.color}`}>
                          <agent.icon size={28} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black">{agent.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${agent.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
                            <span className="text-xs font-bold text-muted-foreground uppercase">{agent.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-widest">Load</p>
                        <p className="text-xl font-black">{agent.load}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass-card">
                  <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <Activity size={24} className="text-primary" />
                    Neural Gateway Status
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${health?.dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-bold text-lg">Neon PostgreSQL</p>
                          <p className="text-xs font-medium text-muted-foreground">Status: {health?.dbStatus || 'Checking...'}</p>
                        </div>
                      </div>
                    </div>
                    {Object.entries(config.aiProviders).map(([id, provider]: [string, any]) => (
                      <div key={id} className="flex items-center justify-between p-6 rounded-2xl bg-secondary/30 border border-border/50">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${provider.enabled ? 'bg-green-500' : 'bg-muted'}`} />
                          <div>
                            <p className="font-bold capitalize text-lg">{id}</p>
                            <p className="text-xs font-medium text-muted-foreground">Gateway: {provider.status === 'online' ? 'Connected' : 'Dormant'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const updated = { ...config.aiProviders };
                            updated[id].enabled = !updated[id].enabled;
                            setConfig({ ...config, aiProviders: updated });
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            provider.enabled ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {provider.enabled ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass-card">
                  <div className="flex items-center gap-3 mb-8">
                    <Terminal size={24} className="text-purple-500" />
                    <h3 className="text-xl font-black">Agent Behavior Patterns</h3>
                  </div>
                  
                  <div className="space-y-10">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Analyst Logical Foundation</label>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">GPT-4o Optimized</span>
                      </div>
                      <textarea 
                        className="w-full bg-secondary/50 border border-border/50 rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[180px] leading-relaxed"
                        value={config.agentPrompts.analyst}
                        onChange={(e) => setConfig({
                          ...config,
                          agentPrompts: { ...config.agentPrompts, analyst: e.target.value }
                        })}
                        placeholder="Define the core reasoning logic for the prediction agent..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 block">Scraper Extraction Heuristics</label>
                      <textarea 
                        className="w-full bg-secondary/50 border border-border/50 rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[120px] leading-relaxed"
                        value={config.agentPrompts.scraper}
                        onChange={(e) => setConfig({
                          ...config,
                          agentPrompts: { ...config.agentPrompts, scraper: e.target.value }
                        })}
                        placeholder="Define how data should be filtered and normalized..."
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'scraping' && (
              <motion.div
                key="scraping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass-card">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                      <Globe size={24} className="text-blue-500" />
                      <h3 className="text-xl font-black">Crawl Targets</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const url = prompt('Enter scraping URL:');
                        if (url) setConfig({ ...config, scrapingUrls: [...config.scrapingUrls, url] });
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-black transition-all"
                    >
                      <Plus size={16} />
                      ADD TARGET
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {config.scrapingUrls.map((url: string, i: number) => (
                      <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-secondary/30 border border-border/50 group">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                            <Globe size={18} />
                          </div>
                          <span className="text-sm font-mono font-medium truncate max-w-md">{url}</span>
                        </div>
                        <button 
                          onClick={() => setConfig({
                            ...config,
                            scrapingUrls: config.scrapingUrls.filter((_: any, idx: number) => idx !== i)
                          })}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass-card">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <Database size={24} className="text-green-500" />
                      <h3 className="text-xl font-black">Neural Prediction Logs</h3>
                    </div>
                    <button 
                      onClick={() => fetchData()}
                      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
                    >
                      <RefreshCcw size={18} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="pb-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Timestamp</th>
                          <th className="pb-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Target</th>
                          <th className="pb-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Actual Odds</th>
                          <th className="pb-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Confidence</th>
                          <th className="pb-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {history.map((slip) => (
                          <tr key={slip.id} className="group hover:bg-foreground/[0.02] transition-colors">
                            <td className="py-4 font-mono text-xs">{new Date(slip.createdAt).toLocaleString()}</td>
                            <td className="py-4 font-bold">{slip.targetOdds}x</td>
                            <td className="py-4">
                              <span className="px-2 py-1 rounded bg-primary/5 text-primary text-xs font-bold">{slip.totalOdds}</span>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${slip.confidence}%` }} />
                                </div>
                                <span className="text-xs font-bold">{slip.confidence}%</span>
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <button className="p-2 text-muted-foreground hover:text-primary transition-all">
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass-card">
                  <div className="flex items-center gap-3 mb-10">
                    <Lock size={24} className="text-orange-500" />
                    <h3 className="text-xl font-black">Credential Vault</h3>
                  </div>
                  
                  <div className="space-y-8">
                    {[
                      { id: 'football', label: 'Football-API Access Token', value: config.footballApiKey },
                      { id: 'gemini', label: 'Gemini AI Neural Key', value: config.aiProviders.gemini.apiKey },
                      { id: 'database', label: 'Neon Database Primary Key', value: 'DB_CONNECTION_SECURED' },
                    ].map((key) => (
                      <div key={key.id}>
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 block">{key.label}</label>
                        <div className="relative">
                          <input 
                            type={showKeys[key.id] ? 'text' : 'password'} 
                            readOnly
                            className="w-full bg-secondary/50 border border-border/50 rounded-2xl p-5 text-sm font-mono pr-14"
                            value={key.value || '••••••••••••••••••••••••••••'}
                          />
                          <button 
                            onClick={() => toggleKey(key.id)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-all"
                          >
                            {showKeys[key.id] ? <EyeOff size={18} /> : <Eye size={18} />}
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
