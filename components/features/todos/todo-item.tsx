'use client';

import { CalendarDays, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryTag } from '@/components/compound/category-tag';
import { PriorityBadge } from '@/components/compound/priority-badge';
import { TodoItemActions } from '@/components/features/todos/todo-item-actions';
import { cn } from '@/lib/utils/cn';
import { formatDueDate, isDueToday, isOverdue } from '@/lib/utils/date';
import { type TodoWithCategory } from '@/lib/types/domain';

/**
 * Phase 3 / Step 3.1 — Task item row.
 *
 * Two-row responsive structure (plan §3.4):
 *
 *   Row 1: 44px checkbox tap zone + truncated title + 44px ellipsis trigger.
 *   Row 2: wrapping badges (Priority, Category, Due Date) offset by `pl-11`
 *          to align under the title.
 *
 * Completed rows render strike-through text at 70% opacity; overdue,
 * unfinished tasks gain a prominent red "Overdue" tag. The title block opens
 * the details flow; the checkbox toggles completion optimistically at the
 * parent (Phase 4 hook).
 */

export interface TodoItemProps {
  /** Task to render, with its (possibly null) joined category. */
  todo: TodoWithCategory;
  /** Flip the completion state optimistically. */
  onToggle: (todoId: string, currentStatus: boolean) => void;
  /** Open the details/edit sheet for this task. */
  onOpenDetails: (todoId: string) => void;
  /** Request deletion (parent confirms and persists). */
  onDelete: (todoId: string) => void;
  /** Disable interactions while a mutation is in flight. */
  disabled?: boolean;
  className?: string;
}

export function TodoItem({
  todo,
  onToggle,
  onOpenDetails,
  onDelete,
  disabled = false,
  className,
}: TodoItemProps) {
  const completed = todo.is_completed;
  const overdue = isOverdue(todo.due_date, completed);
  const dueToday = isDueToday(todo.due_date, completed);

  return (
    <li
      data-todo-id={todo.id}
      className={cn(
        'group relative rounded-xl border border-border bg-surface transition-colors hover:border-border-strong focus-within:border-border-strong',
        completed && 'opacity-70',
        className
      )}
    >
      <div className="flex items-start gap-1 px-1.5 py-1 sm:px-2">
        {/* 44px checkbox tap zone (Row 1, left) */}
        <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
          <Checkbox
            checked={completed}
            onChange={() => onToggle(todo.id, completed)}
            disabled={disabled}
            aria-label={`Mark "${todo.title}" as ${completed ? 'active' : 'completed'}`}
          />
        </div>

        {/* Title block — click opens details (Row 1 center + Row 2 badges) */}
        <button
          type="button"
          onClick={() => onOpenDetails(todo.id)}
          disabled={disabled}
          aria-label={`Open details for "${todo.title}"`}
          className="min-w-0 flex-1 rounded-md py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={cn(
              'block max-w-[200px] truncate text-sm font-medium text-foreground sm:max-w-md',
              completed && 'line-through decoration-zinc-400 decoration-2'
            )}
          >
            {todo.title}
          </span>

          {/* Row 2 — wrapping badges aligned under the title */}
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-11">
            {overdue ? (
              <Badge variant="solid" tone="danger">
                <TriangleAlert className="-ml-0.5 size-3" aria-hidden="true" />
                Overdue
              </Badge>
            ) : null}

            <PriorityBadge priority={todo.priority} variant="subtle" />

            <CategoryTag category={todo.category} variant="subtle" showUncategorized={false} />

            {todo.due_date ? (
              <Badge
                variant="outline"
                tone={overdue ? 'danger' : dueToday ? 'medium' : 'neutral'}
              >
                <CalendarDays className="-ml-0.5 size-3" aria-hidden="true" />
                {formatDueDate(todo.due_date)}
              </Badge>
            ) : null}
          </span>
        </button>

        {/* 44px action trigger (Row 1, right) */}
        <div className="flex min-h-11 items-start pt-1.5">
          <TodoItemActions
            onEdit={() => onOpenDetails(todo.id)}
            onDelete={() => onDelete(todo.id)}
            disabled={disabled}
            ariaLabel={`Actions for "${todo.title}"`}
            className="-mr-1 -mt-1"
          />
        </div>
      </div>
    </li>
  );
}