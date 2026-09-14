'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet } from '@/components/ui/sheet';
import { DatePickerTrigger } from '@/components/compound/date-picker-trigger';
import { ErrorBanner } from '@/components/compound/error-banner';
import { PRIORITY_DOT_CLASSES, PRIORITY_LABELS } from '@/components/compound/priority-badge';
import { cn } from '@/lib/utils/cn';
import { formatAbsoluteTimestamp } from '@/lib/utils/date';
import { getErrorMessage, getFieldErrors, getFieldError } from '@/lib/utils/errors';
import {
  PRIORITY_LEVELS,
  UpdateTodoSchema,
  type Category,
  type DomainResult,
  type PriorityLevel,
  type TodoWithCategory,
  type UpdateTodoInput,
} from '@/lib/types/domain';

/**
 * Phase 4 / Step 4.4 — Task details and edit sheet.
 *
 * Responsive slide-over (bottom sheet on mobile, right panel on desktop)
 * editing title, description, category, priority, and due date, with
 * read-only Created / Last modified / Completed timestamps. Deletion is
 * confirmable inline and, once confirmed, handed to the parent's optimistic
 * `deleteTodo`. Save runs through `UpdateTodoSchema`; field and banner errors
 * are fully wired.
 */

export interface TodoDetailsSheetProps {
  /** Selected task, or `null` when the sheet is closed. */
  todo: TodoWithCategory | null;
  /** Open state for the underlying Sheet (parent-controlled). */
  onOpenChange: (open: boolean) => void;
  /** Categories available for reassignment. */
  categories: readonly Category[];
  /** Persists edits; returns a `DomainResult` the sheet can surface. */
  onSave: (id: string, input: UpdateTodoInput) => Promise<DomainResult<TodoWithCategory>>;
  /** Deletes the task (parent applies the optimistic removal). */
  onDelete: (id: string) => Promise<DomainResult<null>>;
}

interface TodoDetailsFormState {
  title: string;
  description: string;
  categoryId: string;
  priority: PriorityLevel;
  dueDate: string | null;
}

function extractFormState(todo: TodoWithCategory): TodoDetailsFormState {
  return {
    title: todo.title,
    description: todo.description ?? '',
    categoryId: todo.category_id ?? '',
    priority: todo.priority,
    dueDate: todo.due_date,
  };
}

export function TodoDetailsSheet({
  todo,
  onOpenChange,
  categories,
  onSave,
  onDelete,
}: TodoDetailsSheetProps) {
  const [form, setForm] = useState<TodoDetailsFormState>({
    title: '',
    description: '',
    categoryId: '',
    priority: 'medium',
    dueDate: null,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const previousTodoIdRef = useRef<string | null | undefined>(undefined);

  // Reset the editor whenever a *different* task is selected (or reselected
  // after closing). In-place row refreshes keep the user's in-progress edits.
  useEffect(() => {
    const id = todo?.id ?? null;
    if (id !== previousTodoIdRef.current) {
      previousTodoIdRef.current = id;
      if (todo) {
        setForm(extractFormState(todo));
        setSaveError(null);
        setFieldErrors({});
        setConfirmingDelete(false);
        setIsSaving(false);
        setIsDeleting(false);
      }
    }
  }, [todo]);

  const open = todo !== null;

  const isDirty = todo
    ? form.title.trim() !== todo.title ||
      form.description !== (todo.description ?? '') ||
      form.categoryId !== (todo.category_id ?? '') ||
      form.priority !== todo.priority ||
      form.dueDate !== todo.due_date
    : false;

  const updateField = <K extends keyof TodoDetailsFormState>(
    key: K,
    value: TodoDetailsFormState[K]
  ): void => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!todo || isSaving || isDeleting) {
      return;
    }

    setSaveError(null);
    setFieldErrors({});

    const candidate: Parameters<typeof UpdateTodoSchema.safeParse>[0] = {
      title: form.title,
      description: form.description === '' ? null : form.description,
      category_id: form.categoryId === '' ? null : form.categoryId,
      priority: form.priority,
      due_date: form.dueDate,
    };

    const parsed = UpdateTodoSchema.safeParse(candidate);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setIsSaving(true);

    try {
      const result = await onSave(todo.id, parsed.data as UpdateTodoInput);

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }

      onOpenChange(false);
    } catch (submitError) {
      setSaveError(getErrorMessage(submitError, 'Could not save your changes. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!todo || isDeleting || isSaving) {
      return;
    }

    setSaveError(null);
    setIsDeleting(true);

    try {
      const result = await onDelete(todo.id);

      if (!result.ok) {
        setSaveError(result.error);
        setConfirmingDelete(false);
        return;
      }

      onOpenChange(false);
    } catch (deleteError) {
      setSaveError(getErrorMessage(deleteError, 'Could not delete the task. Please try again.'));
      setConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={todo?.title ?? 'Task details'}
      description="Edit the task details below."
      side="responsive"
      size="md"
      headerAction={
        todo ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setConfirmingDelete(true)}
            disabled={isSaving || isDeleting}
            aria-label="Delete task"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        ) : undefined
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="todo-details-form"
            isLoading={isSaving}
            loadingText="Saving…"
            disabled={!isDirty || isDeleting}
          >
            Save changes
          </Button>
        </div>
      }
    >
      {todo ? (
        <form id="todo-details-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="flex flex-col gap-4">
            {saveError ? (
              <ErrorBanner
                title="Could not save"
                message={saveError}
                onDismiss={() => setSaveError(null)}
              />
            ) : null}

            <Input
              label="Title"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              maxLength={255}
              disabled={isSaving || isDeleting}
              invalid={getFieldError(fieldErrors, 'title') !== null}
              errorMessage={getFieldError(fieldErrors, 'title')}
            />

            <Textarea
              label="Description"
              rows={5}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              maxLength={2000}
              disabled={isSaving || isDeleting}
              placeholder="Add a longer description…"
            />

            <div className="w-full">
              <Select
                label="Category"
                value={form.categoryId}
                onChange={(event) => updateField('categoryId', event.target.value)}
                options={categoryOptions}
                disabled={isSaving || isDeleting}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Priority</span>
              <div role="group" aria-label="Priority" className="flex items-center gap-1">
                {PRIORITY_LEVELS.map((level) => {
                  const selected = form.priority === level;

                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Priority: ${PRIORITY_LABELS[level]}`}
                      title={PRIORITY_LABELS[level]}
                      disabled={isSaving || isDeleting}
                      onClick={() => updateField('priority', level)}
                      className={cn(
                        'flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        'disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:none)]:size-11',
                        selected ? 'border-foreground bg-muted' : 'border-transparent hover:bg-muted'
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
            </div>

            <DatePickerTrigger
              value={form.dueDate}
              onValueChange={(dueDate) => updateField('dueDate', dueDate)}
              disabled={isSaving || isDeleting}
            />

            {/* Read-only timestamps */}
            <dl className="grid grid-cols-1 gap-2.5 rounded-lg border border-border bg-muted/50 p-3.5 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created
                </dt>
                <dd className="mt-0.5 text-foreground">{formatAbsoluteTimestamp(todo.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Last modified
                </dt>
                <dd className="mt-0.5 text-foreground">{formatAbsoluteTimestamp(todo.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Completed
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {formatAbsoluteTimestamp(todo.completed_at)}
                </dd>
              </div>
            </dl>

            {/* Inline destructive confirm */}
            {confirmingDelete ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">Delete this task?</p>
                <p className="mt-1 text-sm text-red-700">
                  “{todo.title}” will be permanently removed. This action cannot be undone.
                </p>
                <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    isLoading={isDeleting}
                    loadingText="Deleting…"
                    onClick={() => void handleDelete()}
                  >
                    Delete task
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </form>
      ) : null}
    </Sheet>
  );
}