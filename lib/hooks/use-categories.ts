'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils/errors';
import type { Category, CategoryInput, DomainResult } from '@/lib/types/domain';

/**
 * Phase 4 / Step 4.2 — `useCategories`: cached category definitions with
 * optimistic mutations and a live subscription.
 *
 * - `createCategory` rejects duplicate names client-side (case-insensitive
 *   trim compare) before the server's unique constraint can fire.
 * - Mutation handlers are idempotent against Realtime echoes: inserts are
 *   presence-checked, deletes filter by id, updates replace in place.
 * - Subscribes on its own `categories:${userId}` channel (the `workspace:`
 *   channel in `useTodos` handles category events *against tasks*; this hook
 *   owns the category *list*). Clean termination on unmount/user switch.
 */

export interface UseCategoriesResult {
  /** Live category list, sorted by creation time. */
  categories: Category[];
  /** Last mutation/fetch error message, or `null`. */
  error: string | null;
  /** Overwrites the error state. */
  setError: (error: string | null) => void;
  /** Convenience alias clearing the error state. */
  clearError: () => void;
  /** True while a pull refetch is running. */
  isLoading: boolean;
  /** Pulls the full server-side category list again. */
  refetch: () => Promise<void>;
  /** Creates a category after a client-side duplicate-name check. */
  createCategory: (input: CategoryInput) => Promise<DomainResult<Category>>;
  /** Optimistically removes a category and reconciles with the server. */
  deleteCategory: (id: string) => Promise<DomainResult<null>>;
}

/**
 * @param userId           - owning profile id; namespaces the Realtime channel.
 * @param initialCategories - categories fetched server-side on the dashboard page.
 */
export function useCategories(
  userId: string,
  initialCategories: readonly Category[] = []
): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>(() => [...initialCategories]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const categoriesRef = useRef<Category[]>([]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const clearError = useCallback(() => setError(null), []);

  const refetch = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        setError(getErrorMessage(fetchError));
        return;
      }

      setCategories((data ?? []) as Category[]);
    } catch (refetchError) {
      setError(getErrorMessage(refetchError));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createCategory = useCallback(
    async (input: CategoryInput): Promise<DomainResult<Category>> => {
      setError(null);

      const normalizedName = input.name.trim().toLowerCase();
      const duplicate = categoriesRef.current.some(
        (category) => category.name.trim().toLowerCase() === normalizedName
      );

      if (duplicate) {
        const message = 'A category with this name already exists.';
        setError(message);
        return { ok: false, error: message };
      }

      const supabase = createBrowserSupabaseClient();

      try {
        const { data, error: insertError } = await supabase
          .from('categories')
          .insert({ user_id: userId, name: input.name.trim(), color_hex: input.color_hex })
          .select('*')
          .single();

        if (insertError) {
          const message = getErrorMessage(insertError);
          setError(message);
          return { ok: false, error: message };
        }

        if (!data) {
          const message = 'The category was created but could not be read back.';
          setError(message);
          return { ok: false, error: message };
        }

        const row = data as Category;

        // Presence check defuses the Realtime INSERT echo.
        setCategories((previous) =>
          previous.some((category) => category.id === row.id)
            ? previous
            : [...previous, row]
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

  const deleteCategory = useCallback(
    async (id: string): Promise<DomainResult<null>> => {
      const originalIndex = categoriesRef.current.findIndex((category) => category.id === id);
      const original = categoriesRef.current[originalIndex] ?? null;

      if (original) {
        setCategories((previous) => previous.filter((category) => category.id !== id));
      }

      const revert = (): void => {
        if (!original) {
          return;
        }
        setCategories((previous) => {
          if (previous.some((category) => category.id === id)) {
            return previous;
          }
          const next = [...previous];
          next.splice(Math.min(originalIndex, next.length), 0, original);
          return next;
        });
      };

      const supabase = createBrowserSupabaseClient();

      try {
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);

        if (deleteError) {
          revert();
          const message = getErrorMessage(deleteError);
          setError(message);
          return { ok: false, error: message };
        }

        return { ok: true, data: null };
      } catch (deleteError) {
        revert();
        const message = getErrorMessage(deleteError);
        setError(message);
        return { ok: false, error: message };
      }
    },
    []
  );

  /* ------------------------------------------------------------------ */
  /* Realtime subscription for the category list                         */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel: RealtimeChannel = supabase.channel(`categories:${userId}`);

    channel
      .on<Category>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const incoming = payload.new;
          if (!incoming?.id) {
            return;
          }
          setCategories((previous) =>
            previous.some((category) => category.id === incoming.id)
              ? previous
              : [...previous, incoming]
          );
        }
      )
      .on<Category>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const incoming = payload.new;
          if (!incoming?.id) {
            return;
          }
          setCategories((previous) =>
            previous.map((category) => (category.id === incoming.id ? incoming : category))
          );
        }
      )
      .on<Category>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const deletedId = payload.old.id;
          if (!deletedId) {
            return;
          }
          setCategories((previous) => previous.filter((category) => category.id !== deletedId));
        }
      )
      .subscribe((status, statusError) => {
        if (status === 'SUBSCRIBED') {
          setError(null);
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || statusError) {
          setError('Live category updates are unavailable — refresh to see changes.');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    categories,
    error,
    setError,
    clearError,
    isLoading,
    refetch,
    createCategory,
    deleteCategory,
  };
}