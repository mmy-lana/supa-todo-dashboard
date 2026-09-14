import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Phase 1 / Step 1.4 — Middleware boundary enforcement.
 *
 * Runs before every request and enforces the authentication boundary:
 *
 *   - `/`, `/dashboard/*`, `/api/auth/callback`   -> require a session
 *   - `/login`, `/register`                       -> require no session
 *
 * The matcher below excludes static assets so the middleware stays fast on the
 * CDN edge. Route-group segments (`(auth)`, `(dashboard)`) never appear in the
 * URL, so matching the visible `/login` and `/dashboard` paths is sufficient.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)',
  ],
};
