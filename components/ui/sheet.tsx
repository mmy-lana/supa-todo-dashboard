'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { useDialogBehavior, type FocusableRef } from '@/components/ui/dialog-utils';

/**
 * Phase 2 / Step 2.4 — Sheet primitive.
 *
 * Slide-over drawer with three presentation modes (plan §3.4):
 *
 *   - `responsive` (default): a bottom sheet on mobile (slides up, full width,
 *     rounded top, 44px+ reachable), a right-hand panel on `sm+` (slides in
 *     from the right).
 *   - `bottom` / `right`: force one mode regardless of viewport.
 *
 * Shares the dialog accessibility contract with `modal.tsx`: dialog role,
 * focus trap, Escape, backdrop click, scroll lock, focus restore.
 * Entry transitions use the `slide-up` / `slide-in-right` motion tokens.
 */

export type SheetSide = 'responsive' | 'bottom' | 'right';
export type SheetSize = 'sm' | 'md' | 'lg';

/** Width applied to right-panel presentation. */
const RIGHT_PANEL_WIDTH: Record<SheetSize, string> = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[30rem]',
};

/** Same widths, but only on `sm+` viewports (responsive presentation). */
const RESPONSIVE_RIGHT_PANEL_WIDTH: Record<SheetSize, string> = {
  sm: 'sm:w-80',
  md: 'sm:w-96',
  lg: 'sm:w-[30rem]',
};

const POSITION_CLASSES: Record<SheetSide, string> = {
  responsive: cn(
    'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl animate-slide-up',
    'sm:inset-y-0 sm:inset-x-auto sm:right-0 sm:h-full sm:max-h-none sm:max-w-[calc(100vw-2rem)] sm:rounded-none sm:animate-slide-in-right'
  ),
  bottom: 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl animate-slide-up',
  right:
    'inset-y-0 inset-x-auto right-0 h-full max-h-none max-w-[calc(100vw-2rem)] rounded-none animate-slide-in-right',
};

const BORDER_CLASSES: Record<SheetSide, string> = {
  responsive: 'border-t sm:border-t-0 sm:border-l',
  bottom: 'border-t',
  right: 'border-l',
};

export interface SheetProps {
  /** Whether the sheet is visible. */
  open: boolean;
  /** Called with `false` when the user requests closing. */
  onOpenChange: (open: boolean) => void;
  /** Sheet title — becomes the accessible name (`aria-labelledby`). */
  title: string;
  /** Optional paragraph rendered under the title. */
  description?: string;
  /** Presentation mode. Defaults to `responsive`. */
  side?: SheetSide;
  /** Right-panel width (ignored for bottom sheets). Defaults to `md`. */
  size?: SheetSize;
  /** Body content. */
  children: ReactNode;
  /** Optional header action slot rendered opposite the title (e.g. delete). */
  headerAction?: ReactNode;
  /** Optional action row rendered at the bottom of the sheet. */
  footer?: ReactNode;
  /** Closes when the backdrop is clicked. Defaults to `true`. */
  closeOnBackdropClick?: boolean;
  /** Closes on Escape. Defaults to `true`. */
  closeOnEscape?: boolean;
  /** Element to focus on open; defaults to the panel. */
  initialFocusRef?: FocusableRef;
  /** Extra classes applied to the panel. */
  className?: string;
  /** Accessible label for the close button. */
  closeButtonLabel?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  side = 'responsive',
  size = 'md',
  children,
  headerAction,
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  initialFocusRef,
  className,
  closeButtonLabel = 'Close panel',
}: SheetProps) {
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

  const widthClass =
    side === 'bottom'
      ? null
      : side === 'right'
        ? RIGHT_PANEL_WIDTH[size]
        : RESPONSIVE_RIGHT_PANEL_WIDTH[size];

  return createPortal(
    <div className="fixed inset-0 z-50">
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
          'absolute flex flex-col border border-border bg-surface shadow-2xl outline-none',
          BORDER_CLASSES[side],
          POSITION_CLASSES[side],
          widthClass,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerAction}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label={closeButtonLabel}
              className="-mr-1"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export default Sheet;