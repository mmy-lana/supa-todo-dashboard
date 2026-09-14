'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { Check, Minus } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

/**
 * Phase 2 / Step 2.3 — Checkbox primitive.
 *
 * Accessible custom checkbox built on a real (visually hidden) `<input
 * type="checkbox">`, so semantics, keyboard interaction, and form submission
 * come from the native control. Renders a high-contrast SVG checkmark, a
 * minimum 44×44 px tap container on touch devices, and supports an
 * indeterminate visual state for bulk-selection UIs.
 *
 * All visual states (checked / indeterminate / focus / disabled) are driven by
 * CSS peer selectors, so the component behaves identically for controlled and
 * uncontrolled inputs.
 */

export interface CheckboxProps
  extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children'> {
  /** Optional adjacent text; the entire row becomes the tap target. */
  label?: ReactNode;
  /**
   * Renders the tri-state `indeterminate` glyph. The native input remains a
   * plain boolean checkbox; the visual only reflects this prop.
   */
  indeterminate?: boolean;
  /** Marks the field invalid: red border/ring plus `aria-invalid="true"`. */
  invalid?: boolean;
  /** Error text rendered beneath the field. */
  errorMessage?: string | null;
}

export function Checkbox({
  ref,
  className,
  id,
  label,
  indeterminate = false,
  invalid = false,
  errorMessage,
  disabled,
  'aria-label': ariaLabel,
  ...rest
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  const internalRef = useRef<HTMLInputElement>(null);

  // Merge the caller's ref with the internal one so we can drive
  // `indeterminate`, which has no JSX attribute.
  const mergedRef = useCallback(
    (node: HTMLInputElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.indeterminate = indeterminate === true && !rest.checked;
    }
  }, [indeterminate, rest.checked]);

  const hasVisibleLabel = label !== undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={cn(
          'group inline-flex min-h-5 cursor-pointer select-none items-center gap-2.5 rounded-md',
          // Minimum 44px tap container on touch devices.
          '[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:px-1.5',
          'has-[:disabled]:cursor-not-allowed',
          className
        )}
      >
        <input
          ref={mergedRef}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-label={hasVisibleLabel ? undefined : (ariaLabel ?? 'Checkbox')}
          aria-invalid={invalid || undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          className="peer sr-only"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-md border border-input bg-surface transition-colors duration-150',
            'group-hover:border-border-strong',
            'peer-checked:border-foreground peer-checked:bg-foreground',
            'peer-indeterminate:border-foreground peer-indeterminate:bg-foreground',
            // Icons live inside this sibling box, so descendant selectors are
            // driven by the peer's checked / indeterminate state.
            "peer-checked:[&_[data-icon='check']]:opacity-100 peer-indeterminate:[&_[data-icon='minus']]:opacity-100",
            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            invalid && !rest.checked && 'border-red-500 peer-focus-visible:ring-red-500/40'
          )}
        >
          <span className="relative block size-4">
            <Check
              data-icon="check"
              strokeWidth={3}
              className="absolute inset-0 size-4 text-surface opacity-0 transition-opacity duration-100"
            />
            <Minus
              data-icon="minus"
              strokeWidth={3}
              className="absolute inset-0 size-4 text-surface opacity-0 transition-opacity duration-100"
            />
          </span>
        </span>
        {hasVisibleLabel ? <span className="min-w-0 text-sm text-foreground">{label}</span> : null}
      </label>
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}