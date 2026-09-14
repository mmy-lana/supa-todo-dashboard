import { PRIORITY_LEVELS } from '@/lib/types/domain';
import { isOverdue } from '@/lib/utils/date';
import type {
  TodoFilterParams,
  TodoWithCategory,
} from '@/lib/types/domain';

/**
 * Phase 5 (support) — Client-side filtering and sorting for the task list.
 *
 * Pure and React-free so it can be unit-tested and reused by any surface.
 * Sorting is total and stable: every comparator ends with a `created_at`
 * tie-break so rows never jump between renders.
 */

/** Priority rank for sorting — higher is more urgent. */
const PRIORITY_RANK: Record<string, number> = PRIORITY_LEVELS.reduce<Record<string, number>>(
  (accumulator, level, index) => {
    accumulator[level] = index;
    return accumulator;
  },
  {}
);

function compareNullableDates(
  a: string | null,
  b: string | null,
  direction: 1 | -1
): number {
  // Tasks without a due date sort last regardless of direction.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;

  return (aTime - bTime) * direction;
}

function matchesSearch(todo: TodoWithCategory, query: string): boolean {
  if (query === '') {
    return true;
  }

  const haystack = [
    todo.title,
    todo.description ?? '',
    todo.category?.name ?? '',
    todo.priority,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

/**
 * Applies status/category/priority/search filters, then sorts the result.
 *
 * @param todos   - the full task list held in state.
 * @param filters - the active filter + sort parameters.
 * @param now     - injectable clock (keeps overdue filtering deterministic).
 */
export function applyTodoFilters(
  todos: readonly TodoWithCategory[],
  filters: TodoFilterParams,
  now: Date = new Date()
): TodoWithCategory[] {
  const query = filters.searchQuery.trim().toLowerCase();

  const filtered = todos.filter((todo) => {
    if (filters.status === 'active' && todo.is_completed) {
      return false;
    }

    if (filters.status === 'completed' && !todo.is_completed) {
      return false;
    }

    if (filters.categoryId !== null && todo.category_id !== filters.categoryId) {
      return false;
    }

    if (filters.priority !== 'all' && todo.priority !== filters.priority) {
      return false;
    }

    if (!matchesSearch(todo, query)) {
      return false;
    }

    return true;
  });

  const direction = filters.sortDirection === 'asc' ? 1 : -1;

  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;

    switch (filters.sortBy) {
      case 'position':
        comparison = a.position - b.position;
        break;
      case 'priority':
        comparison =
          (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0);
        break;
      case 'due_date':
        comparison = compareNullableDates(a.due_date, b.due_date, 1);
        break;
      case 'created_at':
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      default:
        comparison = 0;
    }

    if (comparison !== 0) {
      return comparison * direction;
    }

    // Stable tie-break so equal keys never reorder unpredictably.
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return sorted;
}

/** `true` when any filter deviates from the neutral dashboard view. */
export function hasActiveFilters(filters: TodoFilterParams): boolean {
  return (
    filters.status !== 'all' ||
    filters.categoryId !== null ||
    filters.priority !== 'all' ||
    filters.searchQuery.trim() !== ''
  );
}

/** Counts unfinished tasks past their due date (for the overdue KPI). */
export function countOverdue(
  todos: readonly TodoWithCategory[],
  now: Date = new Date()
): number {
  return todos.filter((todo) => isOverdue(todo.due_date, todo.is_completed, now)).length;
}