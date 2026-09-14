import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';

import { Database } from '@/lib/supabase/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_COOKIE_OPTIONS, SUPABASE_URL } from '@/lib/supabase/config';

/**
 * Phase 1 / Step 1.3 + 1.4 — Middleware session refresh handled in a dedicated
 * module so the root `middleware.ts` stays declarative and testable.
 *
 * Important: every mutable value here lives inside `updateSession`'s closure —
 * there is no module-level mutable state, so concurrent requests executing in
 * the same Edge isolate cannot clobber each other's cookie refresh.
 */

/**
 * Application routes that require an authenticated session.
 *
 * NOTE: `/api/auth/callback` is deliberately NOT protected. The callback is
 * how a *sessionless* user exchanges the OAuth/email `?code=` for their first
 * session (the route handler exchanges it and writes the cookies itself).
 * Guarding it here would redirect every fresh sign-in to `/login` before the
 * code could ever be consumed.
 */
const PROTECTED_PREFIXES: readonly string[] = ['/dashboard'];

/** Authentication routes that require an *unauthenticated* session. */
const AUTH_PREFIXES: readonly string[] = ['/login', '/register'];

function isProtectedPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Refreshes the Supabase session for the given request and enforces the
 * authentication boundary. Returns the response to hand back to Next.js.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Start from a benign response carrying the incoming request. `setAll` below
  // replaces it with a freshly built response so cookie refreshes are layered
  // onto the outgoing headers, never onto a stale reference.
  let response = NextResponse.next({ request });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      // Update the `request` object so later reads inside this invocation
      // observe the refreshed session.
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

      // Re-create the response so the modified cookies land in `Set-Cookie`.
      response = NextResponse.next({ request });

      cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
        response.cookies.set(name, value, {
          ...SUPABASE_COOKIE_OPTIONS,
          ...cookieOptions,
        });
      });
    },
  };

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: cookieMethods,
  });

  // `getUser` performs a session refresh when the access token is expired and
  // persists the refreshed cookies through the `setAll` callback above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected route without a valid session -> 307 to /login.
  if (!user && isProtectedPath(pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.search = '';

    return NextResponse.redirect(redirect, 307);
  }

  // Auth route while already signed in -> 307 to the dashboard root.
  if (user && isAuthPath(pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/';
    redirect.search = '';

    return NextResponse.redirect(redirect, 307);
  }

  // Public path or valid session: attach any refreshed headers/cookies.
  return response;
}