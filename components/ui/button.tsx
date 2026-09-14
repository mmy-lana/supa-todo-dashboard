import type { ComponentPropsWithRef } from 'react';
import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

/**
 * Phase 2 / Step 2.2 — Button primitive.
 *
 * - Variants: `default`, `secondary`, `outline`, `ghost`, `danger`.
 * - Sizes: `sm`, `md`, `lg`, `icon`.
 * - Accessible: visible `focus-visible` ring, no hover-only affordances, and a
 *   minimum 44×44 px hit area on coarse-pointer (touch) devices.
 * - Loading: `isLoading` renders a spinner, locks interaction (`disabled` +
 *   `aria-busy`), and optionally replaces the label with `loadingText`.
 */

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default:
    'bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/95 border border-transparent',
  secondary:
    'bg-muted text-foreground hover:bg-border-strong/60 active:bg-border-strong/80 border border-transparent',
  outline:
    'border border-input bg-surface text-foreground hover:bg-muted active:bg-border-strong/40',
  ghost: 'border border-transparent text-foreground hover:bg-muted active:bg-border-strong/40',
  danger:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 border border-transparent',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-lg px-3 text-sm [@media(hover:none)]:h-11 [@media(hover:none)]:px-4',
  md: 'h-10 rounded-lg px-4 text-sm [@media(hover:none)]:h-11',
  lg: 'h-11 rounded-lg px-6 text-base',
  icon: 'size-10 rounded-lg [@media(hover:none)]:size-11',
};

const BASE_CLASSES =
  'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  /** Visual style. Defaults to `default`. */
  variant?: ButtonVariant;
  /** Controls height/padding. Defaults to `md`. */
  size?: ButtonSize;
  /** Renders a spinner and locks the button while `true`. */
  isLoading?: boolean;
  /** Label shown while loading; replaces `children` to keep semantics clear. */
  loadingText?: string;
}

export function Button({
  ref,
  className,
  variant = 'default',
  size = 'md',
  type = 'button',
  isLoading = false,
  loadingText,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-disabled={isLoading ? true : undefined}
      data-loading={isLoading || undefined}
      className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
      {...rest}
    >
      {isLoading ? (
        <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="inline-flex min-w-0 items-center justify-center gap-2">
        {loadingText && isLoading ? loadingText : children}
      </span>
    </button>
  );
}