'use client';

import type { ReactNode } from 'react';
import { CircleAlert, ListTodo, SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * Phase 5 / Step 5.4 — Edge-state panels.
 *
 * The three non-happy-path states for the task list:
 *
 *   1. `EmptyTasksState`    — the workspace has zero tasks (first-run prompt).
 *   2. `EmptyFilteredState` — tasks exist but none match the active filters,
 *      with a one-click reset.
 *   3. `ErrorState`         — a load/sync failure with a manual retry action.
 *
 * All three are presentational; retry/reset behaviour is injected by the owner.
 */

function StateShell({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center',
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export interface EmptyTasksStateProps {
  /** Focuses the quick-create input / opens the composer. */
  onCreateTask?: () => void;
  className?: string;
}

/** First-run state: the workspace contains no tasks at all. */
export function EmptyTasksState({ onCreateTask, className }: EmptyTasksStateProps) {
  return (
    <StateShell
      className={className}
      icon={<ListTodo className="size-6" aria-hidden="true" />}
      title="No tasks yet"
      description="Add your first task above to start tracking what needs to get done."
      action={
        onCreateTask ? (
          <Button type="button" onClick={onCreateTask}>
            Create your first task
          </Button>
        ) : undefined
      }
    />
  );
}

export interface EmptyFilteredStateProps {
  /** Clears every filter back to the neutral view. */
  onResetFilters: () => void;
  /** Optional summary of what is currently being filtered. */
  activeSummary?: string;
  className?: string;
}

/** No-match state: tasks exist, but the current filters/search exclude them. */
export function EmptyFilteredState({
  onResetFilters,
  activeSummary,
  className,
}: EmptyFilteredStateProps) {
  return (
    <StateShell
      className={className}
      icon={<SearchX className="size-6" aria-hidden="true" />}
      title="No matching tasks"
      description={
        activeSummary
          ? `No tasks match ${activeSummary}. Try a different search or clear the filters.`
          : 'No tasks match the current search and filter combination.'
      }
      action={
        <Button type="button" variant="outline" onClick={onResetFilters}>
          Reset filters
        </Button>
      }
    />
  );
}

export interface ErrorStateProps {
  /** Short failure heading. */
  title?: string;
  /** Failure detail shown to the user. */
  message: string;
  /** Re-runs the failed load. */
  onRetry: () => void;
  /** True while the retry request is in flight. */
  isRetrying?: boolean;
  /** Optional dismiss handler for non-blocking failures. */
  onDismiss?: () => void;
  className?: string;
}

/** Blocking failure state with a manual retry action. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  isRetrying = false,
  onDismiss,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center',
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <CircleAlert className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 text-base font-semibold text-red-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-red-700">{message}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onRetry} isLoading={isRetrying} loadingText="Retrying…">
          Try again
        </Button>
        {onDismiss ? (
          <Button type="button" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </div>
    </div>
  );
}