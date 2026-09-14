'use client';

import { useEffect } from 'react';

/**
 * Phase 2 / Step 2.4 (internal support) — shared dialog behavior.
 *
 * Pure helpers + a single hook reused by `modal.tsx` and `sheet.tsx` so both
 * overlays share identical, auditable accessibility behavior: focus trap,
 * Escape-to-close, body scroll lock, and focus restore on close.
 *
 * This file intentionally exports no components.
 */

/**
 * Read-only ref view used by dialog internals. `current` is deliberately
 * `readonly`: TypeScript's object-property variance is then covariant, so a
 * `RefObject<HTMLInputElement | null>` satisfies this type (useful for
 * `initialFocusRef`), while `ref.current` stays assignable to `HTMLElement`.
 */
export interface FocusableRef {
  readonly current: HTMLElement | null;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Returns focusable, visible elements inside a container, in DOM order. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement
  );
}

/** Cycles focus within a container when the user presses Tab/Shift+Tab. */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') {
    return;
  }

  const focusables = getFocusableElements(container);

  if (focusables.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last || !container.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}

/*
 * Body scroll lock with reference counting so stacked overlays (e.g. a confirm
 * dialog above a sheet) each lock once and the first unlock restores the
 * original overflow value.
 */
let scrollLockCount = 0;
let scrollLockPreviousOverflow = '';

/** Locks page scrolling; returns a release function. */
export function lockBodyScroll(): () => void {
  if (scrollLockCount === 0) {
    scrollLockPreviousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;

  let released = false;

  return () => {
    if (released) {
      return;
    }
    released = true;
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.style.overflow = scrollLockPreviousOverflow;
    }
  };
}

export interface UseDialogBehaviorOptions {
  open: boolean;
  /** Element that hosts the dialog content (focus trap boundary). */
  panelRef: FocusableRef;
  /** Called when the dialog should close (Escape / backdrop). */
  onOpenChange: (open: boolean) => void;
  /** Allow Escape to close. Defaults to `true`. */
  closeOnEscape?: boolean;
  /** Optional element to focus when the dialog opens; defaults to the panel. */
  initialFocusRef?: FocusableRef;
}

/**
 * Wires the accessibility behavior for a single dialog instance:
 *
 * - saves the previously focused element, focuses the target on open,
 * - listens for Escape and Tab (capture phase, so it wins over page handlers),
 * - locks body scroll while open,
 * - restores focus and scroll exactly once on close/unmount.
 */
export function useDialogBehavior({
  open,
  panelRef,
  onOpenChange,
  closeOnEscape = true,
  initialFocusRef,
}: UseDialogBehaviorOptions): void {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const unlockScroll = lockBodyScroll();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (closeOnEscape) {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(false);
        }
      } else if (event.key === 'Tab' && panelRef.current) {
        trapFocus(panelRef.current, event);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    const target = initialFocusRef?.current ?? panelRef.current;
    target?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      unlockScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, panelRef, onOpenChange, closeOnEscape, initialFocusRef]);
}