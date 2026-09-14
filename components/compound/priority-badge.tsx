import { Badge, type BadgeTone, type BadgeVariant } from '@/components/ui/badge';
import { type PriorityLevel } from '@/lib/types/domain';

/**
 * Phase 3 (support) — Priority badge molecule.
 *
 * Maps a `PriorityLevel` to a named badge tone derived from the priority
 * accent tokens. Single source of truth for priority labels used across the
 * task list, quick-create bar, filter bar, and details sheet.
 */

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

/** Tone mapping for the Badge primitive (in priority order). */
export const PRIORITY_TONES: Record<PriorityLevel, BadgeTone> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
};

export interface PriorityBadgeProps {
  /** The priority level to display. */
  priority: PriorityLevel;
  /** Badge treatment. Defaults to `subtle`. */
  variant?: BadgeVariant;
  /** Hide the text label (icon-only usages); defaults to `false`. */
  hideLabel?: boolean;
  className?: string;
}

export function PriorityBadge({
  priority,
  variant = 'subtle',
  hideLabel = false,
  className,
}: PriorityBadgeProps) {
  return (
    <Badge variant={variant} tone={PRIORITY_TONES[priority]} className={className}>
      {!hideLabel ? PRIORITY_LABELS[priority] : null}
    </Badge>
  );
}