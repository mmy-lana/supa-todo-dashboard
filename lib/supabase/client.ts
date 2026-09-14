'use client';

/**
 * Phase 1 / Step 1.3 — Supabase browser client.
 *
 * Creates a single shared client for all client-side data access. The module
 * is marked `'use client'` so it can never be accidentally imported into a
 * Server Component or the Edge middleware.
 *
 * Note on types: the runtime client is created with `@supabase/ssr`'s
 * `createBrowserClient` (correct Auth cookie handling in the browser), but the
 * *static* type is derived from `@supabase/supabase-js`'s own `createClient`.
 * ssr 0.5.2's type definitions target the pre-2.50 generic parameter layout of
 * `SupabaseClient`; supabase-js 2.116 reordered those generics, so the ssr
 * return type degenerates to `never` for every table query. Both entry points
 * construct the exact same `SupabaseClient` at runtime, so deriving the type
 * from `createClient` restores full query typing.
 */
import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

import { Database } from '@/lib/supabase/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';

/** The canonical browser client type, derived from supabase-js itself. */
export type BrowserSupabaseClient = ReturnType<typeof createClient<Database>>;

declare global {
  // eslint-disable-next-line no-var -- intentional augmentation of the browser global
  var __supabaseClientSingleton: BrowserSupabaseClient | undefined;
}

/** Returns the application-wide browser Supabase client (memoised). */
export function createBrowserSupabaseClient(): BrowserSupabaseClient {
  if (globalThis.__supabaseClientSingleton) {
    return globalThis.__supabaseClientSingleton;
  }

  const client = createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  ) as unknown as BrowserSupabaseClient;

  globalThis.__supabaseClientSingleton = client;

  return client;
}