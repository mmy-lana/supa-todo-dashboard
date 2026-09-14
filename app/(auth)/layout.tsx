import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — Workspace',
  description: 'Sign in to your Workspace task dashboard.',
};

/**
 * Phase 5 / Step 5.1 — Auth route-group layout.
 *
 * Centres a single minimalist card for both `/login` and `/register`. The
 * route group `(auth)` does not appear in the URL. Access control for these
 * routes is enforced by the root middleware (authenticated users are 307'd to
 * the dashboard).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xl font-semibold tracking-tight text-foreground">Workspace</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Organise your tasks, priorities, and categories.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}