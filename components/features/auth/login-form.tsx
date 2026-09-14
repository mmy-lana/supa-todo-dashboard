'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorBanner } from '@/components/compound/error-banner';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { getErrorMessage, getFieldErrors, getFieldError } from '@/lib/utils/errors';
import { AuthCredentialsSchema, type AuthCredentialsInput } from '@/lib/types/domain';

/**
 * Phase 3 / Step 3.5 — Login form.
 *
 * Email + password with schema validation, inline field errors, a form-level
 * error banner, and a password visibility toggle. On success the form rotates
 * the client session into the cookie store via `router.refresh()` before
 * navigating, so middleware / server components immediately see the session.
 */

export interface LoginFormProps {
  /** Where to send the user after a successful sign-in. Defaults to `/`. */
  redirectTo?: string;
  /** Callback fired after a successful sign-in. */
  onSuccess?: () => void;
  className?: string;
}

export function LoginForm({
  redirectTo = '/',
  onSuccess,
  className,
}: LoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setFormError(null);
    setFieldErrors({});

    const parsed = AuthCredentialsSchema.safeParse({ email, password });

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    const credentials: AuthCredentialsInput = parsed.data;

    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword(credentials);

      if (error) {
        setFormError(getErrorMessage(error, 'Unable to sign in. Please try again.'));
        return;
      }

      // Refresh server-rendered components so they observe the new session
      // before we navigate.
      router.refresh();
      onSuccess?.();
      router.push(redirectTo);
    } catch (submissionError) {
      setFormError(getErrorMessage(submissionError, 'Unable to sign in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      noValidate
      className={cn('flex flex-col gap-4', className)}
    >
      {formError ? <ErrorBanner title="Unable to sign in" message={formError} /> : null}

      <Input
        type="email"
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={isSubmitting}
        invalid={getFieldError(fieldErrors, 'email') !== null}
        errorMessage={getFieldError(fieldErrors, 'email')}
      />

      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          invalid={getFieldError(fieldErrors, 'password') !== null}
          errorMessage={getFieldError(fieldErrors, 'password')}
          className="pr-11"
        />
        {/* Offset = label line (20px) + gap (6px) + 4px to vertically centre
            the 32px button within the 40px input. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          disabled={isSubmitting}
          className="absolute right-0.5 top-[30px] size-8 text-muted-foreground [@media(hover:none)]:size-9"
        >
          {showPassword ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      <Button
        type="submit"
        isLoading={isSubmitting}
        loadingText="Signing in…"
        className="mt-1 w-full"
      >
        Sign in
      </Button>
    </form>
  );
}