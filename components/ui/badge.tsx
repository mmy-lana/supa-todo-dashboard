import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Phase 2 / Step 2.4 — Badge primitive.
 *
 * Pill styling with `solid`, `subtle`, and `outline` variations across a fixed
 * set of tones, plus a `customColor` escape hatch for dynamic values such as
 * category `color_hex` rows (border/text/tint are derived from the hex, and
 * the solid text color is chosen by luminance for WCAG-grade contrast).
 */

export type BadgeVariant = 'solid' | 'subtle' | 'outline';
export type BadgeTone =
  | 'neutral'
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'
  | 'success'
  | 'danger'
  | 'info';

const VARIANT_BASE: Record<BadgeVariant, string> = {
  solid: 'border-transparent text-white',
  subtle: 'border-transparent',
  outline: 'bg-surface border-current',
};

/** Predefined tones using the priority accent tokens. */
const TONE_CLASSES: Record<BadgeTone, Record<BadgeVariant, string>> = {
  neutral: {
    solid: 'bg-zinc-200 text-zinc-700 border-transparent',
    subtle: 'bg-zinc-100 text-zinc-600 border-transparent',
    outline: 'bg-surface text-zinc-600 border-zinc-300',
  },
  low: {
    solid: 'bg-priority-low text-white border-transparent',
    subtle: 'bg-priority-low/10 text-zinc-600 border-transparent',
    outline: 'bg-surface text-priority-low border-priority-low',
  },
  medium: {
    solid: 'bg-priority-medium text-zinc-950 border-transparent',
    subtle: 'bg-priority-medium/15 text-amber-700 border-transparent',
    outline: 'bg-surface text-amber-700 border-amber-300',
  },
  high: {
    solid: 'bg-priority-high text-zinc-950 border-transparent',
    subtle: 'bg-priority-high/15 text-orange-700 border-transparent',
    outline: 'bg-surface text-orange-700 border-orange-300',
  },
  urgent: {
    solid: 'bg-priority-urgent text-white border-transparent',
    subtle: 'bg-priority-urgent/10 text-rose-700 border-transparent',
    outline: 'bg-surface text-rose-700 border-rose-300',
  },
  success: {
    solid: 'bg-emerald-500 text-white border-transparent',
    subtle: 'bg-emerald-500/10 text-emerald-700 border-transparent',
    outline: 'bg-surface text-emerald-700 border-emerald-300',
  },
  danger: {
    solid: 'bg-red-600 text-white border-transparent',
    subtle: 'bg-red-500/10 text-red-700 border-transparent',
    outline: 'bg-surface text-red-700 border-red-300',
  },
  info: {
    solid: 'bg-sky-500 text-white border-transparent',
    subtle: 'bg-sky-500/10 text-sky-700 border-transparent',
    outline: 'bg-surface text-sky-700 border-sky-300',
  },
};

const BASE_CLASSES =
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5';

/* -------------------------------------------------------------------------- */
/* Luminance helpers for arbitrary hex colors                                 */
/* -------------------------------------------------------------------------- */

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!match) {
    return null;
  }

  let value = match[1];
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const number = parseInt(value, 16);

  return {
    r: (number >> 16) & 0xff,
    g: (number >> 8) & 0xff,
    b: number & 0xff,
  };
}

function toLinear(channel: number): number {
  const normalized = channel / 255;

  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a hex color, per WCAG 2.1. */
export function getRelativeLuminance(hex: string): number {
  const channels = parseHexColor(hex);
  if (!channels) {
    return 0;
  }

  const { r, g, b } = channels;

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Picks a readable text color for a given background: white for dark tones,
 * near-black for light tones (WCAG contrast threshold ≈ 4.5:1).
 */
export function getContrastingTextColor(backgroundHex: string): '#ffffff' | '#18181b' {
  return getRelativeLuminance(backgroundHex) > 0.179 ? '#18181b' : '#ffffff';
}

/** Appends an 10% alpha to a 3- or 6-digit hex for tinted backgrounds. */
function withAlpha(hex: string): string {
  const match = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!match) {
    return hex;
  }

  return `#${match[1]}1a`;
}

/* -------------------------------------------------------------------------- */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Visual treatment. Defaults to `subtle`. */
  variant?: BadgeVariant;
  /** Named tone; ignored when `customColor` is provided. */
  tone?: BadgeTone;
  /**
   * Arbitrary hex color (e.g. a category's `color_hex`). Derives text, border,
   * and tint from the value; solid text color is luminance-aware.
   */
  customColor?: string;
}

export function Badge({
  className,
  variant = 'subtle',
  tone = 'neutral',
  customColor,
  style,
  children,
  ...rest
}: BadgeProps) {
  const isCustom = customColor !== undefined && customColor.trim() !== '';

  const derivedStyle = isCustom
    ? variant === 'solid'
      ? {
          backgroundColor: customColor,
          borderColor: customColor,
          color: getContrastingTextColor(customColor),
        }
      : variant === 'outline'
        ? { color: customColor, borderColor: customColor }
        : { color: customColor, backgroundColor: withAlpha(customColor), borderColor: 'transparent' }
    : undefined;

  return (
    <span
      className={cn(
        BASE_CLASSES,
        isCustom
          ? VARIANT_BASE[variant]
          : cn(VARIANT_BASE[variant], TONE_CLASSES[tone][variant]),
        className
      )}
      style={derivedStyle ? { ...style, ...derivedStyle } : style}
      {...rest}
    >
      {children}
    </span>
  );
}