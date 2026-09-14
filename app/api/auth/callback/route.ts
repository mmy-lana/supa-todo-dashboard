import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AUTH_REDIRECT_PATHS } from '@/lib/supabase/config';

/**
 * Phase 5 / Step 5.1 — Auth callback route.
 *
 * Supabase redirects here after email confirmation or an OAuth consent flow
 * with a `?code=` query parameter. The code is exchanged for a session, which
 * the server client writes straight into HTTP-only cookies (via the
 * `setAll` adapter), then the user is sent to the dashboard.
 *
 * Failures never leak a stack trace to the user: the browser is redirected to
 * `/login` with a short, explicit `error` code that the login page surfaces.
 */

/** Query values echoed back to `/login?error=…`. */
const CALLBACK_ERRORS = {
  missingCode: 'missing_code',
  exchangeFailed: 'exchange_failed',
  unexpected: 'unexpected_error',
} as const;

/** Only same-origin, absolute-path redirects are honoured (open-redirect guard). */
function resolveNextPath(rawNext: string | null): string {
  if (!rawNext) {
    return AUTH_REDIRECT_PATHS.afterAuth;
  }

  const isSafeRelativePath =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\');

  return isSafeRelativePath ? rawNext : AUTH_REDIRECT_PATHS.afterAuth;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const next = resolveNextPath(searchParams.get('next'));

  // Supabase may also report an error directly (e.g. an expired or already-used
  // link), in which case it sends `error` / `error_description` instead of a code.
  const hasProviderError =
    searchParams.has('error') || searchParams.has('error_description');

  if (hasProviderError) {
    const failureUrl = new URL('/login', origin);
    failureUrl.searchParams.set('error', CALLBACK_ERRORS.exchangeFailed);

    return NextResponse.redirect(failureUrl, 307);
  }

  if (!code) {
    const failureUrl = new URL('/login', origin);
    failureUrl.searchParams.set('error', CALLBACK_ERRORS.missingCode);

    return NextResponse.redirect(failureUrl, 307);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const failureUrl = new URL('/login', origin);
      failureUrl.searchParams.set('error', CALLBACK_ERRORS.exchangeFailed);

      return NextResponse.redirect(failureUrl, 307);
    }

    return NextResponse.redirect(new URL(next, origin), 307);
  } catch {
    const failureUrl = new URL('/login', origin);
    failureUrl.searchParams.set('error', CALLBACK_ERRORS.unexpected);

    return NextResponse.redirect(failureUrl, 307);
  }
}
