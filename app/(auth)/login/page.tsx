import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { LoginForm } from '@/components/features/auth/login-form';
import { AUTH_REDIRECT_PATHS } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Sign in — Workspace',
  description: 'Sign in to your Workspace task dashboard.',
};

/**
 * Phase 5 / Step 5.1 — Login route.
 *
 * Server Component shell; the interactive form is a client component. An
 * already-authenticated visitor never reaches this page — the middleware
 * redirects them to the dashboard.
 */
export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue to your dashboard.
        </p>
      </div>

      {/* `LoginForm` reads `?error=` (set by /api/auth/callback) via
          useSearchParams, which requires a Suspense boundary at prerender. */}
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
        }
      >
        <LoginForm redirectTo={AUTH_REDIRECT_PATHS.afterAuth} />
      </Suspense>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href={AUTH_REDIRECT_PATHS.register}
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}