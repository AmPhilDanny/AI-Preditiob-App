'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatToWAT } from '@/lib/utils/time';
import {
  RefreshCcw, Zap, Brain, Target, Activity, Shield,
  AlertTriangle, ArrowRight, ChevronRight, TrendingUp,
  Globe, CheckCircle, Play, Loader2, Send, MessageSquare,
  Sparkles, Check, Database, Terminal, History, Trash2, X
} from 'lucide-react';

// ── Lightweight Markdown Renderer ─────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="bg-background/60 border border-border rounded-lg p-3 text-xs overflow-x-auto my-2 font-mono text-emerald-400">$1</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-background/60 px-1.5 py-0.5 rounded text-xs font-mono text-primary">$1</code>')
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="font-bold text-sm text-foreground mt-3 mb-1">$1</h3>')
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="font-bold text-base text-foreground mt-4 mb-2 border-b border-border pb-1">$1</h2>')
    // H1
    .replace(/^# (.+)$/gm, '<h1 class="font-black text-lg text-primary mt-4 mb-2">$1</h1>')
    // Bold+Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold italic text-foreground">$1</strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-border my-3" />')
    // Bullet lists
    .replace(/^[\-\*] (.+)$/gm, '<li class="flex gap-2 text-sm"><span class="text-primary mt-1 shrink-0">•</span><span>$1</span></li>')
    // Numbered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="flex gap-2 text-sm"><span class="text-primary font-bold shrink-0">$1.</span><span>$2</span></li>')
    // Wrap consecutive <li> items in <ul>
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, '<ul class="space-y-1.5 my-2 pl-1">$&</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>');
}

function ChatMessage({ content, role }: { content: string; role: string }) {
  if (role === 'user') {
    return <span>{content}</span>;
  }
  return (
    <div
      className="prose-chat"
      dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(content)}</p>` }}
    />
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);
  const [error, setError]     = useState<string | null>(null);
  const [targets, setTargets] = useState([2, 5, 10]);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your AI Football Assistant. I can help you analyze match data and generate high-probability slips. What would you like to know today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Slip History — persisted in localStorage
  interface SlipHistory {
    id: string;
    slips: any[];
    provider: string;
    timestamp: string;
    targets: number[];
  }
  const [slipHistory, setSlipHistory] = useState<SlipHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('slipHistory');
      if (stored) setSlipHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const saveToHistory = (entry: SlipHistory) => {
    setSlipHistory(prev => {
      const updated = [entry, ...prev].slice(0, 20); // keep last 20
      try { localStorage.setItem('slipHistory', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const deleteFromHistory = (id: string) => {
    setSlipHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      try { localStorage.setItem('slipHistory', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const clearHistory = () => {
    setSlipHistory([]);
    try { localStorage.removeItem('slipHistory'); } catch {}
  };

  // Agent Status State
  const [agents, setAgents] = useState({
    scraper:   { status: 'idle', lastRun: null as string | null },
    processor: { status: 'idle', lastRun: null as string | null },
    analyst:   { status: 'idle', lastRun: null as string | null },
    validator: { status: 'idle', lastRun: null as string | null },
    health:    { status: 'online', lastRun: new Date().toISOString() },
  });

  const [storage, setStorage] = useState({
    hasScraped: false,
    hasProcessed: false
  });

  const [scrapingUrls, setScrapingUrls] = useState<string[]>([]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setAgents(prev => ({ ...prev, analyst: { ...prev.analyst, status: 'running' } }));
    
    try {
      const url = new URL('/api/predictions', window.location.origin);
      url.searchParams.set('targets', targets.join(','));
      
      const res  = await fetch(url.toString());
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Pipeline error');
      
      setData(json);
      // Add to slip history
      saveToHistory({
        id: `history-${Date.now()}`,
        slips: json.slips,
        provider: json.provider || 'AI',
        timestamp: json.timestamp,
        targets
      });
      setAgents(prev => ({ 
        ...prev, 
        analyst: { status: 'success', lastRun: new Date().toISOString() },
        validator: { status: 'success', lastRun: new Date().toISOString() }
      }));
    } catch (err: any) {
      setError(err.message);
      setAgents(prev => ({ ...prev, analyst: { ...prev.analyst, status: 'idle' } }));
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const triggerAgent = async (name: 'scraper' | 'processor') => {
    setAgents(prev => ({ ...prev, [name]: { ...prev[name], status: 'running' } }));
    try {
      const endpoint = name === 'scraper' ? '/api/cron/scrape' : '/api/admin/process';
      const res = await fetch(endpoint, { method: name === 'scraper' ? 'GET' : 'POST' });
      const json = await res.json();
      
      if (json.success || res.ok) {
        setAgents(prev => ({ ...prev, [name]: { status: 'success', lastRun: new Date().toISOString() } }));
        // Auto-reset to idle after 5s
        setTimeout(() => {
          setAgents(prev => ({ ...prev, [name]: { ...prev[name], status: 'idle' } }));
        }, 5000);
      } else {
        throw new Error('Agent failed');
      }
    } catch (err) {
      setAgents(prev => ({ ...prev, [name]: { ...prev[name], status: 'idle' } }));
      alert(`${name.toUpperCase()} Agent failed to complete task.`);
    }
  };

  useEffect(() => { 
    // Initial fetch for background stats
    fetch('/api/admin/health').then(r => r.json()).then(h => {
      if (h) {
        setAgents(prev => ({ ...prev, health: { status: 'online', lastRun: new Date().toISOString() } }));
        if (h.storage) setStorage({ hasScraped: h.storage.hasScraped, hasProcessed: h.storage.hasProcessed });
        if (h.urls) setScrapingUrls(h.urls);
      }
    });

    // Poll health/storage every 30s
    const t = setInterval(() => {
      fetch('/api/admin/health').then(r => r.json()).then(h => {
        if (h?.storage) setStorage({ hasScraped: h.storage.hasScraped, hasProcessed: h.storage.hasProcessed });
        if (h.urls) setScrapingUrls(h.urls);
      });
    }, 30000);

    setLoading(false); 
    return () => clearInterval(t);
  }, []);

  const agentCards = [
    { id: 'scraper',   name: 'Scraper',   icon: Globe,        color: 'text-cyan-500',    bg: 'bg-cyan-500/10' },
    { id: 'processor', name: 'Processor', icon: Brain,        color: 'text-amber-500',   bg: 'bg-amber-500/10' },
    { id: 'analyst',   name: 'Analyst',   icon: Terminal,      color: 'text-violet-500',  bg: 'bg-violet-500/10' },
    { id: 'validator', name: 'Validator', icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'health',    name: 'Health',    icon: Shield,        color: 'text-blue-500',    bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">

      {/* ── Hero & Chat ─────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-14">
        
        {/* Left: Info */}
        <motion.div 
          className="lg:col-span-5 space-y-6"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            <span className="badge badge-purple gap-2">
              <span className="dot-online" />
              Neural Network Live
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.1]"
          >
            Multi-Agent <br />
            <span className="gradient-text">Neural Consensus</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-muted-foreground text-lg leading-relaxed">
            Communicate with your AI agents, analyze deep market trends, and generate winning slips with absolute precision.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border">
              <Database size={16} className="text-cyan-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Knowledge</p>
                <p className="text-xs font-bold text-foreground">Active Datasets</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border">
              <Sparkles size={16} className="text-amber-500" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Intelligence</p>
                <p className="text-xs font-bold text-foreground">Real-time Analysis</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Chatbox */}
        <motion.div 
          className="lg:col-span-7"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="card-base flex flex-col h-[500px] overflow-hidden border-primary/20 shadow-2xl shadow-primary/5">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-border bg-secondary/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MessageSquare size={16} className="text-primary" /> AI Assistant
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchData}
                  disabled={loading}
                  className="btn-primary py-1 px-3 text-[10px] h-8"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  Generate Slips
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-secondary text-foreground rounded-tl-none border border-border'
                  }`}>
                    <ChatMessage content={msg.content} role={msg.role} />
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary px-4 py-3 rounded-2xl rounded-tl-none border border-border">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChat} className="p-4 border-t border-border bg-secondary/30">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask about today's matches or analysis..."
                  className="form-input pr-12 bg-background"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </section>

      {/* ── Agent Process Displays ─────────────────────────── */}
      <motion.section 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {agentCards.map((agent) => {
          const state = (agents as any)[agent.id];
          const isRunning = state.status === 'running';
          const isSuccess = state.status === 'success';

          return (
            <motion.div 
              key={agent.id}
              variants={fadeUp}
              className={`card-base p-4 relative overflow-hidden transition-all duration-300 ${
                isRunning ? 'border-primary/50 ring-1 ring-primary/20' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${agent.bg} ${agent.color}`}>
                  <agent.icon size={18} />
                </div>
                <div className="flex items-center gap-2">
                  {((agent.id === 'scraper' && storage.hasScraped) || (agent.id === 'processor' && storage.hasProcessed)) && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" title="Active Data Stored" />
                  )}
                  {isSuccess && <Check size={16} className="text-emerald-500 animate-in zoom-in duration-300" />}
                  {isRunning && <Loader2 size={16} className="text-primary animate-spin" />}
                </div>
              </div>

              <h4 className="text-xs font-bold text-foreground mb-1">{agent.name}</h4>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className={
                    isRunning ? 'dot-busy' :
                    state.status === 'online' || isSuccess ? 'dot-online' : 'dot-idle'
                  } />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {isRunning ? 'Working' : isSuccess ? 'Saved' : state.status}
                  </span>
                </div>
                {state.lastRun && (
                  <p className="text-[8px] text-muted-foreground/60 font-mono">
                    {formatToWAT(state.lastRun)}
                  </p>
                )}

                {/* Display URLs for Scraper */}
                {agent.id === 'scraper' && scrapingUrls.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Active Targets</p>
                    <div className="flex flex-col gap-1">
                      {scrapingUrls.slice(0, 3).map((url, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[8px] text-cyan-500/80 truncate font-mono">
                          <Globe size={8} />
                          {new URL(url).hostname}
                        </div>
                      ))}
                      {scrapingUrls.length > 3 && (
                        <p className="text-[8px] text-muted-foreground italic">+{scrapingUrls.length - 3} more...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {isRunning && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                  />
                </div>
              )}

              {/* Triggers for Scraper/Processor */}
              {(agent.id === 'scraper' || agent.id === 'processor') && (
                <button
                  onClick={() => triggerAgent(agent.id as any)}
                  disabled={isRunning}
                  className="mt-3 w-full btn-ghost py-1 text-[9px] h-7 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ opacity: 1 }} // Force visible for mobile
                >
                  <Play size={10} /> Trigger
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.section>

      {/* ── Error ────────────────────────────────────────────── */}
      {error && (
        <div className="mb-8 flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Slip Cards ────────────────────────────────────────── */}
      {data?.slips && data.slips.length > 0 ? (
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-black text-foreground">AI Verified Slips</h2>
              <p className="text-sm text-muted-foreground mt-1">Consensus reached across 3 neural nodes</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(prev => !prev)}
                className={`btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 ${showHistory ? 'text-primary' : ''}`}
              >
                <History size={13} />
                History {slipHistory.length > 0 && <span className="badge badge-purple py-0 px-1.5 text-[10px]">{slipHistory.length}</span>}
              </button>
              {[2, 5, 10].map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setTargets(prev => prev.includes(t) ? (prev.length > 1 ? prev.filter(x => x !== t) : prev) : [...prev, t]);
                    fetchData();
                  }}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                    targets.includes(t) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border'
                  }`}
                >
                  {t}×
                </button>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {data.slips.map((slip: any, i: number) => (
              <motion.div
                key={slip.id}
                variants={fadeUp}
                custom={i}
                className="card-hover flex flex-col overflow-hidden"
              >
                {/* Card header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="section-label mb-1">Target {slip.targetOdds}×</p>
                      <p className="font-display text-3xl font-black text-foreground">
                        {slip.totalOdds}
                        <span className="text-lg text-muted-foreground font-medium ml-1">odds</span>
                      </p>
                    </div>
                    <span className="badge badge-purple">{slip.confidence}% conf.</span>
                  </div>

                  {/* Confidence bar */}
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${slip.confidence}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: i * 0.15 }}
                    />
                  </div>
                </div>

                {/* Matches */}
                <div className="flex-1 divide-y divide-border">
                  {slip.matches.map((m: any, idx: number) => (
                    <div key={idx} className="p-5 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="badge badge-purple text-[10px]">{m.prediction}</span>
                        <span className="font-display font-bold text-foreground text-sm">{m.odds}×</span>
                      </div>
                      <p className="font-semibold text-foreground text-sm mb-1">{m.match}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{m.reasoning}</p>
                    </div>
                  ))}
                </div>

                {/* Card footer */}
                <div className="p-4 bg-secondary/30">
                  <button className="btn-secondary w-full justify-center">
                    Full Analysis <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      ) : (
        !loading && (
          <div className="card-base p-16 flex flex-col items-center gap-4 text-center">
            <Zap className="text-muted-foreground" size={36} />
            <p className="font-semibold text-foreground">Awaiting Prediction Sequence</p>
            <p className="text-sm text-muted-foreground">Use the chat assistant or click "Generate Slips" above.</p>
          </div>
        )
      )}

      {/* ── Slip History Panel ─────────────────────────────────── */}
      {showHistory && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-black text-foreground flex items-center gap-2">
                <History size={18} className="text-primary" /> Generation History
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Last {slipHistory.length} generated slip sessions</p>
            </div>
            {slipHistory.length > 0 && (
              <button onClick={clearHistory} className="btn-ghost text-xs text-destructive hover:text-destructive px-3 py-1.5 flex items-center gap-1.5">
                <Trash2 size={12} /> Clear All
              </button>
            )}
          </div>

          {slipHistory.length === 0 ? (
            <div className="card-base p-10 text-center text-muted-foreground text-sm">
              No history yet. Generate slips to start tracking.
            </div>
          ) : (
            <div className="space-y-4">
              {slipHistory.map((entry) => (
                <div key={entry.id} className="card-base overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <span className="badge badge-purple text-[10px]">{entry.provider}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()} · Targets: {entry.targets.join('×, ')}×
                      </span>
                    </div>
                    <button
                      onClick={() => deleteFromHistory(entry.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {entry.slips.map((slip: any, si: number) => (
                      <div key={si} className="px-5 py-3 flex items-center gap-4">
                        <span className="text-xs font-bold text-muted-foreground w-16 shrink-0">Target {slip.targetOdds}×</span>
                        <span className="font-display font-black text-foreground">{slip.totalOdds}×</span>
                        <span className="badge badge-purple text-[10px]">{slip.confidence}% conf.</span>
                        <span className="text-xs text-muted-foreground">{slip.matches?.length || 0} matches</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="mt-20 pt-8 border-t border-border text-center">
        <div className="inline-flex items-center gap-2 badge badge-amber mb-4">
          <AlertTriangle size={12} />
          Risk Advisory
        </div>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          AI predictions are for informational purposes only. Past performance does not guarantee
          future results. Please gamble responsibly.
        </p>
        <p className="text-xs text-muted-foreground/40 mt-6 font-mono uppercase tracking-widest">
          Sync Time (WAT): {data?.timestamp ? formatToWAT(data.timestamp) : 'N/A'}
        </p>
      </footer>
    </div>
  );
}
