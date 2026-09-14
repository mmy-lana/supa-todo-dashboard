/**
 * Phase 1 / Step 1.3 (support) — Edge-safe Supabase connection configuration.
 *
 * `lib/supabase/client.ts` is marked `'use client'` and therefore cannot be
 * imported by the root middleware, which runs in the Edge runtime. This module
 * holds the shared configuration so middleware and the browser client agree on
 * exactly one source of truth.
 */
import { env } from '@/lib/utils/env';

/** Absolute URL of the Supabase project. Trailing slashes are normalised away. */
export const SUPABASE_URL: string = env.NEXT_PUBLIC_SUPABASE_URL;

/** Public (anon) API key. Safe to expose to the browser; protected by RLS. */
export const SUPABASE_ANON_KEY: string = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cookie options shared by every Supabase client in the application.
 *
 * `sameSite: 'lax'` keeps the session cookie usable across the OAuth/email
 * redirect back from Supabase while still blocking cross-site form posts.
 */
export const SUPABASE_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  // Supabase refresh tokens must survive a browser restart; the SDK sets
  // `maxAge` explicitly on each cookie it writes.
  httpOnly: false,
} as const;

/**
 * Hosts permitted to receive a redirect after authentication. Passing this to
 * `signInWithOtp` / `signUp` prevents open-redirect abuse through the
 * `redirectTo` query parameter.
 */
export const AUTH_REDIRECT_PATHS = {
  login: '/login',
  register: '/register',
  dashboard: '/',
  callback: '/api/auth/callback',
  /** Route appended after a successful email confirmation or OAuth exchange. */
  afterAuth: '/',
} as const;
