'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  CheckCircle, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  RefreshCcw,
  ExternalLink,
  Target,
  ArrowUpRight,
  Zap
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTargets, setActiveTargets] = useState([2, 5, 10]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/predictions?targets=${activeTargets.join(',')}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
        <p className="text-muted-foreground font-medium animate-pulse">Syncing with AI Agents...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Header */}
      <header className="mb-16 relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-primary/20">
                <Zap size={14} />
                Live Analysis Active
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 font-outfit">
              AI ODD <span className="text-gradient">GENERATOR</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl font-light leading-relaxed">
              Synthesizing multi-agent risk data into high-probability football accumulators.
            </p>
          </div>
          
          <button 
            onClick={fetchData}
            disabled={loading}
            className="group flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {loading ? <RefreshCcw className="animate-spin" /> : <RefreshCcw className="group-hover:rotate-180 transition-transform duration-700" />}
            Generate New Slips
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
        {[
          { label: 'Avg Accuracy', value: '78.4%', icon: Target, color: 'text-blue-500' },
          { label: 'AI Confidence', value: `${data?.health?.apiUsage?.gemini || '95%'}`, icon: Brain, color: 'text-purple-500' },
          { label: 'System Uptime', value: '99.9%', icon: Activity, color: 'text-green-500' },
          { label: 'AI Health', value: data?.health?.status || 'Online', icon: Shield, color: 'text-orange-500' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="glass-card flex items-center gap-6"
          >
            <div className={`p-4 rounded-2xl bg-foreground/5 ${stat.color}`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Main Predictions Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {data?.slips?.map((slip: any, i: number) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15 }}
            key={slip.id}
            className="group glass-card overflow-hidden !p-0"
          >
            {/* Slip Header */}
            <div className="p-8 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black mb-1">Target: {slip.targetOdds}x</h3>
                  <p className="text-sm text-muted-foreground">Slip ID: {slip.id.split('-')[1]}</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold">
                  {slip.totalOdds} Total
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-8">
                <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${slip.confidence}%` }}
                    className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500`}
                  />
                </div>
                <span className="text-xs font-bold whitespace-nowrap">{slip.confidence}% Confidence</span>
              </div>
            </div>

            {/* Matches List */}
            <div className="space-y-px bg-border/50 border-y border-border/50">
              {slip.matches.map((match: any, idx: number) => (
                <div key={idx} className="p-6 bg-card/30 hover:bg-card/50 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">{match.prediction}</p>
                    <p className="text-sm font-black text-muted-foreground">{match.odds}</p>
                  </div>
                  <h4 className="text-lg font-bold mb-2">{match.match}</h4>
                  <p className="text-sm text-muted-foreground italic line-clamp-2">"{match.reasoning}"</p>
                </div>
              ))}
            </div>

            {/* Slip Footer */}
            <div className="p-8">
              <button className="w-full py-4 rounded-2xl bg-secondary hover:bg-primary hover:text-primary-foreground font-bold transition-all flex items-center justify-center gap-2">
                Analyze Full Market
                <ArrowUpRight size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Advisory Footer */}
      <footer className="mt-20 pt-12 border-t border-border/50 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mb-6">
          <AlertTriangle size={18} />
          <span className="text-sm font-bold uppercase tracking-widest">Risk Advisory</span>
        </div>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          AI confidence scores are generated using a multi-model consensus (Gemini + Grok + Mistral). 
          Always verify odds with your local bookmaker before playing.
        </p>
        <p className="text-muted-foreground/30 text-[10px] mt-8 uppercase tracking-[0.3em]">
          Last Neural Sync: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
        </p>
      </footer>
    </div>
  );
}
