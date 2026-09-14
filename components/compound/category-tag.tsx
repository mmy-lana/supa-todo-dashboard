import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { type Category } from '@/lib/types/domain';

/**
 * Phase 3 (support) — Category tag molecule.
 *
 * Renders a category using its dynamic `color_hex` through the badge's
 * luminance-aware `customColor` path, or a neutral "Uncategorized" tag when the
 * task has no category (e.g. its category was deleted and set to null).
 */

export interface CategoryTagProps {
  /** The category row, or `null` for an uncategorised task. */
  category: Category | null;
  /** Badge treatment. Defaults to `subtle`. */
  variant?: BadgeVariant;
  /** Render an explicit "Uncategorized" tag when `category` is null. */
  showUncategorized?: boolean;
  className?: string;
}

export function CategoryTag({
  category,
  variant = 'subtle',
  showUncategorized = true,
  className,
}: CategoryTagProps) {
  if (!category) {
    if (!showUncategorized) {
      return null;
    }

    return (
      <Badge variant="subtle" tone="neutral" className={className}>
        Uncategorized
      </Badge>
    );
  }

  return (
    <Badge variant={variant} customColor={category.color_hex} className={className}>
      {category.name}
    </Badge>
  );
}