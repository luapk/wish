'use client';

import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import type { ConfidenceBand } from '@/lib/types';

interface VerdictBarProps {
  score: number;
  confidence?: ConfidenceBand;
  label?: string;
  detail?: string;
}

function verdictStyle(score: number): { text: string; color: string; bar: string } {
  if (score >= 80) return { text: 'Critical Cognitive Load',    color: 'text-red-400',    bar: 'from-red-500 to-pink-400' };
  if (score >= 65) return { text: 'High Cognitive Impact',      color: 'text-orange-400', bar: 'from-orange-500 to-amber-400' };
  if (score >= 45) return { text: 'Moderate Cognitive Demand',  color: 'text-yellow-400', bar: 'from-yellow-500 to-amber-300' };
  return              { text: 'Low Cognitive Load',             color: 'text-green-400',  bar: 'from-green-500 to-emerald-400' };
}

export default function VerdictBar({ score, confidence, label, detail }: VerdictBarProps) {
  const { text, color, bar } = verdictStyle(score);
  const displayLabel = label ?? text;
  const ci = confidence ? Math.round((confidence.high - confidence.low) / 2) : null;

  return (
    <GlassCard
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
            Cognitive Fingerprint
          </p>
          <p className={`text-xl font-bold ${color}`}>{displayLabel}</p>
          {detail && <p className="text-gray-400 text-sm mt-1.5 leading-relaxed max-w-sm">{detail}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-white tabular-nums">{score}</span>
            <span className="text-gray-500 text-sm">/100</span>
          </div>
          {ci !== null && (
            <p className="text-xs text-gray-500 mt-0.5">±{ci} confidence</p>
          )}
        </div>
      </div>

      {/* Track */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        {/* Confidence band */}
        {confidence && (
          <div
            className="absolute inset-y-0 bg-white/10 rounded-full"
            style={{ left: `${confidence.low}%`, right: `${100 - confidence.high}%` }}
          />
        )}
        {/* Score fill */}
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {confidence && (
        <div className="flex justify-between text-xs text-gray-600 mt-1.5 px-0.5">
          <span>{confidence.low}</span>
          <span className="text-gray-500">95% CI</span>
          <span>{confidence.high}</span>
        </div>
      )}
    </GlassCard>
  );
}
