'use client';

import { motion } from 'framer-motion';
import { Eye, Ear, MessageSquare, Brain, Clock, RotateCcw } from 'lucide-react';
import GlassCard from './GlassCard';
import MetricCard from './MetricCard';
import type { AnalysisResult } from '@/lib/types';

interface ResultsDashboardProps {
  data: AnalysisResult;
  onReset: () => void;
}

export default function ResultsDashboard({ data, onReset }: ResultsDashboardProps) {
  const metrics = [
    { label: 'Visual Load', value: data.visualLoad, icon: Eye, color: 'purple' as const },
    { label: 'Auditory Engagement', value: data.auditoryEngagement, icon: Ear, color: 'cyan' as const },
    { label: 'Linguistic Impact', value: data.linguisticImpact, icon: MessageSquare, color: 'pink' as const },
    { label: 'Overall Cognitive Load', value: data.overallCognitiveLoad, icon: Brain, color: 'green' as const },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title row */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">Analysis complete</h2>
          <div className="flex items-center gap-1.5 text-gray-400 text-sm mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            Processed in {data.processingTimeSeconds}s
          </div>
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New analysis
        </button>
      </motion.div>

      {/* Metric grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map((m, i) => (
          <MetricCard key={m.label} {...m} delay={i * 0.1} />
        ))}
      </div>

      {/* Summary */}
      <GlassCard
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="p-6"
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Neural summary
        </p>
        <p className="text-gray-200 leading-relaxed">{data.summary}</p>
      </GlassCard>
    </div>
  );
}
