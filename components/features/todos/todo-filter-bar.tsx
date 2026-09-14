'use client';

import { Select } from '@/components/ui/select';
import { SearchBar } from '@/components/compound/search-bar';
import { PRIORITY_LABELS } from '@/components/compound/priority-badge';
import { cn } from '@/lib/utils/cn';
import {
  PRIORITY_LEVELS,
  TODO_FILTER_STATUSES,
  type Category,
  type PriorityLevel,
  type TodoFilterParams,
  type TodoFilterStatus,
} from '@/lib/types/domain';

/**
 * Phase 3 / Step 3.3 — Todo filter and sort bar.
 *
 * - Status: segmented pill control on desktop (`hidden sm:flex`), full-width
 *   native select on mobile (≤430px, `block sm:hidden`) per plan §3.4.
 * - Search: `SearchBar` with instant clear.
 * - Category and priority dropdowns.
 *
 * The bar is fully controlled: the parent owns `TodoFilterParams` state and
 * receives partial updates through `onFiltersChange`.
 */

const STATUS_LABELS: Record<TodoFilterStatus, string> = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
};

export interface TodoFilterBarProps {
  /** Current filter/sort state. */
  filters: TodoFilterParams;
  /** Receives partial updates; merge into parent state. */
  onFiltersChange: (next: Partial<TodoFilterParams>) => void;
  /** Categories available for filtering. */
  categories: readonly Category[];
  /** Disable all controls (e.g. during a sync). */
  disabled?: boolean;
  className?: string;
}

export function TodoFilterBar({
  filters,
  onFiltersChange,
  categories,
  disabled = false,
  className,
}: TodoFilterBarProps) {
  const update = (patch: Partial<TodoFilterParams>): void => {
    onFiltersChange(patch);
  };

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {/* Row 1: status pills (desktop), status select (mobile), search */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div
          role="group"
          aria-label="Filter by status"
          className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-muted p-1 sm:flex"
        >
          {TODO_FILTER_STATUSES.map((status) => {
            const selected = filters.status === status;

            return (
              <button
                key={status}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => update({ status })}
                className={cn(
                  'cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  selected
                    ? 'border border-border-strong bg-surface text-foreground shadow-sm'
                    : 'border border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>

        <div className="w-full sm:hidden">
          <Select
            value={filters.status}
            onChange={(event) => update({ status: event.target.value as TodoFilterStatus })}
            options={TODO_FILTER_STATUSES.map((status) => ({
              value: status,
              label: STATUS_LABELS[status],
            }))}
            aria-label="Filter by status"
            disabled={disabled}
          />
        </div>

        <SearchBar
          value={filters.searchQuery}
          onValueChange={(searchQuery) => update({ searchQuery })}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          disabled={disabled}
          className="w-full sm:max-w-64"
        />
      </div>

      {/* Row 2: category and priority filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-full sm:w-48">
          <Select
            value={filters.categoryId ?? ''}
            onChange={(event) =>
              update({ categoryId: event.target.value === '' ? null : event.target.value })
            }
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
            aria-label="Filter by category"
            disabled={disabled}
          />
        </div>

        <div className="w-full sm:w-40">
          <Select
            value={filters.priority}
            onChange={(event) => update({ priority: event.target.value as PriorityLevel | 'all' })}
            options={[
              { value: 'all', label: 'All priorities' },
              ...PRIORITY_LEVELS.map((level) => ({ value: level, label: PRIORITY_LABELS[level] })),
            ]}
            aria-label="Filter by priority"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}