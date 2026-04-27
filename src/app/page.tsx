'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, CheckCircle, Shield, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [activeAI, setActiveAI] = useState('Gemini 1.5 Pro');
  
  const stats = [
    { label: 'Daily Accuracy', value: '78.4%', icon: TrendingUp, color: 'text-blue-400' },
    { label: 'Total Predictions', value: '1,284', icon: Brain, color: 'text-purple-400' },
    { label: 'System Uptime', value: '99.9%', icon: Activity, color: 'text-green-400' },
    { label: 'Model Confidence', value: 'High', icon: Shield, color: 'text-orange-400' },
  ];

  const predictions = [
    {
      id: 1,
      match: 'Arsenal vs Manchester City',
      league: 'Premier League',
      prediction: 'Home Win',
      odds: 2.05,
      confidence: 84,
      ai: 'Gemini',
      status: 'Pending'
    },
    {
      id: 2,
      match: 'Real Madrid vs Barcelona',
      league: 'La Liga',
      prediction: 'Away Win',
      odds: 2.10,
      confidence: 72,
      ai: 'Grok',
      status: 'Pending'
    },
    {
      id: 3,
      match: 'Bayern Munich vs Dortmund',
      league: 'Bundesliga',
      prediction: 'Draw',
      odds: 3.20,
      confidence: 65,
      ai: 'Mistral',
      status: 'Pending'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            AI Prediction Dashboard
          </h1>
          <p className="text-gray-400 mt-2">Professional football analytics powered by multi-LLM consensus.</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          {['Gemini', 'Grok', 'Mistral'].map((ai) => (
            <button
              key={ai}
              onClick={() => setActiveAI(ai)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeAI.includes(ai) 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {ai}
            </button>
          ))}
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
            className="glass-card flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Today's Picks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="text-green-400" size={20} />
              Today's High-Value Picks (2.0 Odds)
            </h2>
            <span className="text-xs text-gray-500 font-medium">UPDATED 5 MIN AGO</span>
          </div>
          
          <div className="space-y-4">
            {predictions.map((p, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                key={p.id}
                className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-blue-500/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold text-lg">
                    {p.match[0]}
                  </div>
                  <div>
                    <p className="text-sm text-blue-400 font-semibold uppercase tracking-tight">{p.league}</p>
                    <h3 className="text-lg font-bold">{p.match}</h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase">Prediction</p>
                    <p className="font-bold text-green-400">{p.prediction}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase">Odds</p>
                    <p className="font-bold">{p.odds.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase">Confidence</p>
                    <div className="w-16 bg-white/10 h-1.5 rounded-full mt-1">
                      <div 
                        className="bg-blue-500 h-full rounded-full" 
                        style={{ width: `${p.confidence}%` }}
                      ></div>
                    </div>
                    <p className="text-xs mt-1 font-bold">{p.confidence}%</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: AI Health & Feed */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-blue-400" size={20} />
            AI Health Status
          </h2>
          
          <div className="glass-card space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Model Data Drift</span>
                <span className="text-sm text-green-400">Low (0.02)</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full">
                <div className="bg-green-500 w-[92%] h-full rounded-full"></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">API Latency</span>
                <span className="text-sm text-blue-400">142ms</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full">
                <div className="bg-blue-500 w-[75%] h-full rounded-full"></div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-500" />
                Live Agent Logs
              </h4>
              <div className="space-y-3 font-mono text-[10px]">
                <div className="flex gap-2">
                  <span className="text-gray-500">[21:34:02]</span>
                  <span className="text-green-400">SCRAPER:</span>
                  <span>Fetched odds from 4 sources.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500">[21:34:05]</span>
                  <span className="text-purple-400">ANALYST:</span>
                  <span>Gemini processing Arsenal vs City.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500">[21:34:12]</span>
                  <span className="text-blue-400">HEALTH:</span>
                  <span>All systems operational.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-blue-400 mb-1">PRO TIP</h4>
            <p className="text-xs text-gray-400">
              The "Validator" agent has flagged high volatility in the Bundesliga today. Betting stakes should be reduced.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
