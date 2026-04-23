'use client';

import { motion } from 'framer-motion';
import { Download, Film, Brain, BarChart2, CheckCircle } from 'lucide-react';
import GlassCard from './GlassCard';
import type { JobStage } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

interface StageInfo {
  id: JobStage;
  label: string;
  icon: LucideIcon;
}

const STAGES: StageInfo[] = [
  { id: 'downloading', label: 'Downloading media', icon: Download },
  { id: 'extracting_frames', label: 'Extracting frames', icon: Film },
  { id: 'running_inference', label: 'Running neural inference', icon: Brain },
  { id: 'aggregating', label: 'Aggregating results', icon: BarChart2 },
];

const ORDER: JobStage[] = [
  'queued',
  'downloading',
  'extracting_frames',
  'running_inference',
  'aggregating',
  'complete',
];

function stageIndex(s: JobStage) {
  return ORDER.indexOf(s);
}

interface AnalyzingStateProps {
  phase: 'uploading' | 'analyzing';
  progress?: number; // kept for API compatibility, not used (blob SDK doesn't expose progress)
  stage?: JobStage;
}

export default function AnalyzingState({ phase, progress, stage }: AnalyzingStateProps) {
  const currentIdx = stage ? stageIndex(stage) : -1;

  return (
    <GlassCard className="max-w-xl mx-auto p-10">
      {/* Pulsing brain icon */}
      <div className="flex justify-center mb-10">
        <div className="relative w-20 h-20">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-purple-400/20"
              animate={{ scale: [1, 1.6 + i * 0.3], opacity: [0.6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-purple-500/10 border border-purple-400/20">
            <Brain className="w-9 h-9 text-purple-400" />
          </div>
        </div>
      </div>

      {phase === 'uploading' ? (
        <div className="text-center mb-6">
          <p className="text-white font-semibold mb-1">Uploading video…</p>
          <p className="text-gray-400 text-sm mb-4">Sending to cloud storage</p>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-400"
              animate={{ x: ['0%', '200%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      ) : (
        <div className="text-center mb-8">
          <p className="text-white font-semibold mb-1">Analyzing cognitive fingerprint</p>
          <p className="text-gray-400 text-sm">TribeV2 neural model · typically 30 – 60 s</p>
        </div>
      )}

      {/* Stage list */}
      {phase === 'analyzing' && (
        <div className="space-y-2">
          {STAGES.map((s) => {
            const idx = stageIndex(s.id);
            const done = currentIdx > idx;
            const active = currentIdx === idx;
            const Icon = s.icon;

            return (
              <motion.div
                key={s.id}
                animate={{ opacity: done || active ? 1 : 0.3 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active ? 'bg-purple-500/10 border border-purple-400/15' : 'bg-transparent'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    done ? 'bg-green-500/10' : active ? 'bg-purple-500/10' : 'bg-white/5'
                  }`}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Icon
                      className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-gray-600'}`}
                    />
                  )}
                </div>

                <span
                  className={`text-sm font-medium flex-1 ${
                    done ? 'text-green-400' : active ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {s.label}
                </span>

                {active && (
                  <motion.div
                    className="flex gap-1"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  >
                    {[0, 1, 2].map((d) => (
                      <div key={d} className="w-1 h-1 rounded-full bg-purple-400" />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
