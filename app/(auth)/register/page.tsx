import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/components/features/auth/register-form';
import { AUTH_REDIRECT_PATHS } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Create account — Workspace',
  description: 'Create your Workspace account and start organising tasks.',
};

/**
 * Phase 5 / Step 5.1 — Registration route.
 *
 * Server Component shell; validation and submission live in the client form.
 * When Supabase requires email confirmation the form swaps to an instructions
 * state instead of navigating.
 */
export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start organising your work in a few seconds.
        </p>
      </div>

      <RegisterForm redirectTo={AUTH_REDIRECT_PATHS.afterAuth} />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={AUTH_REDIRECT_PATHS.login}
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}