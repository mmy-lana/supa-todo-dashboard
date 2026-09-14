import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Phase 2 / Step 2.4 — Skeleton primitive.
 *
 * Monochromatic pulsing placeholder used for loading states. Exposes the
 * `animate-pulse` motion token; sizing is entirely controlled by `className`
 * so callers can mirror the exact layout they are replacing.
 */

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-skeleton=""
      className={cn('animate-pulse rounded-md bg-zinc-200/80', className)}
      {...rest}
    />
  );
}