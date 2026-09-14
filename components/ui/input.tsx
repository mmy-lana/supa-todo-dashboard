'use client';

import { useId, type ComponentPropsWithRef } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Phase 2 / Step 2.3 — Input primitive.
 *
 * 1px border, neutral `focus-visible` ring, explicit disabled and invalid
 * states. Supports an optional label, hint, and inline error message wired
 * through `aria-describedby` / `aria-invalid`, so forms never ship an
 * unannounced validation failure.
 */

export interface InputProps extends ComponentPropsWithRef<'input'> {
  /** Marks the field invalid: red border/ring plus `aria-invalid="true"`. */
  invalid?: boolean;
  /** Visible label rendered above the field, linked via `htmlFor`. */
  label?: string;
  /** Static helper text rendered beneath the field. */
  hint?: string;
  /** Error text rendered beneath the field; takes precedence over `hint`. */
  errorMessage?: string | null;
}

export function Input({
  ref,
  className,
  id,
  label,
  hint,
  errorMessage,
  invalid = false,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = errorMessage ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        data-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors duration-150',
          'placeholder:text-muted-foreground/70',
          'aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-500/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...rest}
      />
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}