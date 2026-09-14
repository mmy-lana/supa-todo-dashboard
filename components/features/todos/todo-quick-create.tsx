'use client';

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PRIORITY_LABELS } from '@/components/compound/priority-badge';
import { cn } from '@/lib/utils/cn';
import { formatZodError, getErrorMessage } from '@/lib/utils/errors';
import {
  CreateTodoSchema,
  PRIORITY_LEVELS,
  type Category,
  type CreateTodoInput,
  type PriorityLevel,
} from '@/lib/types/domain';

/**
 * Phase 3 / Step 3.2 — Task quick-create bar.
 *
 * Inline creation: title input (Enter submits), embedded category selector and
 * priority toggle buttons, and an explicit add button. Submission is validated
 * through `CreateTodoSchema` — parsed payloads flow to `onSubmit`, which the
 * owner (dashboard) persists via the todo hook. The input clears on success
 * and keeps focus for rapid entry.
 */

const PRIORITY_DOT_CLASSES: Record<PriorityLevel, string> = {
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
  urgent: 'bg-priority-urgent',
};

export interface TodoQuickCreateProps {
  /** Categories the user can assign; rendered in the embedded selector. */
  categories: readonly Category[];
  /** Initial priority selection. Defaults to `medium`. */
  defaultPriority?: PriorityLevel;
  /**
   * Persists a validated task. May return a promise; the bar shows a pending
   * state until it settles and only then clears the input.
   */
  onSubmit: (input: CreateTodoInput) => Promise<void> | void;
  /** Autofocus the title input on mount. */
  autoFocus?: boolean;
  /** Disable every control (e.g. while offline or during sync). */
  disabled?: boolean;
  className?: string;
}

export function TodoQuickCreate({
  categories,
  defaultPriority = 'medium',
  onSubmit,
  autoFocus = false,
  disabled = false,
  className,
}: TodoQuickCreateProps) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>(defaultPriority);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (disabled || isSubmitting) {
      return;
    }

    setError(null);

    const parsed = CreateTodoSchema.safeParse({
      title,
      category_id: categoryId === '' ? null : categoryId,
      priority,
    });

    if (!parsed.success) {
      setError(formatZodError(parsed.error));
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(parsed.data);
      setTitle('');
      setCategoryId('');
      setPriority(defaultPriority);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, 'Could not add the task. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={cn('rounded-xl border border-border bg-surface p-2.5 shadow-sm', className)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
        <Input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task and press Enter"
          aria-label="New task title"
          autoFocus={autoFocus}
          disabled={disabled || isSubmitting}
          maxLength={255}
          className="sm:flex-1"
        />

        <div className="w-full sm:w-44">
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            options={categoryOptions}
            aria-label="Category"
            disabled={disabled || isSubmitting}
          />
        </div>

        <div
          role="group"
          aria-label="Priority"
          className="flex items-center gap-1 self-start sm:self-auto"
        >
          {PRIORITY_LEVELS.map((level) => {
            const selected = priority === level;

            return (
              <button
                key={level}
                type="button"
                aria-pressed={selected}
                aria-label={`Priority: ${PRIORITY_LABELS[level]}`}
                title={PRIORITY_LABELS[level]}
                disabled={disabled || isSubmitting}
                onClick={() => setPriority(level)}
                className={cn(
                  'flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:none)]:size-11',
                  selected
                    ? 'border-foreground bg-muted'
                    : 'border-transparent hover:bg-muted'
                )}
              >
                <span
                  className={cn('size-2.5 rounded-full', PRIORITY_DOT_CLASSES[level])}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        <Button
          type="submit"
          size="sm"
          isLoading={isSubmitting}
          loadingText="Adding"
          disabled={disabled}
          aria-label="Add task"
          className="self-start sm:self-auto [@media(hover:none)]:min-w-11"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 px-1 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}