'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { ContextualMoment, BrainRegion } from '@/lib/types';

const REGION_STYLE: Record<BrainRegion, { label: string; color: string; bg: string; hex: string }> = {
  visual:     { label: 'Visual Cortex',     color: 'text-purple-400',  bg: 'bg-purple-500/15',  hex: '#a855f7' },
  auditory:   { label: 'Auditory Cortex',   color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    hex: '#22d3ee' },
  linguistic: { label: 'Language Areas',    color: 'text-pink-400',    bg: 'bg-pink-500/15',    hex: '#ec4899' },
  attention:  { label: 'Attention Network', color: 'text-blue-400',    bg: 'bg-blue-500/15',    hex: '#60a5fa' },
  emotion:    { label: 'Limbic System',     color: 'text-amber-400',   bg: 'bg-amber-500/15',   hex: '#fbbf24' },
  memory:     { label: 'Default Mode Net',  color: 'text-emerald-400', bg: 'bg-emerald-500/15', hex: '#34d399' },
  executive:  { label: 'Prefrontal Ctx',    color: 'text-violet-400',  bg: 'bg-violet-500/15',  hex: '#c084fc' },
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

interface MomentFeedProps {
  moments: ContextualMoment[];
  currentTime: number;
  onSeek?: (t: number) => void;
}

export default function MomentFeed({ moments, currentTime, onSeek }: MomentFeedProps) {
  const scrollRef    = useRef<HTMLDivElement>(null);
  const activeIndex  = moments.findLastIndex(m => currentTime >= m.t);
  const currentIndex = moments.findIndex(m => currentTime >= m.t && currentTime < m.t + m.dur);

  // Auto-scroll to active card
  useEffect(() => {
    if (activeIndex < 0 || !scrollRef.current) return;
    const card = scrollRef.current.children[activeIndex] as HTMLElement;
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1">
        Contextual moments
      </p>
      <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {moments.map((m, i) => {
          const isActive = i === currentIndex;
          const isPast   = currentTime > m.t + m.dur;
          const primary  = REGION_STYLE[m.regions[0]];

          return (
            <motion.button
              key={i}
              onClick={() => onSeek?.(m.t)}
              animate={{ opacity: isPast ? 0.45 : 1, scale: isActive ? 1.02 : 1 }}
              transition={{ duration: 0.2 }}
              className={`flex-shrink-0 w-52 p-3.5 rounded-xl border text-left transition-colors duration-200 ${
                isActive
                  ? 'border-white/20 bg-white/6'
                  : 'border-white/6 bg-white/2 hover:bg-white/5'
              }`}
            >
              {/* Timestamp + live dot */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primary.hex }} />
                <span className="text-[10px] text-gray-500 font-mono">{fmt(m.t)}</span>
                {isActive && (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full ml-auto"
                    style={{ backgroundColor: primary.hex }}
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Label */}
              <p className="text-sm font-semibold text-white leading-tight mb-1.5">{m.label}</p>

              {/* Detail */}
              <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">{m.detail}</p>

              {/* Region tags */}
              <div className="flex flex-wrap gap-1 mt-2.5">
                {m.regions.map(r => {
                  const s = REGION_STYLE[r];
                  return (
                    <span key={r} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${s.bg} ${s.color}`}>
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
