'use client';

import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

/**
 * Phase 2 / Step 2.3 — Select primitive.
 *
 * A native `<select>` (fully keyboard/mobile accessible) with a custom styled
 * appearance: hidden browser chrome via `appearance-none` plus a positioned
 * chevron. Supports a disabled-hidden placeholder option, optional label/hint/
 * error wiring, and either a typed `options` array or raw `<option>` children.
 */

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps
  extends Omit<ComponentPropsWithRef<'select'>, 'children'> {
  /** Marks the field invalid: red border/ring plus `aria-invalid="true"`. */
  invalid?: boolean;
  /** Visible label rendered above the field, linked via `htmlFor`. */
  label?: string;
  /** Static helper text rendered beneath the field. */
  hint?: string;
  /** Error text rendered beneath the field; takes precedence over `hint`. */
  errorMessage?: string | null;
  /**
   * Text shown while the select is empty (`value === ''` or `defaultValue` is
   * `''`). Rendered as a `disabled hidden` option.
   */
  placeholder?: string;
  /** Convenience option list; ignored when `children` are provided. */
  options?: readonly SelectOption[];
  /** Raw `<option>`/`<optgroup>` markup; takes precedence over `options`. */
  children?: ReactNode;
}

export function Select({
  ref,
  className,
  id,
  label,
  hint,
  errorMessage,
  invalid = false,
  placeholder,
  options,
  children,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const describedBy = errorMessage ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-invalid={invalid || undefined}
          className={cn(
            'flex h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-surface px-3 pr-9 text-sm text-foreground shadow-sm transition-colors duration-150 [@media(hover:none)]:h-11',
            'aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-500/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          ) : null}
          {children ??
            options?.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
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