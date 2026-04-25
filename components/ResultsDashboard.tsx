'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Ear, MessageSquare, Brain, Clock, RotateCcw } from 'lucide-react';
import GlassCard from './GlassCard';
import MetricCard from './MetricCard';
import VerdictBar from './VerdictBar';
import BrainViewer from './BrainViewer';
import { VideoPlayer } from './VideoPlayer';
import MomentFeed from './MomentFeed';
import type { AnalysisResult } from '@/lib/types';

interface ResultsDashboardProps {
  data: AnalysisResult;
  videoUrl: string;
  onReset: () => void;
}

const metricDefs = (data: AnalysisResult) => [
  { label: 'Visual Load',           value: data.visualLoad,           icon: Eye,           color: 'purple' as const, confidence: data.confidence?.visualLoad },
  { label: 'Auditory Engagement',   value: data.auditoryEngagement,   icon: Ear,           color: 'cyan'   as const, confidence: data.confidence?.auditoryEngagement },
  { label: 'Linguistic Impact',     value: data.linguisticImpact,     icon: MessageSquare, color: 'pink'   as const, confidence: data.confidence?.linguisticImpact },
  { label: 'Overall Cognitive Load',value: data.overallCognitiveLoad, icon: Brain,         color: 'green'  as const, confidence: data.confidence?.overallCognitiveLoad },
];

export default function ResultsDashboard({ data, videoUrl, onReset }: ResultsDashboardProps) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const brainMetrics = {
    visualLoad:           data.visualLoad,
    auditoryEngagement:   data.auditoryEngagement,
    linguisticImpact:     data.linguisticImpact,
    overallCognitiveLoad: data.overallCognitiveLoad,
  };

  const handleSeek = (t: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <VerdictBar
          score={data.overallCognitiveLoad}
          confidence={data.confidence?.overallCognitiveLoad}
          label={data.verdict}
          detail={data.summary}
        />
      </motion.div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
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
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all text-xs"
        >
          <RotateCcw className="w-3 h-3" />
          New analysis
        </button>
      </div>

      {/* Video + Brain — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: video player */}
        <GlassCard
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden p-0"
        >
          <VideoPlayer
            ref={videoRef}
            url={videoUrl}
            moments={data.moments}
            onTimeUpdate={setCurrentTime}
            className="w-full"
          />
        </GlassCard>

        {/* Right: brain mesh */}
        <GlassCard
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="overflow-hidden p-0 min-h-64"
        >
          <BrainViewer
            metrics={brainMetrics}
            temporalData={data.temporalData}
            videoRef={videoRef}
            className="h-full min-h-64"
          />
        </GlassCard>
      </div>

      {/* Contextual moments */}
      {data.moments && data.moments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="px-1"
        >
          <MomentFeed
            moments={data.moments}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        </motion.div>
      )}

      {/* Metric grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {metricDefs(data).map((m, i) => (
          <MetricCard key={m.label} {...m} delay={i * 0.06} compact />
        ))}
      </motion.div>

    </div>
  );
}
