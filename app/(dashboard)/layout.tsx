import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AUTH_REDIRECT_PATHS } from '@/lib/supabase/config';

/**
 * Phase 5 / Step 5.2 — Dashboard route-group layout.
 *
 * Deliberately thin: it only enforces the session boundary for the group and
 * delegates all chrome to the page, which renders `TodoWorkspace`. The chrome
 * (sidebar categories, progress summary, mobile drawer) is driven by the same
 * filter/selection state as the task list, so both must live in one client
 * tree — fetching here as well would duplicate server work and risk the
 * sidebar and list disagreeing.
 *
 * The middleware already guarantees a session for this group; this guard
 * covers a session that expires between the middleware run and this render.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(AUTH_REDIRECT_PATHS.login);
  }

  return <>{children}</>;
}
