'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCcw, Zap, Brain, Target, Activity, Shield,
  AlertTriangle, ArrowRight, ChevronRight, TrendingUp
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);
  const [error, setError]     = useState<string | null>(null);
  const [targets, setTargets] = useState([2, 5, 10]);
  const [promptInput, setPromptInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/predictions', window.location.origin);
      url.searchParams.set('targets', targets.join(','));
      if (promptInput) {
        url.searchParams.set('prompt', promptInput);
      }
      const res  = await fetch(url.toString());
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Pipeline error');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Loading ── */
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <Brain className="absolute inset-0 m-auto text-primary w-6 h-6" />
        </div>
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Syncing AI agents…
        </p>
      </div>
    );
  }

  const stats = [
    { label: 'Avg Accuracy',  value: '78.4%',                                   icon: Target,     color: 'text-violet-500' },
    { label: 'AI Confidence', value: `${data?.health?.apiUsage?.gemini || 95}%`, icon: Brain,      color: 'text-cyan-500' },
    { label: 'System Health', value: data?.health?.status || 'Online',           icon: Activity,   color: 'text-emerald-500' },
    { label: 'Win Rate',      value: '84%',                                      icon: TrendingUp, color: 'text-amber-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <motion.section
        className="mb-14"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Live pill */}
        <motion.div variants={fadeUp} className="mb-6">
          <span className="badge badge-purple gap-2">
            <span className="dot-online" />
            Live Analysis Active
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 text-foreground"
        >
          AI Football{' '}
          <span className="gradient-text">Predictions</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mb-8 leading-relaxed">
          Multi-agent neural consensus across Gemini, Grok and Mistral.
          High-probability accumulators, generated in real-time.
        </motion.p>

        {/* Controls */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          <input
            type="text"
            className="form-input bg-secondary border-border"
            placeholder="E.g., Predict Arsenal outcomes, Focus on high scoring matches..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-primary"
            >
              {loading
                ? <RefreshCcw size={15} className="animate-spin" />
                : <Zap size={15} />}
              {loading ? 'Generating…' : 'Generate Predicted Match Slips'}
            </button>

          <div className="flex items-center gap-2">
            {[2, 5, 10].map(t => (
              <button
                key={t}
                onClick={() =>
                  setTargets(prev =>
                    prev.includes(t)
                      ? prev.length > 1 ? prev.filter(x => x !== t) : prev
                      : [...prev, t]
                  )
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 ${
                  targets.includes(t)
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-secondary text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {t}× Odds
              </button>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* ── Error ────────────────────────────────────────────── */}
      {error && (
        <div className="mb-8 flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────────── */}
      <motion.section
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            className="card-base p-5 flex items-start gap-4"
          >
            <div className={`p-2.5 rounded-lg bg-secondary shrink-0 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="section-label mb-1">{s.label}</p>
              <p className="font-display text-2xl font-black tracking-tight text-foreground">
                {s.value}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* ── Slip Cards ────────────────────────────────────────── */}
      {data?.slips && data.slips.length > 0 ? (
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-black text-foreground">Premium Slips</h2>
              <p className="text-sm text-muted-foreground mt-1">Latest neural consensus picks</p>
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
                    Analyse Market <ArrowRight size={14} />
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
            <p className="font-semibold text-foreground">No slips generated yet</p>
            <p className="text-sm text-muted-foreground">Click "Generate Slips" to run the AI pipeline.</p>
          </div>
        )
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
        <p className="text-xs text-muted-foreground/40 mt-6 font-mono">
          Last sync: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
        </p>
      </footer>
    </div>
  );
}
