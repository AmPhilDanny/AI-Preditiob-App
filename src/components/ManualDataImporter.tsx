'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, Database, Loader2, AlertCircle, CheckCircle2, Sparkles, ChevronRight, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ManualDataImporter() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!text.trim() || text.length < 10) {
      setError('Please paste more content from the bookmaker website.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/external/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
        setText(''); // Clear on success
      } else {
        setError(data.error || 'Import failed. Please check the content and try again.');
      }
    } catch (err: any) {
      setError('An error occurred during import: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-base p-6 sm:p-8 md:p-12 space-y-10 bg-secondary/20 border-primary/20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="font-display text-3xl md:text-5xl font-black text-foreground flex items-center gap-4 uppercase tracking-tight">
            <Clipboard className="text-primary w-8 h-8 md:w-12 md:h-12" /> Data Importer
          </h2>
          <p className="text-base md:text-xl text-muted-foreground font-semibold max-w-2xl">
            Bypass scraper blocks. Copy-paste any bookmaker page text here for deep AI analysis and database syncing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-cyan px-4 py-1.5 text-xs md:text-sm">Manual Sync Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="relative group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste raw text or HTML from Bet365, 1xBet, etc. here..."
              className="form-textarea h-[350px] bg-background/50 border-2 border-border focus:border-primary/50 text-base md:text-lg font-medium p-6 transition-all"
              disabled={loading}
            />
            {!text && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <Database size={100} className="text-muted-foreground" />
              </div>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={!text.trim() || loading}
            className="btn-primary w-full py-4 font-black uppercase tracking-widest text-sm md:text-base flex justify-center items-center gap-3 shadow-xl shadow-primary/20"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Intelligence Processing...
              </>
            ) : (
              <>
                <Send size={20} /> Sync & Analyze Data
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold flex items-center gap-3"
            >
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}
        </div>

        {/* Intelligence Result Section */}
        <div className="min-h-[450px] relative">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full border-2 border-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-12 bg-secondary/5"
              >
                <div className="w-16 h-16 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center mb-6">
                  <Sparkles size={32} />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2">Awaiting Intelligence</h4>
                <p className="text-sm font-semibold text-muted-foreground max-w-[280px]">
                  Paste data on the left to generate a super-informed analysis report.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full border-2 border-primary/20 rounded-3xl flex flex-col items-center justify-center text-center p-12 bg-primary/5 overflow-hidden"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full border-4 border-primary/20 animate-ping absolute inset-0" />
                  <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center relative">
                    <Database size={40} className="animate-pulse" />
                  </div>
                </div>
                <h3 className="font-black text-foreground text-2xl mb-4 uppercase tracking-tight">Syncing Database</h3>
                <div className="space-y-3 max-w-[300px]">
                  <div className="flex items-center gap-2 justify-center">
                    <span className="dot-online" />
                    <p className="text-[10px] uppercase font-black text-primary/70 tracking-widest">Parsing Raw Strings</p>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    AI is cross-referencing new odds with existing system predictions to find arbitrage and value.
                  </p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full border-2 border-primary/30 rounded-3xl p-8 md:p-10 bg-primary/[0.03] flex flex-col shadow-2xl shadow-primary/5"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-foreground text-xl md:text-2xl uppercase tracking-wider leading-none">Super Analysis</h3>
                      <p className="text-[10px] text-primary/70 font-black uppercase tracking-tighter mt-1">{result.count} Matches Synced</p>
                    </div>
                  </div>
                  <button onClick={() => setResult(null)} className="btn-icon">
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <div className="prose-chat prose-lg md:prose-xl max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.analysis}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                   <div className="flex -space-x-2">
                    {result.matches?.slice(0, 5).map((m: any, i: number) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[8px] font-black uppercase text-primary overflow-hidden" title={m.homeTeam}>
                        {m.homeTeam.substring(0, 2)}
                      </div>
                    ))}
                    {result.matches?.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-black text-primary">
                        +{result.matches.length - 5}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Database Updated</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
