'use client';

import { CategoryQuickList, NavigationLinks } from '@/components/features/navigation/nav-items';
import { UserAccountMenu } from '@/components/features/navigation/user-account-menu';
import { cn } from '@/lib/utils/cn';
import type { Category, Profile, TodoStats } from '@/lib/types/domain';

/**
 * Phase 5 / Step 5.2 — Desktop sidebar.
 *
 * Permanent fixed column (`w-64 border-r`) rendered only on `lg+`; the mobile
 * header + drawer cover smaller viewports. Contains primary navigation, the
 * category quick-filter list, a task-completion summary, and the account menu.
 */

export interface DesktopSidebarProps {
  /** Signed-in user's profile. */
  profile: Profile;
  /** Categories for the quick-filter list. */
  categories: readonly Category[];
  /** Aggregate stats for the summary block. */
  stats: TodoStats;
  /** Currently selected category id, or `null` for all. */
  selectedCategoryId: string | null;
  /** Receives category filter changes. */
  onSelectCategory: (categoryId: string | null) => void;
  /** Instant modal opening callback. */
  onOpenModal?: (view: 'categories' | 'settings') => void;
  /** Active modal state. */
  activeModal?: 'categories' | 'settings' | null;
  className?: string;
}

export function DesktopSidebar({
  profile,
  categories,
  stats,
  selectedCategoryId,
  onSelectCategory,
  onOpenModal,
  activeModal,
  className,
}: DesktopSidebarProps) {
  return (
    <aside
      aria-label="Workspace sidebar"
      className={cn(
        'hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col',
        className
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-5">
        <span className="text-base font-semibold tracking-tight text-foreground">Workspace</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavigationLinks onOpenModal={onOpenModal} activeModal={activeModal} />

        <div className="my-3 h-px bg-border" role="separator" />

        <CategoryQuickList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={onSelectCategory}
        />

        <div className="my-3 h-px bg-border" role="separator" />

        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Progress
          </p>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold tabular-nums">{stats.completed}</span>
            <span className="text-muted-foreground"> of </span>
            <span className="font-semibold tabular-nums">{stats.total}</span>
            <span className="text-muted-foreground"> tasks completed</span>
          </p>
          <div
            role="progressbar"
            aria-valuenow={Math.round(stats.completionRate)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Completion rate"
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, stats.completionRate))}%` }}
            />
          </div>
          {stats.overdue > 0 ? (
            <p className="mt-2 text-xs font-medium text-red-600">
              {stats.overdue} overdue {stats.overdue === 1 ? 'task' : 'tasks'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <UserAccountMenu profile={profile} variant="full" />
      </div>
    </aside>
  );
}