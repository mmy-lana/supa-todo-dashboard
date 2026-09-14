import 'server-only';

/**
 * Phase 1 / Step 1.3 — Supabase server client.
 *
 * Creates a new client per request using the Next.js `cookies()` adapter, so
 * Server Components, Server Actions, and Route Handlers always see fresh,
 * session-scoped cookies. Importing this module outside of a server runtime
 * (e.g. from a client component or middleware) is a build-time error thanks to
 * the `server-only` package.
 *
 * Note: `cookies()` is asynchronous in Next.js 15+, so the factory itself is
 * `async` and must be awaited by callers.
 */
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { Database } from '@/lib/supabase/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_COOKIE_OPTIONS, SUPABASE_URL } from '@/lib/supabase/config';

/** The exact client type produced by `createServerClient<Database>`. */
export type ServerSupabaseClient = ReturnType<typeof createServerClient<Database>>;

/**
 * Creates a Supabase client bound to the cookies of the current request.
 * A fresh client is returned on every call so each request observes its own
 * cookie state — never memoise this module-level.
 */
export async function createServerSupabaseClient(): Promise<ServerSupabaseClient> {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
          cookieStore.set(name, value, {
            ...SUPABASE_COOKIE_OPTIONS,
            ...cookieOptions,
          });
        });
      } catch {
        // `setAll` is invoked whenever the session is refreshed (e.g. while
        // calling `auth.getUser()`). Throwing here would crash Server
        // Components, so per the Supabase SSR guide the error is swallowed:
        // the middleware is responsible for persisting cookie updates.
      }
    },
  };

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: cookieMethods,
  });
}