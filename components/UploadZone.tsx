'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, Link, Film, AlertCircle } from 'lucide-react';
import GlassCard from './GlassCard';

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  onUrlSubmit: (url: string) => void;
}

type Tab = 'upload' | 'url';

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_MB = 50;

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only MP4, MOV, and WebM files are supported.';
  if (file.size > MAX_MB * 1024 * 1024) return `File must be under ${MAX_MB} MB.`;
  return null;
}

export default function UploadZone({ onFileUpload, onUrlSubmit }: UploadZoneProps) {
  const [tab, setTab] = useState<Tab>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pickFile = (f: File) => {
    const err = validateFile(f);
    if (err) { setError(err); return; }
    setError(null);
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  };

  const handleSubmit = () => {
    setError(null);
    if (tab === 'upload') {
      if (file) onFileUpload(file);
      return;
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      onUrlSubmit(url);
    } catch {
      setError('Please enter a valid URL starting with http:// or https://');
    }
  };

  const canSubmit = tab === 'upload' ? !!file : url.length > 0;

  return (
    <GlassCard className="max-w-xl mx-auto p-8">
      {/* Tab switcher */}
      <div className="flex gap-1.5 mb-8 p-1 bg-white/5 rounded-xl">
        {(['upload', 'url'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t === 'upload' ? <Upload className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
            {t === 'upload' ? 'Upload File' : 'Paste URL'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'upload' ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
          >
            <label
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-purple-400 bg-purple-500/10'
                  : file
                  ? 'border-green-400/40 bg-green-500/5'
                  : 'border-white/15 hover:border-white/30 hover:bg-white/[0.02]'
              }`}
            >
              <input
                type="file"
                className="sr-only"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFileChange}
              />
              {file ? (
                <>
                  <Film className="w-10 h-10 text-green-400" />
                  <div className="text-center">
                    <p className="text-white font-medium text-sm">{file.name}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-500" />
                  <div className="text-center">
                    <p className="text-white text-sm font-medium">Drop your video here</p>
                    <p className="text-gray-400 text-xs mt-1">or click to browse</p>
                  </div>
                  <p className="text-gray-600 text-xs">MP4 · MOV · WebM &mdash; max 50 MB</p>
                </>
              )}
            </label>
          </motion.div>
        ) : (
          <motion.div
            key="url"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
              YouTube · Vimeo · Direct video URL
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-400/50 focus:bg-white/[0.06] transition-all"
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-2 text-red-400 text-xs overflow-hidden"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.button
        onClick={handleSubmit}
        disabled={!canSubmit}
        whileTap={canSubmit ? { scale: 0.97 } : {}}
        className="mt-6 w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200
          bg-gradient-to-r from-purple-600 to-indigo-600
          hover:from-purple-500 hover:to-indigo-500
          disabled:opacity-30 disabled:cursor-not-allowed
          disabled:hover:from-purple-600 disabled:hover:to-indigo-600
          shadow-lg shadow-purple-900/30"
      >
        Analyze Cognitive Impact
      </motion.button>
    </GlassCard>
  );
}
