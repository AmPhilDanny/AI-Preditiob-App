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
  Zap,
  ChevronRight,
  Cpu,
  Trophy
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 border-2 border-primary/20 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 w-24 h-24 border-t-2 border-primary rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="text-primary animate-pulse" size={32} />
          </div>
        </div>
        <p className="text-muted-foreground font-bold tracking-[0.2em] text-xs uppercase animate-pulse">Syncing Neural Agents...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      {/* Hero Header */}
      <header className="mb-24 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="px-5 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border border-primary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                Live Market Analysis
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 font-outfit">
              AI-POWERED <br />
              <span className="text-gradient">PREDICTIONS</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg font-medium leading-relaxed mb-10">
              Unlocking market inefficiencies through multi-agent neural consensus. High-probability football accumulators generated in real-time.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={fetchData}
                disabled={loading}
                className="group relative px-8 py-4 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(139,92,246,0.5)] disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
                <div className="relative flex items-center gap-3">
                  {loading ? <RefreshCcw className="animate-spin" size={18} /> : <Zap size={18} className="fill-white" />}
                  Generate New Slips
                </div>
              </button>
              <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-3xl font-black text-sm uppercase tracking-widest transition-all">
                System Health
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
            <div className="glass-card !p-12 relative z-10 border-white/20">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-2xl font-black mb-1">Neural Node 01</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Consensus</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Cpu className="text-primary" size={24} />
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Market Depth', value: '92%', width: 'w-[92%]' },
                  { label: 'Risk Factor', value: 'Low', width: 'w-[15%]' },
                  { label: 'Agent Sync', value: 'Active', width: 'w-[100%]' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3">
                      <span>{item.label}</span>
                      <span className="text-primary">{item.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full bg-primary rounded-full ${item.width}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-24">
        {[
          { label: 'Avg Accuracy', value: '78.4%', icon: Target, color: 'text-blue-400' },
          { label: 'AI Confidence', value: `${data?.health?.apiUsage?.gemini || '95%'}`, icon: Brain, color: 'text-purple-400' },
          { label: 'Live Models', value: '3 Active', icon: Activity, color: 'text-emerald-400' },
          { label: 'Win Rate', value: '84%', icon: Trophy, color: 'text-orange-400' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="glass-card flex items-center gap-6 group hover:border-primary/50"
          >
            <div className={`p-4 rounded-3xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform duration-500`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-2xl font-black font-outfit">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Main Predictions Grid */}
      <section className="space-y-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-4xl font-black font-outfit tracking-tighter">PREMIUM <span className="text-primary">SLIPS</span></h2>
            <p className="text-muted-foreground font-medium mt-2">Latest high-probability neural consensus.</p>
          </div>
          <div className="flex gap-2">
            {[2, 5, 10].map(t => (
              <button 
                key={t}
                onClick={() => setActiveTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTargets.includes(t) ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground border border-white/5'
                }`}
              >
                {t}X ODDS
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {data?.slips?.map((slip: any, i: number) => (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              key={slip.id}
              className="group glass-card !p-0 overflow-hidden border-white/10 hover:border-primary/40 shadow-none hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]"
            >
              <div className="p-10 pb-6 relative">
                <div className="absolute top-0 right-0 p-8">
                  <div className="w-16 h-16 rounded-full border border-primary/20 flex items-center justify-center">
                    <span className="text-xl font-black font-outfit text-primary">{slip.totalOdds}x</span>
                  </div>
                </div>
                
                <h3 className="text-3xl font-black font-outfit tracking-tighter mb-2">TARGET {slip.targetOdds}X</h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  SLIP ID: {slip.id.split('-')[1]}
                </p>

                <div className="space-y-2 mb-8">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>AI Confidence</span>
                    <span>{slip.confidence}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${slip.confidence}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-px bg-white/5">
                {slip.matches.map((match: any, idx: number) => (
                  <div key={idx} className="p-8 bg-card/20 hover:bg-card/40 transition-all group/match border-t border-white/5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">{match.prediction}</p>
                        <h4 className="text-xl font-black font-outfit leading-tight">{match.match}</h4>
                      </div>
                      <span className="text-lg font-black text-muted-foreground">{match.odds}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium italic opacity-60 line-clamp-2 group-hover/match:opacity-100 transition-opacity">
                      "{match.reasoning}"
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-10 pt-6">
                <button className="w-full py-5 rounded-3xl bg-white/5 hover:bg-primary hover:text-white border border-white/10 hover:border-primary font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group/btn shadow-none hover:shadow-[0_20px_40px_-10px_rgba(139,92,246,0.3)]">
                  Deep Market Analysis
                  <ArrowUpRight size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Advisory Footer */}
      <footer className="mt-32 pt-16 border-t border-white/5 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-destructive/10 text-destructive border border-destructive/20 mb-8">
          <AlertTriangle size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Risk Advisory Protocol</span>
        </div>
        
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed font-medium">
          Neural betting models synthesize historical performance with real-time scraping data. 
          Past performance does not guarantee future results. Play responsibly.
        </p>
        
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Neural Sync v4.2.0</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">IAD-NODE-01</span>
          </div>
          <p className="text-muted-foreground/20 text-[9px] uppercase tracking-[0.5em]">
            Last Sync: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
          </p>
        </div>
      </footer>
    </div>
  );
}
