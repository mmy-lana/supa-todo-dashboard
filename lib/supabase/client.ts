'use client';

/**
 * Phase 1 / Step 1.3 — Supabase browser client.
 *
 * Creates a single shared client for all client-side data access. The module
 * is marked `'use client'` so it can never be accidentally imported into a
 * Server Component or the Edge middleware.
 */
import { createBrowserClient } from '@supabase/ssr';

import { Database } from '@/lib/supabase/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';

/** The exact client type produced by `createBrowserClient<Database>`. */
export type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

declare global {
  // eslint-disable-next-line no-var -- intentional augmentation of the browser global
  var __supabaseClientSingleton: BrowserSupabaseClient | undefined;
}

/** Returns the application-wide browser Supabase client (memoised). */
export function createBrowserSupabaseClient(): BrowserSupabaseClient {
  if (globalThis.__supabaseClientSingleton) {
    return globalThis.__supabaseClientSingleton;
  }

  const client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

  globalThis.__supabaseClientSingleton = client;

  return client;
}