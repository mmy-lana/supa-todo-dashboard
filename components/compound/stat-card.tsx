import type { LucideIcon } from 'lucide-react';
import { CircleAlert, CheckCircle2, Clock, ListTodo } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { formatCompletionRate } from '@/lib/utils/date';
import { type TodoStats } from '@/lib/types/domain';

/**
 * Phase 3 / Step 3.4 — KPI stat cards.
 *
 * `StatCard` is a single presentational metric card; `StatCardGrid` composes
 * the dashboard's four KPIs (Total, Active, Completed, Overdue) plus a
 * completion-rate progress card. Grid breakpoints per plan §3.4: one column on
 * ≤430px, two on 768px (`md`), four on 1024px+ (`lg`).
 */

export type StatCardTone = 'neutral' | 'info' | 'success' | 'danger' | 'warning';

const TONE_STYLES: Record<StatCardTone, { icon: string; value: string }> = {
  neutral: { icon: 'bg-zinc-100 text-zinc-600', value: 'text-foreground' },
  info: { icon: 'bg-sky-100 text-sky-600', value: 'text-foreground' },
  success: { icon: 'bg-emerald-100 text-emerald-600', value: 'text-foreground' },
  danger: { icon: 'bg-red-100 text-red-600', value: 'text-foreground' },
  warning: { icon: 'bg-amber-100 text-amber-600', value: 'text-foreground' },
};

export interface StatCardProps {
  /** Metric label, e.g. "Total Tasks". */
  label: string;
  /** Metric value (number or pre-formatted string). */
  value: number | string;
  /** Optional supporting line, e.g. "3 due today". */
  hint?: string;
  /** Icon rendered in the tinted square. */
  icon: LucideIcon;
  /** Accent tone for the icon container. Defaults to `neutral`. */
  tone?: StatCardTone;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  className,
}: StatCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm',
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight', styles.value)}>
          {value}
        </p>
        {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          styles.icon
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
    </div>
  );
}

export interface CompletionRateCardProps {
  /** Completion percentage in the inclusive range 0–100. */
  rate: number;
  className?: string;
}

export function CompletionRateCard({ rate, className }: CompletionRateCardProps) {
  const clamped = Math.min(100, Math.max(0, rate));
  const display = formatCompletionRate(rate);

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">Completion rate</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{display}</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Completion rate"
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export interface StatCardGridProps {
  /** Aggregated dashboard statistics. */
  stats: TodoStats;
  className?: string;
}

/**
 * The full KPI overview: Total / Active / Completed / Overdue cards plus the
 * completion-rate progress bar card spanning every column.
 */
export function StatCardGrid({ stats, className }: StatCardGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      <StatCard
        label="Total tasks"
        value={stats.total}
        hint={stats.total === 1 ? '1 task' : `${stats.total} tasks`}
        icon={ListTodo}
        tone="neutral"
      />
      <StatCard
        label="Active"
        value={stats.active}
        hint={`${stats.active} in progress`}
        icon={Clock}
        tone="info"
      />
      <StatCard
        label="Completed"
        value={stats.completed}
        hint={stats.total > 0 ? formatCompletionRate(stats.completionRate) : 'No tasks yet'}
        icon={CheckCircle2}
        tone="success"
      />
      <StatCard
        label="Overdue"
        value={stats.overdue}
        hint={stats.overdue > 0 ? 'Past due' : 'Nothing overdue'}
        icon={CircleAlert}
        tone={stats.overdue > 0 ? 'danger' : 'neutral'}
      />
      <CompletionRateCard rate={stats.completionRate} className="md:col-span-2 lg:col-span-4" />
    </div>
  );
}