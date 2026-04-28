'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Lock
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('agents');
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => setConfig(data));
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

  const agents = [
    { name: 'Scraper Agent', status: 'Active', load: '12%', color: 'text-blue-400', icon: Globe },
    { name: 'Analyst Agent', status: 'Active', load: '45%', color: 'text-purple-400', icon: Terminal },
    { name: 'Validator Agent', status: 'Idle', load: '0%', color: 'text-green-400', icon: CheckCircle },
    { name: 'Health Agent', status: 'Active', load: '5%', color: 'text-orange-400', icon: Shield },
  ];

  if (!config) return <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-gray-500 font-mono">LOADING SYSTEM CONFIG...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Sidebar */}
      <div className="flex">
        <aside className="w-64 border-r border-white/5 h-screen sticky top-0 p-6 hidden lg:block">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Shield size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Admin OS</h1>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'agents', label: 'Agent Control', icon: Activity },
              { id: 'config', label: 'System Config', icon: Settings },
              { id: 'scraping', label: 'Data Sources', icon: Globe },
              { id: 'security', label: 'API Security', icon: Lock },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <header className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold">System Management</h2>
              <p className="text-gray-400 mt-1">Real-time control center for prediction agents.</p>
            </div>
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {isSaving ? <RefreshCcw className="animate-spin" size={18} /> : 'Save Changes'}
            </button>
          </header>

          {activeTab === 'agents' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {agents.map((agent, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={agent.name}
                    className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-3 rounded-2xl bg-white/5 ${agent.color}`}>
                        <agent.icon size={24} />
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {agent.status}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-1">{agent.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">Resource Load: {agent.load}</p>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${agent.color.replace('text', 'bg')}`} 
                        style={{ width: agent.load }} 
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Terminal size={20} className="text-purple-400" />
                    Agent Prompt Control
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Analyst System Instructions</label>
                      <textarea 
                        className="w-full bg-[#0A0A0B] border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none min-h-[150px]"
                        value={config.agentPrompts.analyst}
                        onChange={(e) => setConfig({
                          ...config,
                          agentPrompts: { ...config.agentPrompts, analyst: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Scraper Crawl Strategy</label>
                      <textarea 
                        className="w-full bg-[#0A0A0B] border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none min-h-[100px]"
                        value={config.agentPrompts.scraper}
                        onChange={(e) => setConfig({
                          ...config,
                          agentPrompts: { ...config.agentPrompts, scraper: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-blue-400" />
                    AI Provider Health
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(config.aiProviders).map(([id, provider]: [string, any]) => (
                      <div key={id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${provider.enabled ? 'bg-green-500' : 'bg-gray-600'}`} />
                          <div>
                            <p className="font-bold capitalize">{id}</p>
                            <p className="text-[10px] text-gray-500">Status: {provider.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              const updated = { ...config.aiProviders };
                              updated[id].enabled = !updated[id].enabled;
                              setConfig({ ...config, aiProviders: updated });
                            }}
                            className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${provider.enabled ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}
                          >
                            {provider.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scraping' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Target Data Sources</h3>
                  <button 
                    onClick={() => {
                      const url = prompt('Enter scraping URL:');
                      if (url) setConfig({ ...config, scrapingUrls: [...config.scrapingUrls, url] });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
                  >
                    <Plus size={16} />
                    Add URL
                  </button>
                </div>
                
                <div className="space-y-4">
                  {config.scrapingUrls.map((url: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#0A0A0B] border border-white/5">
                      <div className="flex items-center gap-3">
                        <Globe size={18} className="text-blue-400" />
                        <span className="text-sm font-mono">{url}</span>
                      </div>
                      <button 
                        onClick={() => setConfig({
                          ...config,
                          scrapingUrls: config.scrapingUrls.filter((_: any, idx: number) => idx !== i)
                        })}
                        className="text-gray-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-white/5">
                  <h4 className="text-sm font-bold mb-4">Crawler Strategy</h4>
                  <div className="flex gap-4">
                    <button className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold">Deep Crawl (API + Scraping)</button>
                    <button className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-gray-400">Fast Sync (API Only)</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
             <div className="space-y-6 max-w-3xl">
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                  <h3 className="text-xl font-bold mb-6">Credential Vault</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Football-API Key (RapidAPI)</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          className="w-full bg-[#0A0A0B] border border-white/10 rounded-2xl p-4 text-sm pr-12"
                          defaultValue="••••••••••••••••••••••••••••"
                        />
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <Shield size={18} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Gemini AI Key</label>
                      <input 
                        type="password" 
                        className="w-full bg-[#0A0A0B] border border-white/10 rounded-2xl p-4 text-sm"
                        defaultValue="••••••••••••••••••••••••••••"
                      />
                    </div>
                  </div>
                </div>
             </div>
          )}
        </main>
      </div>
    </div>
  );
}
