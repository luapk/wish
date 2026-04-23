'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import GlassCard from './GlassCard';

type Color = 'purple' | 'cyan' | 'pink' | 'green';

const palette: Record<Color, { iconWrap: string; icon: string; badge: string; bar: string }> = {
  purple: {
    iconWrap: 'bg-purple-500/10',
    icon: 'text-purple-400',
    badge: 'bg-purple-500/10 text-purple-400',
    bar: 'from-purple-500 to-violet-400',
  },
  cyan: {
    iconWrap: 'bg-cyan-500/10',
    icon: 'text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400',
    bar: 'from-cyan-500 to-blue-400',
  },
  pink: {
    iconWrap: 'bg-pink-500/10',
    icon: 'text-pink-400',
    badge: 'bg-pink-500/10 text-pink-400',
    bar: 'from-pink-500 to-rose-400',
  },
  green: {
    iconWrap: 'bg-green-500/10',
    icon: 'text-green-400',
    badge: 'bg-green-500/10 text-green-400',
    bar: 'from-green-500 to-emerald-400',
  },
};

function level(value: number) {
  if (value >= 80) return 'Critical';
  if (value >= 60) return 'High';
  if (value >= 40) return 'Moderate';
  return 'Low';
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: Color;
  delay?: number;
}

export default function MetricCard({ label, value, icon: Icon, color, delay = 0 }: MetricCardProps) {
  const c = palette[color];

  return (
    <GlassCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${c.iconWrap}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.badge}`}>
          {level(value)}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white tabular-nums">{value}</span>
          <span className="text-sm text-gray-500">/ 100</span>
        </div>
        <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      </div>

      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${c.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, delay: delay + 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
    </GlassCard>
  );
}
