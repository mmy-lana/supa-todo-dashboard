'use client';

import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * Phase 3 (support) — Error/info banner molecule.
 *
 * Inline status banner for form errors, sync failures, and success confirmations.
 * `role="alert"` for error/warning, `role="status"` for info/success; an
 * optional dismiss action is provided through `onDismiss`.
 */

export type MessageBannerTone = 'error' | 'warning' | 'info' | 'success';

const TONE_STYLES: Record<MessageBannerTone, { container: string; icon: ReactNode }> = {
  error: {
    container: 'border-red-200 bg-red-50 text-red-800',
    icon: <CircleAlert className="size-5 shrink-0 text-red-600" aria-hidden="true" />,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: <TriangleAlert className="size-5 shrink-0 text-amber-600" aria-hidden="true" />,
  },
  info: {
    container: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: <Info className="size-5 shrink-0 text-sky-600" aria-hidden="true" />,
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-hidden="true" />,
  },
};

export interface ErrorBannerProps {
  /** Short heading such as "Unable to sign in". */
  title?: string;
  /** Primary message body. */
  message: string;
  /** Visual + semantic tone. Defaults to `error`. */
  tone?: MessageBannerTone;
  /** When provided, renders a dismiss button. */
  onDismiss?: () => void;
  /** Accessible label for the dismiss button. */
  dismissLabel?: string;
  className?: string;
}

export function ErrorBanner({
  title,
  message,
  tone = 'error',
  onDismiss,
  dismissLabel = 'Dismiss',
  className,
}: ErrorBannerProps) {
  const styles = TONE_STYLES[tone];
  const isAssertive = tone === 'error' || tone === 'warning';

  return (
    <div
      role={isAssertive ? 'alert' : 'status'}
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm',
        styles.container,
        className
      )}
    >
      {styles.icon}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <p className={cn(title ? 'mt-0.5' : undefined)}>{message}</p>
      </div>
      {onDismiss ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="-m-1 size-8 shrink-0 [@media(hover:none)]:size-9"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}