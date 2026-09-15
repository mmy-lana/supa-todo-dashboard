'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils/errors';
import type {
  Category,
  CreateTodoInput,
  DomainResult,
  Todo,
  TodoWithCategory,
  UpdateTodoInput,
} from '@/lib/types/domain';

/**
 * Phase 4 / Step 4.1 + 4.3 — `useTodos`: reactive todo state with optimistic
 * mutations and the multi-table Realtime engine.
 *
 * Architectural rules (plan §3.2 / §3.3):
 * - This hook never imports UI components; errors are surfaced as state.
 * - Optimistic mutations register their id in `pendingMutationIds` so Realtime
 *   echoes of our own writes are ignored (no flicker, no clobbering).
 * - The `workspace:${userId}` channel listens to `todos` (INSERT/UPDATE/
 *   DELETE) and `categories` (UPDATE/DELETE/INSERT) events and patches the
 *   in-memory list without a full refetch. Deleted categories unlink every
 *   cached task immediately.
 * - The channel terminates cleanly on unmount or user switch.
 */

type TodoRow = Todo;
type CategoryRow = Category;

/** Predicate deciding whether a remotely inserted task joins the list. */
export type ShouldIncludeTodo = (todo: TodoWithCategory) => boolean;

export interface UseTodosResult {
  /** Live task list, newest inserts prepended. */
  todos: TodoWithCategory[];
  /** Last mutation/fetch error message, or `null`. */
  error: string | null;
  /** Overwrites the error state (e.g. banner dismissal). */
  setError: (error: string | null) => void;
  /** Convenience alias clearing the error state. */
  clearError: () => void;
  /** True while a pull refetch is running. */
  isLoading: boolean;
  /** Message when the Realtime channel is unavailable, or `null`. */
  realtimeError: string | null;
  /** Pulls the full server-side list again, sorted by position then created_at. */
  refetch: () => Promise<void>;
  /** Optimistically flips `is_completed` and reconciles with the server. */
  toggleTodo: (id: string, currentStatus: boolean) => Promise<void>;
  /** Inserts a validated task and returns the stored row. */
  createTodo: (input: CreateTodoInput) => Promise<DomainResult<TodoWithCategory>>;
  /** Optimistically applies partial updates and reconciles with the server. */
  updateTodo: (id: string, input: UpdateTodoInput) => Promise<DomainResult<TodoWithCategory>>;
  /** Optimistically removes the task and reconciles with the server. */
  deleteTodo: (id: string) => Promise<DomainResult<null>>;
}

/**
 * @param initialTodos - tasks fetched server-side on the dashboard page; the
 *   hook hydrates from these to avoid a client waterfall.
 * @param userId       - owning profile id; also namespaces the Realtime channel.
 * @param opts.shouldInclude - optional gate for remotely inserted tasks.
 */
export function useTodos(
  initialTodos: readonly TodoWithCategory[],
  userId: string,
  opts: { shouldInclude?: ShouldIncludeTodo } = {}
): UseTodosResult {
  const [todos, setTodos] = useState<TodoWithCategory[]>(() => [...initialTodos]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  /** Ids of in-flight optimistic mutations; Realtime echoes for these are ignored. */
  const pendingMutationIds = useRef<Set<string>>(new Set());
  /** Latest list snapshot for revert logic inside async callbacks. */
  const todosRef = useRef<TodoWithCategory[]>([]);
  /** Category rows discovered through joins / events, keyed by id. */
  const categoryCacheRef = useRef<Map<string, CategoryRow>>(new Map());
  const shouldIncludeRef = useRef(opts.shouldInclude);

  useEffect(() => {
    shouldIncludeRef.current = opts.shouldInclude;
  }, [opts.shouldInclude]);

  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  const clearError = useCallback(() => setError(null), []);

  /* ------------------------------------------------------------------ */
  /* Server pull                                                        */
  /* ------------------------------------------------------------------ */

  const refetch = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('todos')
        .select('*, category:categories(*)')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (fetchError) {
        setError(getErrorMessage(fetchError));
        return;
      }

      const rows = (data ?? []) as TodoWithCategory[];
      setTodos(rows);

      // Rebuild the category cache from the fetched joins.
      const cache = new Map<string, CategoryRow>();
      for (const row of rows) {
        if (row.category) {
          cache.set(row.category.id, row.category);
        }
      }
      categoryCacheRef.current = cache;
    } catch (refetchError) {
      setError(getErrorMessage(refetchError));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /** Applies the server row for `id`, or patches in place if none returned. */
  const applyServerRow = useCallback((id: string, row: TodoWithCategory | null): void => {
    setTodos((previous) =>
      previous.map((item) => (item.id === id ? (row ?? item) : item))
    );

    if (row?.category) {
      categoryCacheRef.current.set(row.category.id, row.category);
    }
  }, []);

  /**
   * Reconciles `id` against PostgreSQL after a failed mutation. The stale
   * optimistic snapshot is never re-applied blindly — that would clobber
   * concurrent Realtime updates received while the request was in flight — so
   * the authoritative row is fetched (single-item, category joined) and
   * mirrored locally: returned to the caller when it exists, removed when it
   * is gone (PGRST116), or converged through a full `refetch` if the targeted
   * fetch itself fails. Returns the authoritative row, or null when the task
   * no longer exists.
   */
  const reconcileTodo = useCallback(
    async (id: string): Promise<TodoWithCategory | null> => {
      const supabase = createBrowserSupabaseClient();

      const { data, error: fetchError } = await supabase
        .from('todos')
        .select('*, category:categories(*)')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // The row is gone (deleted remotely): mirror that by dropping it.
          setTodos((previous) => previous.filter((item) => item.id !== id));
          return null;
        }

        // Transient fetch failure (network drop, timeout): full pull instead.
        await refetch();
        return null;
      }

      const row = data as TodoWithCategory;
      if (row.category) {
        categoryCacheRef.current.set(row.category.id, row.category);
      }
      return row;
    },
    [refetch]
  );

  /* ------------------------------------------------------------------ */
  /* Optimistic mutations                                               */
  /* ------------------------------------------------------------------ */

  const toggleTodo = useCallback(
    async (id: string, currentStatus: boolean): Promise<void> => {
      const nextStatus = !currentStatus;
      pendingMutationIds.current.add(id);
      setError(null);

      // 1. Optimistic local application.
      setTodos((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
                ...item,
                is_completed: nextStatus,
                completed_at: nextStatus ? new Date().toISOString() : null,
              }
            : item
        )
      );

      // 2. Remote execution.
      const supabase = createBrowserSupabaseClient();

      try {
        const { data, error: updateError } = await supabase
          .from('todos')
          .update({ is_completed: nextStatus })
          .eq('id', id)
          .select('*, category:categories(*)')
          .single();

        if (updateError) {
          // 3a. Revert the optimistic flip.
          setTodos((previous) =>
            previous.map((item) =>
              item.id === id
                ? {
                    ...item,
                    is_completed: currentStatus,
                    completed_at: currentStatus ? item.completed_at : null,
                  }
                : item
            )
          );
          setError(getErrorMessage(updateError));
          return;
        }

        if (data) {
          applyServerRow(id, data as TodoWithCategory);
        }
      } catch (toggleError) {
        setTodos((previous) =>
          previous.map((item) =>
            item.id === id
              ? {
                  ...item,
                  is_completed: currentStatus,
                  completed_at: currentStatus ? item.completed_at : null,
                }
              : item
          )
        );
        setError(getErrorMessage(toggleError));
      } finally {
        pendingMutationIds.current.delete(id);
      }
    },
    [applyServerRow]
  );

  const createTodo = useCallback(
    async (input: CreateTodoInput): Promise<DomainResult<TodoWithCategory>> => {
      setError(null);

      const supabase = createBrowserSupabaseClient();

      try {
        const { data, error: insertError } = await supabase
          .from('todos')
          .insert({ ...input, user_id: userId })
          .select('*, category:categories(*)')
          .single();

        if (insertError) {
          const message = getErrorMessage(insertError);
          setError(message);
          return { ok: false, error: message };
        }

        if (!data) {
          const message = 'The task was created but could not be read back.';
          setError(message);
          return { ok: false, error: message };
        }

        const row = data as TodoWithCategory;
        if (row.category) {
          categoryCacheRef.current.set(row.category.id, row.category);
        }

        // Presence check keeps the Realtime INSERT echo from duplicating it.
        setTodos((previous) =>
          previous.some((item) => item.id === row.id) ? previous : [row, ...previous]
        );

        return { ok: true, data: row };
      } catch (insertError) {
        const message = getErrorMessage(insertError);
        setError(message);
        return { ok: false, error: message };
      }
    },
    [userId]
  );

  const updateTodo = useCallback(
    async (id: string, input: UpdateTodoInput): Promise<DomainResult<TodoWithCategory>> => {
      const original = todosRef.current.find((item) => item.id === id) ?? null;
      pendingMutationIds.current.add(id);
      setError(null);

      const optimisticPatch: Partial<TodoWithCategory> = {
        ...input,
        ...(input.is_completed !== undefined
          ? { completed_at: input.is_completed ? new Date().toISOString() : null }
          : {}),
        // The full category row is unknown client-side; the server row replaces it.
        ...(input.category_id !== undefined ? { category: null } : {}),
      };

      if (original && Object.keys(input).length > 0) {
        setTodos((previous) =>
          previous.map((item) => (item.id === id ? { ...item, ...optimisticPatch } : item))
        );
      }

      // Failure path: reconcile against the authoritative server row instead of
      // restoring the stale pre-mutation snapshot, which could clobber
      // concurrent Realtime updates received while the request was in flight.
      const reconcile = async (): Promise<void> => {
        const row = await reconcileTodo(id);
        if (row) {
          applyServerRow(id, row);
        }
      };

      const supabase = createBrowserSupabaseClient();

      try {
        const { data, error: updateError } = await supabase
          .from('todos')
          .update(input)
          .eq('id', id)
          .select('*, category:categories(*)')
          .single();

        if (updateError) {
          await reconcile();
          const message = getErrorMessage(updateError);
          setError(message);
          return { ok: false, error: message };
        }

        if (!data) {
          await reconcile();
          const message = 'That task no longer exists.';
          setError(message);
          return { ok: false, error: message };
        }

        const row = data as TodoWithCategory;
        applyServerRow(id, row);
        return { ok: true, data: row };
      } catch (updateError) {
        await reconcile();
        const message = getErrorMessage(updateError);
        setError(message);
        return { ok: false, error: message };
      } finally {
        pendingMutationIds.current.delete(id);
      }
    },
    [applyServerRow, reconcileTodo]
  );

  const deleteTodo = useCallback(
    async (id: string): Promise<DomainResult<null>> => {
      const originalIndex = todosRef.current.findIndex((item) => item.id === id);
      const original = todosRef.current[originalIndex] ?? null;
      pendingMutationIds.current.add(id);
      setError(null);

      if (original) {
        setTodos((previous) => previous.filter((item) => item.id !== id));
      }

      // Failure path: reconcile against the authoritative server row and restore
      // it at its original position when it still exists. Blindly resurrecting
      // the stale snapshot would clobber concurrent Realtime updates received
      // while the delete request was in flight.
      const reconcileRestore = async (): Promise<void> => {
        const row = await reconcileTodo(id);
        if (!row || originalIndex < 0) {
          return;
        }
        setTodos((previous) => {
          if (previous.some((item) => item.id === id)) {
            return previous;
          }
          const next = [...previous];
          next.splice(Math.min(originalIndex, next.length), 0, row);
          return next;
        });
      };

      const supabase = createBrowserSupabaseClient();

      try {
        const { error: deleteError } = await supabase.from('todos').delete().eq('id', id);

        if (deleteError) {
          await reconcileRestore();
          const message = getErrorMessage(deleteError);
          setError(message);
          return { ok: false, error: message };
        }

        return { ok: true, data: null };
      } catch (deleteError) {
        await reconcileRestore();
        const message = getErrorMessage(deleteError);
        setError(message);
        return { ok: false, error: message };
      } finally {
        pendingMutationIds.current.delete(id);
      }
    },
    [reconcileTodo]
  );

  /* ------------------------------------------------------------------ */
  /* Realtime subscription engine (plan §3.3, Step 4.3)                  */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel: RealtimeChannel = supabase.channel(`workspace:${userId}`);

    const resolveCategory = (categoryId: string | null): CategoryRow | null =>
      categoryId ? (categoryCacheRef.current.get(categoryId) ?? null) : null;

    channel
      .on<TodoRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        (payload) => {
          const incoming = payload.new;
          const id = incoming.id;
          if (!id || pendingMutationIds.current.has(id)) {
            return;
          }
          const withCategory: TodoWithCategory = {
            ...incoming,
            category: resolveCategory(incoming.category_id),
          };
          if (shouldIncludeRef.current?.(withCategory) === false) {
            return;
          }
          setTodos((previous) =>
            previous.some((item) => item.id === id) ? previous : [withCategory, ...previous]
          );
        }
      )
      .on<TodoRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        (payload) => {
          const incoming = payload.new;
          const id = incoming.id;
          if (!id || pendingMutationIds.current.has(id)) {
            return;
          }
          setTodos((previous) =>
            previous.map((item) =>
              item.id === id
                ? { ...item, ...incoming, category: resolveCategory(incoming.category_id) }
                : item
            )
          );
        }
      )
      .on<TodoRow>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        (payload) => {
          const id = payload.old.id;
          if (!id || pendingMutationIds.current.has(id)) {
            return;
          }
          setTodos((previous) => previous.filter((item) => item.id !== id));
        }
      )
      .on<CategoryRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const category = payload.new;
          if (category?.id) {
            categoryCacheRef.current.set(category.id, category);
          }
        }
      )
      .on<CategoryRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const category = payload.new;
          if (!category?.id) {
            return;
          }
          categoryCacheRef.current.set(category.id, category);
          setTodos((previous) =>
            previous.map((item) =>
              item.category_id === category.id ? { ...item, category } : item
            )
          );
        }
      )
      .on<CategoryRow>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const deletedId = payload.old.id;
          if (!deletedId) {
            return;
          }
          categoryCacheRef.current.delete(deletedId);
          setTodos((previous) =>
            previous.map((item) =>
              item.category_id === deletedId
                ? { ...item, category_id: null, category: null }
                : item
            )
          );
        }
      )
      .subscribe((status, statusError) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeError(null);
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || statusError) {
          setRealtimeError(
            'Live updates are unavailable — changes will appear after a refresh.'
          );
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    todos,
    error,
    setError,
    clearError,
    isLoading,
    realtimeError,
    refetch,
    toggleTodo,
    createTodo,
    updateTodo,
    deleteTodo,
  };
}