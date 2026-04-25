'use client';

import { forwardRef, useState } from 'react';
import type { ContextualMoment, BrainRegion } from '@/lib/types';

const REGION_HEX: Record<BrainRegion, string> = {
  visual:     '#a855f7',
  auditory:   '#22d3ee',
  linguistic: '#ec4899',
  attention:  '#60a5fa',
  emotion:    '#fbbf24',
  memory:     '#34d399',
  executive:  '#c084fc',
};

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return m?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ?? null;
}

interface VideoPlayerProps {
  url: string;
  moments?: ContextualMoment[];
  onTimeUpdate?: (t: number) => void;
  onDuration?: (d: number) => void;
  className?: string;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer({ url, moments = [], onTimeUpdate, onDuration, className = '' }, ref) {
    const [duration, setDuration] = useState(0);

    const ytId = extractYouTubeId(url);
    const viId = extractVimeoId(url);

    if (ytId) {
      return (
        <div className={`relative bg-black rounded-xl overflow-hidden ${className}`}>
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?rel=0`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="px-3 py-2 bg-black/60 text-center">
            <span className="text-[11px] text-gray-500">Brain sync requires a direct video URL — animation runs on auto-clock</span>
          </div>
        </div>
      );
    }

    if (viId) {
      return (
        <div className={`relative bg-black rounded-xl overflow-hidden ${className}`}>
          <div className="aspect-video">
            <iframe
              src={`https://player.vimeo.com/video/${viId}`}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    return (
      <div className={`bg-black rounded-xl overflow-hidden ${className}`}>
        <video
          ref={ref}
          src={url}
          className="w-full"
          controls
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
          onDurationChange={(e) => {
            setDuration(e.currentTarget.duration);
            onDuration?.(e.currentTarget.duration);
          }}
        />

        {/* Moment marker strip */}
        {duration > 0 && moments.length > 0 && (
          <div className="relative h-6 bg-black/80 px-3 flex items-center">
            <div className="relative w-full h-0.5 bg-white/10 rounded-full">
              {moments.map((m, i) => (
                <div
                  key={i}
                  title={m.label}
                  className="absolute -translate-x-1/2 -top-1.5 w-3 h-3 rounded-full border-2 border-black/80"
                  style={{
                    left: `${(m.t / duration) * 100}%`,
                    backgroundColor: REGION_HEX[m.regions[0]],
                    boxShadow: `0 0 5px ${REGION_HEX[m.regions[0]]}`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);
