'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import UploadZone from '@/components/UploadZone';
import AnalyzingState from '@/components/AnalyzingState';
import ResultsDashboard from '@/components/ResultsDashboard';
import type { AppPhase, AnalysisResult, JobStage, AudienceId } from '@/lib/types';

export default function Home() {
  const [state, setState] = useState<AppPhase>({ phase: 'idle' });
  const pollingRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoUrlRef = useRef<string>('');

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const handleFileUpload = async (file: File, audience: AudienceId) => {
    setState({ phase: 'uploading', progress: 0 });
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 120_000);
    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
        signal: abort.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Upload failed.' }));
        throw new Error(error);
      }
      const { url } = await res.json();
      await startAnalysis(url, audience);
    } catch (err) {
      clearTimeout(timer);
      const msg = (err as Error).name === 'AbortError'
        ? 'Upload timed out. Try a smaller file or use the URL tab instead.'
        : (err as Error).message || 'Upload failed.';
      setState({ phase: 'error', message: msg });
    }
  };

  const handleUrlSubmit = async (url: string, audience: AudienceId) => {
    await startAnalysis(url, audience);
  };

  const startAnalysis = async (videoUrl: string, audience: AudienceId) => {
    videoUrlRef.current = videoUrl;
    setState({ phase: 'analyzing', stage: 'queued', jobId: '', videoUrl });
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, audience }),
      });
      if (!res.ok) throw new Error('Failed to start analysis.');
      const { job_id } = await res.json();
      setState({ phase: 'analyzing', stage: 'queued', jobId: job_id, videoUrl });
      startPolling(job_id);
    } catch (err) {
      setState({ phase: 'error', message: (err as Error).message });
    }
  };

  const startPolling = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const status = await res.json();
        if (status.status === 'complete') {
          clearInterval(pollingRef.current!);
          setState({ phase: 'results', data: status.data as AnalysisResult, videoUrl: videoUrlRef.current });
        } else if (status.status === 'error') {
          clearInterval(pollingRef.current!);
          setState({ phase: 'error', message: status.error || 'Analysis failed.' });
        } else {
          setState((prev) =>
            prev.phase === 'analyzing'
              ? { ...prev, stage: status.status as JobStage }
              : prev
          );
        }
      } catch { /* transient — keep polling */ }
    }, 3000);
  };

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setState({ phase: 'idle' });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950/40 to-gray-950">
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[32rem] h-[32rem] bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-1/2 w-64 h-64 bg-cyan-500/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-5xl">
        <motion.header
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-400/20 bg-purple-500/10 text-purple-300 text-xs font-medium mb-6 tracking-wide uppercase">
            In-silico neuroscience · TribeV2
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
            Cognitive Impact{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
              Analyzer
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Upload a video or paste a URL to measure its visual, auditory, and linguistic cognitive fingerprint.
          </p>
        </motion.header>

        <AnimatePresence mode="wait">
          {state.phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <UploadZone onFileUpload={handleFileUpload} onUrlSubmit={handleUrlSubmit} />
            </motion.div>
          )}

          {(state.phase === 'uploading' || state.phase === 'analyzing') && (
            <motion.div key="processing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <AnalyzingState
                phase={state.phase}
                progress={state.phase === 'uploading' ? state.progress : undefined}
                stage={state.phase === 'analyzing' ? state.stage : undefined}
              />
            </motion.div>
          )}

          {state.phase === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <ResultsDashboard data={state.data} videoUrl={state.videoUrl} onReset={handleReset} />
            </motion.div>
          )}

          {state.phase === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto text-center">
              <div className="glass rounded-2xl p-8">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-400 text-xl">!</span>
                </div>
                <p className="text-red-400 mb-2 font-medium">Something went wrong</p>
                <p className="text-gray-400 text-sm mb-6">{state.message}</p>
                <button onClick={handleReset} className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors text-sm">
                  Try again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
