'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * Phase 3 / Step 3.1 (action trigger) — Ellipsis actions menu.
 *
 * Accessible popover menu anchored under a 44px ellipsis trigger:
 * `aria-haspopup="menu"` / `aria-expanded`, `role="menu"` items, first-item
 * focus on open, Escape to close with focus return, and outside-pointer close.
 * Actions are plain callbacks — the parent decides whether they open the
 * details sheet (edit) or a confirmation flow (delete).
 */

export interface TodoItemActionsProps {
  /** Open the task details/edit flow. */
  onEdit: () => void;
  /** Request deletion of the task. */
  onDelete: () => void;
  /** Disables the trigger (e.g. during an in-flight mutation). */
  disabled?: boolean;
  /** Accessible label for the trigger button. */
  ariaLabel?: string;
  className?: string;
}

const MENU_ITEM_CLASSES =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function TodoItemActions({
  onEdit,
  onDelete,
  disabled = false,
  ariaLabel = 'Task actions',
  className,
}: TodoItemActionsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const runAction = (action: () => void): void => {
    setOpen(false);
    action();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    // Move focus into the menu for keyboard users.
    const frame = requestAnimationFrame(() => {
      firstItemRef.current?.focus();
    });

    const handlePointerDown = (event: MouseEvent | TouchEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    // Capture phase: win over page-level handlers (e.g. a details sheet).
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className="absolute right-0 top-full z-30 mt-1.5 min-w-44 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg animate-fade-in"
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => runAction(onEdit)}
            className={MENU_ITEM_CLASSES}
          >
            <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Edit details
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onDelete)}
            className={cn(MENU_ITEM_CLASSES, 'text-red-600 hover:bg-red-50')}
          >
            <Trash2 className="size-4 shrink-0" aria-hidden="true" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}