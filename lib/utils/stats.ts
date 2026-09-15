import { isOverdue } from '@/lib/utils/date';
import type { TodoStats, TodoWithCategory } from '@/lib/types/domain';

/**
 * Phase 5 (support) — Todo statistics derivation.
 *
 * Pure function shared by the server-rendered layout/page and the client
 * workspace so the KPI cards, sidebar summary, and progress bar always agree.
 * Kept free of React and Supabase imports so it can run in any runtime.
 */

/** Computes total/active/completed/overdue counts and the completion rate. */
export function computeTodoStats(
  todos: readonly TodoWithCategory[],
  now: Date = new Date()
): TodoStats {
  let active = 0;
  let completed = 0;
  let overdue = 0;

  for (const todo of todos) {
    if (todo.is_completed) {
      completed += 1;
    } else {
      active += 1;
      if (isOverdue(todo.due_date, todo.is_completed, now)) {
        overdue += 1;
      }
    }
  }

  const total = todos.length;
  const completionRate =
    total === 0
      ? 0
      : // Round at the calculation boundary and clamp to the guaranteed
        // 0-100 integer range, so IEEE 754 artifacts (e.g. 66.66666666666667
        // for 2 of 3 tasks) never leak into downstream state and pipelines.
        Math.min(100, Math.max(0, Math.round((completed / total) * 100)));

  return {
    total,
    active,
    completed,
    overdue,
    completionRate,
  };
}

/** Number of tasks belonging to a category (used by the sidebar counts). */
export function countTodosByCategory(
  todos: readonly TodoWithCategory[],
  categoryId: string
): number {
  return todos.filter((todo) => todo.category_id === categoryId).length;
}