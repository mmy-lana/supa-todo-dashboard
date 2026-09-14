'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DesktopSidebar } from '@/components/features/navigation/desktop-sidebar';
import { MobileHeader } from '@/components/features/navigation/mobile-header';
import { MobileNavDrawer } from '@/components/features/navigation/mobile-nav-drawer';
import { cn } from '@/lib/utils/cn';
import type { Category, Profile, TodoStats } from '@/lib/types/domain';

/**
 * Phase 5 / Step 5.2 — Dashboard shell (responsive chrome).
 *
 * Layout contract from plan §3.4:
 *   - `lg+`: permanent left sidebar (`w-64 border-r`) beside the content column.
 *   - `<lg`: sticky mobile header plus a bottom navigation drawer.
 *   - FAB: `fixed bottom-6 right-6 z-30`, hidden while the drawer is open
 *     (the drawer itself sits at `z-50`).
 *
 * The shell owns only chrome state (drawer visibility); page content arrives
 * as `children`.
 */

export interface DashboardShellProps {
  /** Signed-in user's profile. */
  profile: Profile;
  /** Categories for the sidebar/drawer quick list. */
  categories: readonly Category[];
  /** Aggregate stats shown in the sidebar summary. */
  stats: TodoStats;
  /** Currently selected category id, or `null` for all. */
  selectedCategoryId: string | null;
  /** Receives category filter changes from the chrome. */
  onSelectCategory: (categoryId: string | null) => void;
  /** Invoked by the mobile FAB to create a task. */
  onCreateTask?: () => void;
  /** Page content. */
  children: React.ReactNode;
}

export function DashboardShell({
  profile,
  categories,
  stats,
  selectedCategoryId,
  onSelectCategory,
  onCreateTask,
  children,
}: DashboardShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      <DesktopSidebar
        profile={profile}
        categories={categories}
        stats={stats}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader profile={profile} onOpenNavigation={() => setNavigationOpen(true)} />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      <MobileNavDrawer
        open={navigationOpen}
        onOpenChange={setNavigationOpen}
        profile={profile}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
      />

      {/*
        FAB — mobile only (`lg:hidden`), z-30 per plan §3.4, and removed from
        the tree entirely while the drawer (z-50) is open so it can never be
        focused or rendered behind the backdrop.
      */}
      {onCreateTask && !navigationOpen ? (
        <Button
          type="button"
          size="icon"
          onClick={onCreateTask}
          aria-label="Create a task"
          className={cn(
            'fixed bottom-6 right-6 z-30 size-14 rounded-full shadow-lg lg:hidden',
            '[@media(hover:none)]:size-14'
          )}
        >
          <Plus className="size-6" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}