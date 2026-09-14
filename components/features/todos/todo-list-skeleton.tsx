import { Skeleton } from '@/components/ui/skeleton';

/**
 * Phase 5 / Step 5.4 — Loading skeleton for the task list.
 *
 * Renders placeholder rows whose height mirrors a real `TodoItem` (44px
 * checkbox row plus a wrapped badge row) so there is no layout shift when the
 * real data arrives.
 */

export interface TodoListSkeletonProps {
  /** Number of placeholder rows. Defaults to 5 (per plan §5.4). */
  rows?: number;
  className?: string;
}

export function TodoListSkeleton({ rows = 5, className }: TodoListSkeletonProps) {
  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading tasks"
    >
      <span className="sr-only">Loading tasks…</span>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className="rounded-xl border border-border bg-surface px-1.5 py-1 sm:px-2"
          >
            <div className="flex items-start gap-1">
              <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
                <Skeleton className="size-5 rounded-md" />
              </div>
              <div className="min-w-0 flex-1 py-2.5">
                <Skeleton className="h-4 w-3/5 max-w-48" />
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-11">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
              <div className="flex min-h-11 items-start pt-1.5">
                <Skeleton className="size-10 rounded-lg" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Skeleton placeholder for the KPI stat card grid. */
export function StatCardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-7 w-12" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
          <Skeleton className="size-10 rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-20 rounded-xl md:col-span-2 lg:col-span-4" />
    </div>
  );
}