'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import GlassCard from './GlassCard';
import type { ConfidenceBand } from '@/lib/types';

type Color = 'purple' | 'cyan' | 'pink' | 'green';

const palette: Record<Color, { iconWrap: string; icon: string; badge: string; bar: string }> = {
  purple: { iconWrap: 'bg-purple-500/10', icon: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-400', bar: 'from-purple-500 to-violet-400' },
  cyan:   { iconWrap: 'bg-cyan-500/10',   icon: 'text-cyan-400',   badge: 'bg-cyan-500/10 text-cyan-400',     bar: 'from-cyan-500 to-blue-400' },
  pink:   { iconWrap: 'bg-pink-500/10',   icon: 'text-pink-400',   badge: 'bg-pink-500/10 text-pink-400',     bar: 'from-pink-500 to-rose-400' },
  green:  { iconWrap: 'bg-green-500/10',  icon: 'text-green-400',  badge: 'bg-green-500/10 text-green-400',   bar: 'from-green-500 to-emerald-400' },
};

function level(v: number) {
  if (v >= 80) return 'Critical';
  if (v >= 60) return 'High';
  if (v >= 40) return 'Moderate';
  return 'Low';
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: Color;
  confidence?: ConfidenceBand;
  delay?: number;
  compact?: boolean;
}

export default function MetricCard({ label, value, icon: Icon, color, confidence, delay = 0, compact = false }: MetricCardProps) {
  const c = palette[color];

  return (
    <GlassCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={compact ? 'p-4' : 'p-6'}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${c.iconWrap}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
          {level(value)}
        </span>
      </div>

      <div className={compact ? 'mb-3' : 'mb-4'}>
        <div className="flex items-baseline gap-1">
          <span className={`font-bold text-white tabular-nums ${compact ? 'text-3xl' : 'text-4xl'}`}>{value}</span>
          <span className="text-sm text-gray-500">/100</span>
          {confidence && (
            <span className="text-xs text-gray-600 ml-1">
              ±{Math.round((confidence.high - confidence.low) / 2)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      </div>

      {/* Progress bar with optional confidence band */}
      <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
        {confidence && (
          <div
            className="absolute inset-y-0 bg-white/15 rounded-full"
            style={{ left: `${confidence.low}%`, right: `${100 - confidence.high}%` }}
          />
        )}
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${c.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, delay: delay + 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {confidence && (
        <div className="flex justify-between text-xs text-gray-700 mt-1">
          <span>{confidence.low}</span>
          <span>{confidence.high}</span>
        </div>
      )}
    </GlassCard>
  );
}
