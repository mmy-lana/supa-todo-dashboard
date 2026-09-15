'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Tag, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils/cn';
import { CATEGORY_COLOR_PRESETS } from '@/lib/types/domain';
import { ErrorBanner } from '@/components/compound/error-banner';
import { StatCardGrid } from '@/components/compound/stat-card';
import { DashboardShell } from '@/components/features/navigation/dashboard-shell';
import { TodoDetailsSheet } from '@/components/features/todos/todo-details-sheet';
import { TodoFilterBar } from '@/components/features/todos/todo-filter-bar';
import { TodoList } from '@/components/features/todos/todo-list';
import {
  TodoQuickCreate,
  type TodoQuickCreateHandle,
} from '@/components/features/todos/todo-quick-create';
import { useCategories } from '@/lib/hooks/use-categories';
import { useTodos } from '@/lib/hooks/use-todos';
import { applyTodoFilters } from '@/lib/utils/todo-filters';
import { computeTodoStats } from '@/lib/utils/stats';
import { formatDueDate } from '@/lib/utils/date';
import {
  DEFAULT_TODO_FILTERS,
  type Category,
  type CreateTodoInput,
  type DomainResult,
  type Profile,
  type TodoFilterParams,
  type TodoWithCategory,
} from '@/lib/types/domain';

/**
 * Phase 5 / Step 5.3 — Dashboard workspace (client container).
 *
 * Owns every piece of interactive state for the dashboard and renders the
 * responsive shell plus the page content in one tree, so the sidebar/drawer
 * chrome and the task list share the same filter, selection, and data
 * subscriptions:
 *
 *   Client Component state: filters, selected task, drawer visibility
 *   `useTodos`            : data, optimistic mutations, Realtime engine
 *   `useCategories`       : category list, duplicate checking, Realtime
 *
 * Initial data arrives as props from the Server Component page (no client
 * waterfall); the hooks hydrate from it and then take over.
 */

export interface TodoWorkspaceProps {
  /** Signed-in user's profile (resolved server-side). */
  profile: Profile;
  /** Initial task list fetched on the server. */
  initialTodos: readonly TodoWithCategory[];
  /** Initial category list fetched on the server. */
  initialCategories: readonly Category[];
}

export function TodoWorkspace({
  profile,
  initialTodos,
  initialCategories,
}: TodoWorkspaceProps) {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<TodoFilterParams>({ ...DEFAULT_TODO_FILTERS });
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(CATEGORY_COLOR_PRESETS[0]);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);

  // Instant local modal state eliminates server-side RSC re-render latency
  const [activeModal, setActiveModal] = useState<'categories' | 'settings' | null>(() => {
    const initialView = searchParams.get('view');
    return initialView === 'categories' || initialView === 'settings' ? initialView : null;
  });

  const quickCreateRef = useRef<TodoQuickCreateHandle>(null);

  const openModal = useCallback((view: 'categories' | 'settings') => {
    setActiveModal(view);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const {
    todos,
    error,
    clearError,
    isLoading,
    realtimeError,
    refetch,
    toggleTodo,
    createTodo,
    updateTodo,
    deleteTodo,
  } = useTodos(initialTodos, profile.id);

  const {
    categories,
    error: categoriesError,
    clearError: clearCategoriesError,
    createCategory,
    deleteCategory,
  } = useCategories(profile.id, initialCategories);

  /* ---------------------------- derived state ---------------------------- */

  const visibleTodos = useMemo(
    () => applyTodoFilters(todos, filters),
    [todos, filters]
  );

  const stats = useMemo(() => computeTodoStats(todos), [todos]);

  const selectedTodo = useMemo(
    () => todos.find((todo) => todo.id === selectedTodoId) ?? null,
    [todos, selectedTodoId]
  );

  const overdueToday = useMemo(
    () =>
      todos.filter(
        (todo) =>
          !todo.is_completed &&
          todo.due_date !== null &&
          formatDueDate(todo.due_date) === 'Today'
      ).length,
    [todos]
  );

  /* ------------------------------ handlers ------------------------------ */

  const handleFiltersChange = useCallback((patch: Partial<TodoFilterParams>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_TODO_FILTERS });
  }, []);

  const handleSelectCategory = useCallback((categoryId: string | null) => {
    setFilters((current) => ({ ...current, categoryId }));
  }, []);

  const handleFocusQuickCreate = useCallback(() => {
    quickCreateRef.current?.focusTitle();
  }, []);

  const handleCreateTodo = useCallback(
    async (input: CreateTodoInput): Promise<DomainResult<TodoWithCategory>> =>
      createTodo(input),
    [createTodo]
  );

  const handleDeleteTodo = useCallback(
    async (todoId: string): Promise<DomainResult<null>> => deleteTodo(todoId),
    [deleteTodo]
  );

  const handleRetry = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const dismissErrors = useCallback(() => {
    clearError();
    clearCategoriesError();
  }, [clearError, clearCategoriesError]);

  const combinedError = error ?? categoriesError;

  return (
    <DashboardShell
      profile={profile}
      categories={categories}
      stats={stats}
      selectedCategoryId={filters.categoryId}
      onSelectCategory={handleSelectCategory}
      onCreateTask={handleFocusQuickCreate}
      onOpenModal={openModal}
      activeModal={activeModal}
    >
      <div className="flex flex-col gap-5">
        {/* Page heading */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Your tasks
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {stats.active} active
              {stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ''}
              {overdueToday > 0 ? ` · ${overdueToday} due today` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleRetry()}
            isLoading={isRefreshing}
            loadingText="Refreshing"
            className="hidden lg:inline-flex"
          >
            Refresh
          </Button>
        </div>

        {/* Non-blocking notices */}
        {realtimeError ? (
          <ErrorBanner tone="warning" title="Live updates unavailable" message={realtimeError} />
        ) : null}

        {combinedError && todos.length > 0 ? (
          <ErrorBanner
            title="Sync problem"
            message={combinedError}
            onDismiss={dismissErrors}
          />
        ) : null}

        {/* KPI overview */}
        <StatCardGrid stats={stats} />

        {/* Quick create */}
        <TodoQuickCreate
          ref={quickCreateRef}
          categories={categories}
          onSubmit={handleCreateTodo}
          className="scroll-mt-20"
        />

        {/* Filters */}
        <TodoFilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          categories={categories}
        />

        {/* Task list + edge states */}
        <TodoList
          todos={visibleTodos}
          totalCount={todos.length}
          filters={filters}
          isLoading={isLoading}
          error={combinedError}
          onRetry={() => void handleRetry()}
          isRetrying={isRefreshing}
          onDismissError={dismissErrors}
          onResetFilters={handleResetFilters}
          onToggleTodo={(todoId, currentStatus) => void toggleTodo(todoId, currentStatus)}
          onOpenDetails={setSelectedTodoId}
          onDeleteTodo={(todoId) => void handleDeleteTodo(todoId)}
          onCreateTask={handleFocusQuickCreate}
        />

        {/* Desktop inline composer trigger */}
        <div className="hidden lg:block">
          <Button
            type="button"
            variant="ghost"
            onClick={handleFocusQuickCreate}
            className="w-full justify-start text-muted-foreground"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add another task
          </Button>
        </div>
      </div>

      <TodoDetailsSheet
        todo={selectedTodo}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTodoId(null);
          }
        }}
        categories={categories}
        onSave={updateTodo}
        onDelete={handleDeleteTodo}
      />

      {/* Categories Manager Modal */}
      <Modal
        open={activeModal === 'categories'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        title="Manage Categories"
        description="Organize tasks into custom labeled categories."
        size="md"
      >
        <div className="flex flex-col gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCategoryName.trim()) return;
              setCategoryFormError(null);
              const res = await createCategory({
                name: newCategoryName.trim(),
                color_hex: newCategoryColor,
              });
              if (!res.ok) {
                setCategoryFormError(res.error);
                return;
              }
              setNewCategoryName('');
            }}
            className="flex flex-col gap-3 rounded-lg border border-border p-3"
          >
            <Input
              label="Category Name"
              placeholder="e.g. Work, Personal, Marketing"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              errorMessage={categoryFormError}
              invalid={categoryFormError !== null}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Accent Color</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategoryColor(color)}
                    className={cn(
                      'size-7 rounded-full border-2 transition-transform',
                      newCategoryColor === color ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" size="sm" className="mt-1 self-end">
              <Tag className="size-4" aria-hidden="true" />
              Create Category
            </Button>
          </form>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Existing Categories ({categories.length})
            </span>
            {categories.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No categories created yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {categories.map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="size-3 rounded-full" style={{ backgroundColor: cat.color_hex }} />
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCategory(cat.id)}
                      className="size-8 text-muted-foreground hover:text-red-600"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        open={activeModal === 'settings'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        title="Workspace Settings"
        description="Manage your account profile and application defaults."
        size="md"
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-lg border border-border p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Profile</p>
            <p className="mt-1 text-sm font-medium text-foreground">{profile.full_name ?? 'User'}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <div className="rounded-lg border border-border p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Database Sync</p>
            <p className="mt-1 text-sm text-foreground">PostgreSQL Row Level Security enabled</p>
            <p className="text-xs text-muted-foreground">Connected to Supabase Realtime CDC</p>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}