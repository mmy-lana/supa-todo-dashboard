'use client';

import { CategoryQuickList, NavigationLinks } from '@/components/features/navigation/nav-items';
import { SignOutButton } from '@/components/features/navigation/user-account-menu';
import { Sheet } from '@/components/ui/sheet';
import type { Category, Profile } from '@/lib/types/domain';

/**
 * Phase 5 / Step 5.2 — Mobile navigation drawer.
 *
 * Bottom sheet (mobile) that resolves to a right panel at `sm+`, reusing the
 * Phase 2 `Sheet` primitive for focus trap, Escape handling, scroll lock, and
 * focus restore. Contains the same navigation + category list as the desktop
 * sidebar plus an explicit sign-out action.
 */

export interface MobileNavDrawerProps {
  /** Whether the drawer is visible. */
  open: boolean;
  /** Called when the drawer requests to open/close. */
  onOpenChange: (open: boolean) => void;
  /** Signed-in user's profile. */
  profile: Profile;
  /** Categories for the quick-filter list. */
  categories: readonly Category[];
  /** Currently selected category id, or `null` for all. */
  selectedCategoryId: string | null;
  /** Receives category filter changes. */
  onSelectCategory: (categoryId: string | null) => void;
}

export function MobileNavDrawer({
  open,
  onOpenChange,
  profile,
  categories,
  selectedCategoryId,
  onSelectCategory,
}: MobileNavDrawerProps) {
  const close = (): void => onOpenChange(false);

  const displayName = profile.full_name?.trim() || profile.email;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Navigation"
      description={displayName}
      side="responsive"
      size="md"
      footer={<SignOutButton onSignedOut={close} />}
    >
      <div className="flex flex-col gap-4">
        <NavigationLinks onNavigate={close} />

        <div className="h-px bg-border" role="separator" />

        <CategoryQuickList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={onSelectCategory}
          onNavigate={close}
        />
      </div>
    </Sheet>
  );
}