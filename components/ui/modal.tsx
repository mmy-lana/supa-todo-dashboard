'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { useDialogBehavior, type FocusableRef } from '@/components/ui/dialog-utils';

/**
 * Phase 2 / Step 2.4 — Modal primitive.
 *
 * Accessible dialog: `role="dialog"` + `aria-modal`, labelled by `title`,
 * described by an optional `description`, with a focus trap, Escape-to-close,
 * backdrop click-to-close, body scroll lock, and focus restore on close.
 * Rendered through a portal into `document.body` (mounted client-side only).
 */

export type ModalSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export interface ModalProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Called with `false` when the user requests closing. */
  onOpenChange: (open: boolean) => void;
  /** Dialog title — becomes the accessible name (`aria-labelledby`). */
  title: string;
  /** Optional paragraph rendered under the title; becomes the description. */
  description?: string;
  /** Controls panel width. Defaults to `md`. */
  size?: ModalSize;
  /** Body content. */
  children: ReactNode;
  /** Optional action row rendered at the bottom of the dialog. */
  footer?: ReactNode;
  /** Closes when the backdrop is clicked. Defaults to `true`. */
  closeOnBackdropClick?: boolean;
  /** Closes on Escape. Defaults to `true`. */
  closeOnEscape?: boolean;
  /** Element to focus on open; defaults to the dialog panel. */
  initialFocusRef?: FocusableRef;
  /** Extra classes applied to the panel. */
  className?: string;
  /** Accessible label for the close button. */
  closeButtonLabel?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  initialFocusRef,
  className,
  closeButtonLabel = 'Close dialog',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useDialogBehavior({ open, panelRef, onOpenChange, closeOnEscape, initialFocusRef });

  const titleId = useId();
  const descriptionId = useId();

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        data-backdrop=""
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (closeOnBackdropClick && event.target === event.currentTarget) {
            onOpenChange(false);
          }
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-state="open"
        className={cn(
          'relative z-10 m-auto max-h-[calc(100dvh-2rem)] w-full animate-scale-in overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl outline-none',
          SIZE_CLASSES[size],
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={closeButtonLabel}
            className="-mr-1 -mt-1 shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export default Modal;