'use client';

import { useEffect, useRef } from 'react';

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
 * - captures the previously focused element and focuses the target once, but
 *   only on the `false -> true` open transition,
 * - listens for Escape and Tab (capture phase, so it wins over page handlers),
 * - locks body scroll while open,
 * - restores focus and scroll exactly once on close/unmount.
 *
 * Volatile references (`onOpenChange`, `initialFocusRef`, `panelRef`,
 * `closeOnEscape`) are mirrored into stable refs so parent re-renders that
 * recreate inline callbacks never re-run the open transition or the keydown
 * listener. The initial focus therefore fires exactly once per open, and typed
 * input inside the dialog keeps focus for the whole session.
 */
export function useDialogBehavior({
  open,
  panelRef,
  onOpenChange,
  closeOnEscape = true,
  initialFocusRef,
}: UseDialogBehaviorOptions): void {
  // Stable mirrors of the volatile values passed by the parent. The mirroring
  // effect below refreshes them after every render; the two behavior effects
  // below depend only on `open`, so parent re-renders change nothing.
  const onOpenChangeRef = useRef(onOpenChange);
  const panelRefRef = useRef(panelRef);
  const initialFocusRefRef = useRef<FocusableRef | undefined>(initialFocusRef);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
    panelRefRef.current = panelRef;
    initialFocusRefRef.current = initialFocusRef;
    closeOnEscapeRef.current = closeOnEscape;
  });

  // Tracks the last observed `open` value so the transition effect can
  // distinguish a genuine `false -> true` open from any other re-render.
  // Initialised to `false` so a dialog or sheet that mounts directly with
  // `open=true` still runs the open setup (body scroll lock and initial focus)
  // on its first render.
  const prevOpenRef = useRef(false);

  // Open/close transition: runs only when `open` changes. The focus work is
  // gated on `prevOpenRef`, so even a future change to this effect's deps can
  // never steal focus from an element the user is typing into.
  useEffect(() => {
    const didOpen = !prevOpenRef.current && open;
    prevOpenRef.current = open;

    if (!didOpen) {
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const unlockScroll = lockBodyScroll();

    const target = initialFocusRefRef.current?.current ?? panelRefRef.current?.current;
    target?.focus({ preventScroll: true });

    return () => {
      unlockScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);

  // Keydown listener: mounted while the dialog is open. Reads the latest
  // callbacks through the refs above, so it never re-subscribes when the
  // parent re-renders and re-creates `onOpenChange`.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (closeOnEscapeRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onOpenChangeRef.current(false);
        }
      } else if (event.key === 'Tab') {
        const panel = panelRefRef.current?.current;
        if (panel) {
          trapFocus(panel, event);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);
}