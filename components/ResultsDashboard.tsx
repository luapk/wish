'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Ear, MessageSquare, Brain, Clock, RotateCcw, Briefcase, Code2 } from 'lucide-react';
import GlassCard from './GlassCard';
import MetricCard from './MetricCard';
import VerdictBar from './VerdictBar';
import BrainViewer from './BrainViewer';
import type { AnalysisResult } from '@/lib/types';

interface ResultsDashboardProps {
  data: AnalysisResult;
  onReset: () => void;
}

type View = 'cso' | 'tech';

const metrics = (data: AnalysisResult) => [
  { label: 'Visual Load',          value: data.visualLoad,          icon: Eye,           color: 'purple' as const, confidence: data.confidence?.visualLoad },
  { label: 'Auditory Engagement',  value: data.auditoryEngagement,  icon: Ear,           color: 'cyan'   as const, confidence: data.confidence?.auditoryEngagement },
  { label: 'Linguistic Impact',    value: data.linguisticImpact,    icon: MessageSquare, color: 'pink'   as const, confidence: data.confidence?.linguisticImpact },
  { label: 'Overall Cognitive Load', value: data.overallCognitiveLoad, icon: Brain,      color: 'green'  as const, confidence: data.confidence?.overallCognitiveLoad },
];

export default function ResultsDashboard({ data, onReset }: ResultsDashboardProps) {
  const [view, setView] = useState<View>('cso');
  const ms = metrics(data);

  const brainMetrics = {
    visualLoad: data.visualLoad,
    auditoryEngagement: data.auditoryEngagement,
    linguisticImpact: data.linguisticImpact,
    overallCognitiveLoad: data.overallCognitiveLoad,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header row */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/8">
          {([
            { id: 'cso',  Icon: Briefcase, label: 'CSO View' },
            { id: 'tech', Icon: Code2,     label: 'Tech View' },
          ] as const).map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                view === id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {data.audience && (
            <span className="text-xs text-gray-500 px-2.5 py-1 rounded-full border border-white/10">
              {data.audience}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Clock className="w-3 h-3" />
            {data.processingTimeSeconds}s
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            New analysis
          </button>
        </div>
      </motion.div>

      {/* View layouts */}
      <AnimatePresence mode="wait">
        {view === 'cso' ? (
          <motion.div
            key="cso"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Verdict bar — full width */}
            <VerdictBar
              score={data.overallCognitiveLoad}
              confidence={data.confidence?.overallCognitiveLoad}
              label={data.verdict}
              detail={data.summary}
            />

            {/* Brain + top 2 metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <GlassCard
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="lg:col-span-3 overflow-hidden"
              >
                <BrainViewer metrics={brainMetrics} className="h-72 lg:h-80" />
              </GlassCard>

              <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                {ms.slice(0, 2).map((m, i) => (
                  <MetricCard key={m.label} {...m} delay={0.2 + i * 0.1} compact />
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tech"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* 2×2 metric grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ms.map((m, i) => (
                <MetricCard key={m.label} {...m} delay={i * 0.08} />
              ))}
            </div>

            {/* Brain + summary side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <GlassCard
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="lg:col-span-3"
              >
                <BrainViewer metrics={brainMetrics} className="h-60" />
              </GlassCard>

              <GlassCard
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2 p-6 flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                    Neural summary
                  </p>
                  <p className="text-gray-200 text-sm leading-relaxed">{data.summary}</p>
                </div>
                {data.confidence && (
                  <p className="text-xs text-gray-600 mt-4 pt-4 border-t border-white/5">
                    95% confidence intervals shown. Inter-subject variability from 700+ fMRI subjects.
                  </p>
                )}
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
