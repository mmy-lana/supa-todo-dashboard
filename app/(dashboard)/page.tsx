import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { TodoWorkspace } from '@/components/features/todos/todo-workspace';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AUTH_REDIRECT_PATHS } from '@/lib/supabase/config';
import type { Category, Profile, TodoWithCategory } from '@/lib/types/domain';

export const metadata: Metadata = {
  title: 'Dashboard — Workspace',
  description: 'Your tasks, priorities, and categories in one place.',
};

/**
 * Phase 5 / Step 5.3 — Main dashboard page.
 *
 * Server Component: resolves the session, the profile row, the category list,
 * and the initial task list in a single parallel round-trip, then hydrates the
 * client workspace. Fetching here eliminates the client waterfall and gives
 * the first paint real data; `useTodos` / `useCategories` take over from there.
 *
 * `dynamic = 'force-dynamic'` keeps the page out of the static prerender,
 * because it renders per-user session data.
 */
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(AUTH_REDIRECT_PATHS.login);
  }

  const [profileResult, categoriesResult, todosResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('todos')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  /**
   * A missing profile row means the `handle_new_user` trigger did not run.
   * Falling back to the auth user keeps the dashboard usable instead of
   * hard-failing on a data problem the user cannot fix.
   */
  const profile: Profile = profileResult.data ?? {
    id: user.id,
    email: user.email ?? '',
    full_name:
      typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
    avatar_url:
      typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
    created_at: user.created_at,
    updated_at: user.updated_at ?? user.created_at,
  };

  const categories: Category[] = categoriesResult.data ?? [];
  const todos = (todosResult.data ?? []) as TodoWithCategory[];

  return (
    <TodoWorkspace
      profile={profile}
      initialTodos={todos}
      initialCategories={categories}
    />
  );
}
