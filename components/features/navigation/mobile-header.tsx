'use client';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { UserAccountMenu } from '@/components/features/navigation/user-account-menu';
import { cn } from '@/lib/utils/cn';
import type { Profile } from '@/lib/types/domain';

/**
 * Phase 5 / Step 5.2 — Mobile sticky header.
 *
 * Sticky top bar shown below `lg`: hamburger (opens the navigation drawer),
 * workspace title, and the compact account avatar. Every control keeps a 44px
 * touch target, and nothing depends on hover.
 */

export interface MobileHeaderProps {
  /** Signed-in user's profile. */
  profile: Profile;
  /** Opens the mobile navigation drawer. */
  onOpenNavigation: () => void;
  className?: string;
}

export function MobileHeader({ profile, onOpenNavigation, className }: MobileHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden',
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onOpenNavigation}
        aria-label="Open navigation"
        className="shrink-0"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
        Workspace
      </span>

      <UserAccountMenu profile={profile} variant="compact" className="shrink-0" />
    </header>
  );
}