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
  Target
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

  const stats = [
    { label: 'Avg Accuracy', value: '78.4%', icon: TrendingUp, color: 'text-blue-400' },
    { label: 'Target Odds', value: activeTargets.join(', '), icon: Target, color: 'text-purple-400' },
    { label: 'System Uptime', value: '99.9%', icon: Activity, color: 'text-green-400' },
    { label: 'AI Health', value: data?.health?.status || 'Online', icon: Shield, color: 'text-orange-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tighter bg-gradient-to-r from-white via-blue-400 to-gray-500 bg-clip-text text-transparent">
            AI ODD GENERATOR
          </h1>
          <p className="text-gray-400 mt-2 font-medium">Multi-agent risk analysis & accumulator synthesis.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20"
          >
            {loading ? <RefreshCcw className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
            Generate New Slips
          </button>
          <a href="/admin" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
            <Activity size={24} className="text-gray-400" />
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4 backdrop-blur-xl"
          >
            <div className={`p-4 rounded-2xl bg-white/5 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{stat.label}</p>
              <p className="text-2xl font-black">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Slips Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="wait">
          {loading ? (
             <div className="lg:col-span-3 h-64 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                   <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                   <p className="text-gray-400 font-mono animate-pulse text-sm">AI AGENTS ANALYZING MARKETS...</p>
                </div>
             </div>
          ) : (
            data?.slips?.map((slip: any, i: number) => (
              <motion.div
                key={slip.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2rem] opacity-20 group-hover:opacity-40 blur transition-all" />
                <div className="relative p-8 rounded-[2rem] bg-[#0D0D0E] border border-white/10 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-3xl font-black text-white">{slip.totalOdds}x <span className="text-sm font-normal text-gray-500">ODDS</span></h3>
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mt-1">Target: {slip.targetOdds}x</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <TrendingUp size={20} className="text-green-400" />
                    </div>
                  </div>

                  <div className="space-y-6 flex-1">
                    {slip.matches.map((match: any, j: number) => (
                      <div key={j} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-bold truncate pr-4">{match.match}</p>
                          <span className="text-xs font-mono text-blue-400">{match.odds.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] text-gray-500 font-medium uppercase">{match.prediction}</p>
                          <p className="text-[10px] text-green-400 font-bold">{Math.round(match.probability * 100)}% CONF.</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Slip Confidence</span>
                      <span className="text-sm font-black text-white">{slip.confidence}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${slip.confidence}%` }}
                        className="bg-blue-600 h-full rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                      />
                    </div>
                    <button className="w-full mt-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-all flex items-center justify-center gap-2 group">
                      View Analysis
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      {!loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-12 p-8 rounded-3xl bg-blue-600/5 border border-blue-500/10 flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Risk Advisory</p>
              <p className="text-xs text-gray-400">AI confidence scores are based on historical xG and market drift. Play responsibly.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             LAST SYNC: {new Date(data?.timestamp).toLocaleTimeString()}
          </div>
        </motion.div>
      )}
    </div>
  );
}
