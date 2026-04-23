'use client';

import { motion, type MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlassCard({ children, className, ...motionProps }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-white/[0.04] border border-white/[0.08]',
        'shadow-xl shadow-black/20',
        '[backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)]',
        className
      )}
      {...motionProps}
    >
      {/* Top highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
        aria-hidden
      />
      {children}
    </motion.div>
  );
}
