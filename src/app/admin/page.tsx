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
  EyeOff,
  Zap,
  LayoutGrid,
  History,
  Workflow
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
    { name: 'Scraper Agent', status: health?.status === 'online' ? 'Active' : 'Offline', load: '12%', color: 'text-blue-400', icon: Globe },
    { name: 'Analyst Agent', status: health?.status === 'online' ? 'Active' : 'Offline', load: '45%', color: 'text-purple-400', icon: Terminal },
    { name: 'Validator Agent', status: 'Idle', load: '0%', color: 'text-emerald-400', icon: CheckCircle },
    { name: 'Health Agent', status: 'Active', load: '5%', color: 'text-orange-400', icon: Shield },
  ];

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 premium-gradient rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/40"
        >
          <Workflow className="text-white" size={32} />
        </motion.div>
        <p className="text-muted-foreground font-black tracking-[0.4em] text-[10px] uppercase">Authenticating Core...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-32 pt-12">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Navigation Sidebar */}
        <aside className="lg:w-80 shrink-0">
          <div className="glass-card !p-8 sticky top-32">
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-primary fill-primary" size={20} />
                <h1 className="text-2xl font-black font-outfit tracking-tighter">ADMIN<span className="text-primary">OS</span></h1>
              </div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">Neural Command v4.2</p>
            </div>

            <nav className="space-y-2">
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
                  className={`w-full flex items-center justify-between px-6 py-5 rounded-[1.5rem] text-xs font-black transition-all group ${
                    activeTab === item.id 
                      ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-primary transition-colors'} />
                    <span className="uppercase tracking-widest">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className={activeTab === item.id ? 'opacity-100' : 'opacity-0'} />
                </button>
              ))}
            </nav>
            
            <div className="mt-12 pt-12 border-t border-white/5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <LayoutGrid className="text-muted-foreground" size={24} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">System Load</p>
                  <p className="text-xl font-black font-outfit">1.25 TFLOPS</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Interface */}
        <main className="flex-1">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Authenticated Management</span>
              </div>
              <h2 className="text-5xl font-black tracking-tighter capitalize font-outfit leading-none">{activeTab.replace('-', ' ')}</h2>
              <p className="text-muted-foreground mt-4 font-medium max-w-md">Real-time control over the neural betting infrastructure and agent parameters.</p>
            </div>
            
            {activeTab !== 'history' && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-10 py-5 bg-primary text-white hover:scale-105 active:scale-95 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-[0_20px_40px_-10px_rgba(139,92,246,0.4)] disabled:opacity-50"
              >
                {isSaving ? <RefreshCcw className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
                Sync Configuration
              </button>
            )}
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'agents' && (
              <motion.div
                key="agents"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {agents.map((agent, i) => (
                    <div key={agent.name} className="glass-card flex items-center justify-between group border-white/10 hover:border-primary/40">
                      <div className="flex items-center gap-8">
                        <div className={`p-6 rounded-[2rem] bg-white/5 ${agent.color} group-hover:scale-110 transition-transform duration-500`}>
                          <agent.icon size={32} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black font-outfit tracking-tighter">{agent.name}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <div className={`w-2 h-2 rounded-full ${agent.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{agent.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-widest">Network Load</p>
                        <p className="text-3xl font-black font-outfit">{agent.load}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass-card !p-12">
                  <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Activity className="text-primary" size={24} />
                    </div>
                    <h3 className="text-3xl font-black font-outfit tracking-tighter">Neural Gateway Status</h3>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-white/5 border border-white/5 group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-6">
                        <div className={`w-4 h-4 rounded-full ${health?.dbStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-black text-xl font-outfit tracking-tight">Neon PostgreSQL Cluster</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Status: {health?.dbStatus || 'Checking...'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Connected</p>
                      </div>
                    </div>

                    {Object.entries(config.aiProviders).map(([id, provider]: [string, any]) => (
                      <div key={id} className="flex items-center justify-between p-8 rounded-[2.5rem] bg-white/5 border border-white/5 group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-6">
                          <div className={`w-4 h-4 rounded-full ${provider.enabled ? 'bg-primary shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-muted'}`} />
                          <div>
                            <p className="font-black text-xl font-outfit tracking-tight capitalize">{id} Neural Net</p>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">API Integration: {provider.status === 'online' ? 'Verified' : 'Pending'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const updated = { ...config.aiProviders };
                            updated[id].enabled = !updated[id].enabled;
                            setConfig({ ...config, aiProviders: updated });
                          }}
                          className={`px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all ${
                            provider.enabled ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white/5 text-muted-foreground'
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="glass-card !p-12">
                  <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                      <Terminal className="text-purple-400" size={24} />
                    </div>
                    <h3 className="text-3xl font-black font-outfit tracking-tighter">Behavior Patterns</h3>
                  </div>
                  
                  <div className="space-y-12">
                    <div className="group">
                      <div className="flex items-center justify-between mb-6">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Analyst Reasoning Logic</label>
                        <span className="text-[9px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary/20">Optimized</span>
                      </div>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[250px] leading-relaxed resize-none"
                        value={config.agentPrompts.analyst}
                        onChange={(e) => setConfig({
                          ...config,
                          agentPrompts: { ...config.agentPrompts, analyst: e.target.value }
                        })}
                      />
                    </div>
                    
                    <div className="group">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 block">Scraper Heuristics</label>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[150px] leading-relaxed resize-none"
                        value={config.agentPrompts.scraper}
                        onChange={(e) => setConfig({
                          ...config,
                          agentPrompts: { ...config.agentPrompts, scraper: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'scraping' && (
              <motion.div
                key="scraping"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="glass-card !p-12">
                  <div className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                        <Globe className="text-blue-400" size={24} />
                      </div>
                      <h3 className="text-3xl font-black font-outfit tracking-tighter">Crawl Targets</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const url = prompt('Enter scraping URL:');
                        if (url) setConfig({ ...config, scrapingUrls: [...config.scrapingUrls, url] });
                      }}
                      className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20"
                    >
                      <Plus size={18} />
                      Add Target
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {config.scrapingUrls.map((url: string, i: number) => (
                      <div key={i} className="flex items-center justify-between p-8 rounded-[2rem] bg-white/5 border border-white/5 group hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-6">
                          <div className="p-4 rounded-2xl bg-blue-400/10 text-blue-400">
                            <Globe size={22} />
                          </div>
                          <span className="text-sm font-mono font-bold tracking-tight">{url}</span>
                        </div>
                        <button 
                          onClick={() => setConfig({
                            ...config,
                            scrapingUrls: config.scrapingUrls.filter((_: any, idx: number) => idx !== i)
                          })}
                          className="p-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all"
                        >
                          <Trash2 size={20} />
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="glass-card !p-12">
                  <div className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <History className="text-emerald-400" size={24} />
                      </div>
                      <h3 className="text-3xl font-black font-outfit tracking-tighter">Neural Logs</h3>
                    </div>
                    <button 
                      onClick={() => fetchData()}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <RefreshCcw size={20} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="pb-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Timestamp</th>
                          <th className="pb-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Target</th>
                          <th className="pb-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Resultant</th>
                          <th className="pb-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Confidence</th>
                          <th className="pb-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {history.map((slip) => (
                          <tr key={slip.id} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="py-8 font-mono text-xs font-bold text-muted-foreground">{new Date(slip.createdAt).toLocaleString()}</td>
                            <td className="py-8">
                              <span className="text-lg font-black font-outfit tracking-tight">{slip.targetOdds}X</span>
                            </td>
                            <td className="py-8">
                              <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black tracking-tight border border-primary/20">{slip.totalOdds} ODDS</span>
                            </td>
                            <td className="py-8">
                              <div className="flex items-center gap-4">
                                <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${slip.confidence}%` }} />
                                </div>
                                <span className="text-xs font-black">{slip.confidence}%</span>
                              </div>
                            </td>
                            <td className="py-8 text-right">
                              <button className="p-4 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-2xl transition-all">
                                <Eye size={20} />
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="glass-card !p-12">
                  <div className="flex items-center gap-4 mb-16">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                      <Lock className="text-orange-400" size={24} />
                    </div>
                    <h3 className="text-3xl font-black font-outfit tracking-tighter">Vault Access</h3>
                  </div>
                  
                  <div className="space-y-12">
                    {[
                      { id: 'football', label: 'Market API Key', value: config.footballApiKey },
                      { id: 'gemini', label: 'Neural Engine Key', value: config.aiProviders.gemini.apiKey },
                      { id: 'database', label: 'Postgres Connection', value: 'CLUSTER_SECURED_ENDPOINT' },
                    ].map((key) => (
                      <div key={key.id}>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 block">{key.label}</label>
                        <div className="relative group/vault">
                          <input 
                            type={showKeys[key.id] ? 'text' : 'password'} 
                            readOnly
                            className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-sm font-mono tracking-tight group-hover/vault:border-primary/30 transition-all pr-24"
                            value={key.value || '••••••••••••••••••••••••••••'}
                          />
                          <button 
                            onClick={() => toggleKey(key.id)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 p-4 text-muted-foreground hover:text-primary transition-all"
                          >
                            {showKeys[key.id] ? <EyeOff size={22} /> : <Eye size={22} />}
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
