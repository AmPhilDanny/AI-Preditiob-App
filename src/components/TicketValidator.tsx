'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileImage, ShieldCheck, Loader2, AlertCircle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TicketValidator() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please upload an image file.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/validator/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Validation failed. Please try again.');
      }
    } catch (err: any) {
      setError('An error occurred during upload: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-base p-6 md:p-8 space-y-8 bg-secondary/20 border-primary/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-foreground flex items-center gap-3 uppercase tracking-tight">
            <ShieldCheck className="text-emerald-500" /> Ticket Validator Agent
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Upload your bookmaker ticket for AI statistical validation and RAG analysis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-purple px-3 py-1">V AI Agent Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-4">
          <div 
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`relative group cursor-pointer aspect-video rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden
              ${preview ? 'border-primary/50' : 'border-border hover:border-primary/40 hover:bg-primary/5'}
              ${loading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            {preview ? (
              <>
                <img src={preview} alt="Ticket preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-sm font-bold flex items-center gap-2">
                    <X size={16} /> Click to remove
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <p className="font-bold text-foreground mb-1">Click to upload ticket image</p>
                <p className="text-xs text-muted-foreground">Supports PNG, JPG (Max 5MB)</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="btn-primary flex-1 py-3 font-black uppercase tracking-widest text-xs"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Analyzing Ticket...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Validate Ticket
                </>
              )}
            </button>
            {file && !loading && (
              <button 
                onClick={clearFile}
                className="btn-secondary w-12 p-0 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2"
            >
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}
        </div>

        {/* Result Section */}
        <div className="min-h-[250px] relative">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full border border-border border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-secondary/5"
              >
                <div className="w-12 h-12 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center mb-4">
                  <FileImage size={24} />
                </div>
                <p className="text-sm font-medium text-muted-foreground max-w-[200px]">
                  Validation results will appear here after analysis.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full border border-primary/20 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-primary/5 overflow-hidden relative"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-primary/20 animate-ping absolute inset-0" />
                  <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center relative">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">V AI is Processing</h3>
                <div className="flex flex-col gap-2 max-w-[250px]">
                  <p className="text-[10px] uppercase font-black text-primary/70 tracking-widest animate-pulse">
                    Scanning Multimodal Nodes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Extracting match data and performing cross-reference RAG against our global database.
                  </p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full border border-emerald-500/30 rounded-2xl p-6 bg-emerald-500/[0.02] flex flex-col"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 size={16} />
                  </div>
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Validation Verdict</h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.validationReport}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex gap-2">
                    {result.extractedMatches?.slice(0, 3).map((m: any, i: number) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-mono truncate max-w-[80px]">
                        {m.homeTeam}
                      </span>
                    ))}
                  </div>
                  <button onClick={clearFile} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter flex items-center gap-1">
                    New Scan <ChevronRight size={10} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
