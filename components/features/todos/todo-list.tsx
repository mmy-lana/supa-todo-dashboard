'use client';

import { TodoItem } from '@/components/features/todos/todo-item';
import { TodoListSkeleton } from '@/components/features/todos/todo-list-skeleton';
import {
  EmptyFilteredState,
  EmptyTasksState,
  ErrorState,
} from '@/components/features/todos/todo-empty-states';
import { hasActiveFilters } from '@/lib/utils/todo-filters';
import type { TodoFilterParams, TodoWithCategory } from '@/lib/types/domain';

/**
 * Phase 5 / Step 5.3 + 5.4 — Task list with complete edge-state handling.
 *
 * State precedence (each state is mutually exclusive, so the user never sees
 * two competing messages):
 *
 *   1. `isLoading` with no rows   -> skeleton rows
 *   2. `error` with no rows       -> blocking error + retry
 *   3. zero tasks overall         -> first-run empty state
 *   4. zero tasks after filtering -> filtered-empty state + reset
 *   5. rows                       -> task items
 */

export interface TodoListProps {
  /** Tasks to render (already filtered and sorted by the owner). */
  todos: readonly TodoWithCategory[];
  /** Total task count before filtering; distinguishes empty-state variants. */
  totalCount: number;
  /** Active filter parameters (used to summarise the filtered-empty state). */
  filters: TodoFilterParams;
  /** Initial server-side load still in flight. */
  isLoading?: boolean;
  /** Load/sync failure message, or `null`. */
  error?: string | null;
  /** Re-runs the failed load. */
  onRetry: () => void;
  /** True while a retry is in flight. */
  isRetrying?: boolean;
  /** Clears the error state. */
  onDismissError?: () => void;
  /** Clears all filters (filtered-empty reset action). */
  onResetFilters: () => void;
  /** Toggles completion (optimistic). */
  onToggleTodo: (todoId: string, currentStatus: boolean) => void;
  /** Opens the details/edit drawer. */
  onOpenDetails: (todoId: string) => void;
  /** Deletes a task (owner confirms and persists). */
  onDeleteTodo: (todoId: string) => void;
  /** Focuses the quick-create input from the first-run empty state. */
  onCreateTask?: () => void;
  /** Disables row interactions while a mutation is in flight. */
  disabled?: boolean;
}

/** Builds a short, human description of the active filters. */
function describeFilters(filters: TodoFilterParams): string | undefined {
  const parts: string[] = [];

  if (filters.searchQuery.trim() !== '') {
    parts.push(`“${filters.searchQuery.trim()}”`);
  }
  if (filters.status !== 'all') {
    parts.push(`the ${filters.status} filter`);
  }
  if (filters.priority !== 'all') {
    parts.push(`${filters.priority} priority`);
  }
  if (filters.categoryId !== null) {
    parts.push('the selected category');
  }

  if (parts.length === 0) {
    return undefined;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function TodoList({
  todos,
  totalCount,
  filters,
  isLoading = false,
  error = null,
  onRetry,
  isRetrying = false,
  onDismissError,
  onResetFilters,
  onToggleTodo,
  onOpenDetails,
  onDeleteTodo,
  onCreateTask,
  disabled = false,
}: TodoListProps) {
  if (isLoading && todos.length === 0) {
    return <TodoListSkeleton rows={5} />;
  }

  if (error !== null && todos.length === 0) {
    return (
      <ErrorState
        title="Could not load your tasks"
        message={error}
        onRetry={onRetry}
        isRetrying={isRetrying}
        onDismiss={onDismissError}
      />
    );
  }

  if (totalCount === 0) {
    return <EmptyTasksState onCreateTask={onCreateTask} />;
  }

  if (todos.length === 0 && hasActiveFilters(filters)) {
    return (
      <EmptyFilteredState
        onResetFilters={onResetFilters}
        activeSummary={describeFilters(filters)}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Tasks">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggleTodo}
          onOpenDetails={onOpenDetails}
          onDelete={onDeleteTodo}
          disabled={disabled}
        />
      ))}
    </ul>
  );
}