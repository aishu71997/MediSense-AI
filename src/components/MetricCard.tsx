import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  unit: string;
  icon: React.ReactNode;
  color: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'indigo';
  subtitle?: string;
  onClick?: () => void;
  compact?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  unit,
  icon,
  color,
  subtitle,
  onClick,
  compact = false,
}) => {
  const colorMap = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
    rose: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    amber: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    purple: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
  };

  return (
    <motion.div
      id={id}
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      whileHover={{ y: -5, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.985 }}
      transition={{ 
        layout: { type: 'spring', stiffness: 280, damping: 28 },
        type: 'spring',
        stiffness: 260,
        damping: 26
      }}
      className={`${compact ? 'p-3.5 rounded-xl' : 'p-6 rounded-2xl'} border bg-white dark:bg-slate-900/60 shadow-xs ${
        onClick ? 'cursor-pointer' : ''
      } border-slate-100 dark:border-slate-800/85 transition-all`}
      onClick={onClick}
    >
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
        <span className={`font-medium text-slate-500 dark:text-slate-400 ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
        <div className={`rounded-xl border ${compact ? 'p-1.5' : 'p-2.5'} ${colorMap[color]}`}>{icon}</div>
      </div>
      <div className={`flex items-baseline gap-1.5 overflow-hidden relative ${compact ? 'h-8' : 'h-10'}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(value)}
            initial={{ y: 24, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`font-semibold tracking-tight text-slate-900 dark:text-white inline-block ${compact ? 'text-xl md:text-2xl' : 'text-3xl'}`}
          >
            {value !== null && value !== undefined && value !== '' ? value : '--'}
          </motion.span>
        </AnimatePresence>
        <span className={`font-medium text-slate-400 dark:text-slate-505 self-end ${compact ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>{unit}</span>
      </div>
      {subtitle && (
        <p className={`font-mono text-slate-405 dark:text-slate-505 ${compact ? 'mt-1 text-[10px]' : 'mt-2 text-xs'}`}>{subtitle}</p>
      )}
    </motion.div>
  );
};
export default MetricCard;
