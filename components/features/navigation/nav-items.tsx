'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Settings, Tags } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import type { Category } from '@/lib/types/domain';

/**
 * Phase 5 / Step 5.2 — Workspace navigation model.
 *
 * One shared definition of the primary nav links and the category quick-filter
 * list, rendered by both the desktop sidebar and the mobile drawer so the two
 * surfaces can never drift apart.
 *
 * Navigation owns only routing: task *status* filtering (All / Active /
 * Completed) lives exclusively in the `TodoFilterBar` component state and has
 * no URL representation, so the sidebar cannot split-brain with the workspace.
 */

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /**
   * For view-based destinations (`/?view=...`), the query parameter value that
   * marks this item active. Absent for the root `Dashboard` route, whose active
   * state is the clean base view (no `view` modal and no `status` parameter).
   */
  readonly view?: string;
}

/** Primary workspace destinations. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/?view=categories', label: 'Categories', icon: Tags, view: 'categories' },
  { href: '/?view=settings', label: 'Settings', icon: Settings, view: 'settings' },
];

export interface NavigationLinksProps {
  /** Called after a link is activated (used to close the mobile drawer). */
  onNavigate?: () => void;
  className?: string;
}

export function NavigationLinks({
  onNavigate,
  className,
}: NavigationLinksProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isItemActive = (item: NavItem): boolean => {
    if (item.view !== undefined) {
      // View destinations (Categories, Settings) open a modal; they are active
      // only while their `?view=` parameter points at them.
      return pathname === '/' && searchParams.get('view') === item.view;
    }

    // Dashboard is the root route: active only for the clean base view, i.e.
    // no `view` modal parameter and no `status` filter parameter. Task status
    // filtering is component state inside the TodoFilterBar, never the URL.
    return pathname === '/' && !searchParams.has('view') && !searchParams.has('status');
  };

  return (
    <nav aria-label="Workspace" className={cn('flex flex-col gap-0.5', className)}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = isItemActive(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export interface CategoryQuickListProps {
  /** Categories available for quick filtering. */
  categories: readonly Category[];
  /** Currently selected category id, or `null` for all. */
  selectedCategoryId: string | null;
  /** Receives the selected category id (`null` clears the filter). */
  onSelectCategory: (categoryId: string | null) => void;
  /** Called after a selection is made (used to close the mobile drawer). */
  onNavigate?: () => void;
  className?: string;
}

/** Category quick-filter list with colour dots and live task counts. */
export function CategoryQuickList({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onNavigate,
  className,
}: CategoryQuickListProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Categories
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{categories.length}</span>
      </div>

      <button
        type="button"
        onClick={() => {
          onSelectCategory(null);
          onNavigate?.();
        }}
        aria-pressed={selectedCategoryId === null}
        className={cn(
          'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          selectedCategoryId === null
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <span className="size-2.5 shrink-0 rounded-full border border-border-strong" aria-hidden="true" />
        All tasks
      </button>

      {categories.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        categories.map((category) => {
          const isSelected = selectedCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                onSelectCategory(category.id);
                onNavigate?.();
              }}
              aria-pressed={isSelected}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color_hex }}
                aria-hidden="true"
              />
              <span className="truncate">{category.name}</span>
            </button>
          );
        })
      )}
    </div>
  );
}