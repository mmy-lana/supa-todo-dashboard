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
import {
  RegisterCredentialsSchema,
  type RegisterCredentials,
} from '@/lib/types/domain';

/**
 * Phase 3 / Step 3.5 — Registration form.
 *
 * Full name, email, and password with confirmation. Validation runs through
 * `RegisterCredentialsSchema` (email format, ≥8-char password, matching
 * confirmation). On success the user is signed up; when email confirmation is
 * required the form switches to an instructions state instead of navigating.
 */

export interface RegisterFormProps {
  /** Where to send the user after signing up without confirmation. Defaults to `/`. */
  redirectTo?: string;
  /** Callback fired after a successful sign-up. */
  onSuccess?: () => void;
  className?: string;
}

export function RegisterForm({ redirectTo = '/', onSuccess, className }: RegisterFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setFormError(null);
    setFieldErrors({});
    setConfirmationRequired(false);

    const parsed = RegisterCredentialsSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    const credentials: RegisterCredentials = parsed.data;

    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();

      const emailRedirectTo = `${window.location.origin}/api/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: { full_name: credentials.fullName },
          emailRedirectTo,
        },
      });

      if (error) {
        setFormError(getErrorMessage(error, 'Unable to create your account. Please try again.'));
        return;
      }

      if (!data.session) {
        // Email confirmation flow (default Supabase setting): the user must
        // verify before the session exists.
        setConfirmationRequired(true);
        return;
      }

      router.refresh();
      onSuccess?.();
      router.push(redirectTo);
    } catch (submissionError) {
      setFormError(
        getErrorMessage(submissionError, 'Unable to create your account. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmationRequired) {
    return (
      <ErrorBanner
        tone="info"
        title="Check your email"
        message={`We sent a confirmation link to ${email.trim()}. Open it to activate your account, then sign in.`}
      />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      noValidate
      className={cn('flex flex-col gap-4', className)}
    >
      {formError ? <ErrorBanner title="Unable to register" message={formError} /> : null}

      <Input
        type="text"
        label="Full name"
        placeholder="Ada Lovelace"
        autoComplete="name"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        disabled={isSubmitting}
        invalid={getFieldError(fieldErrors, 'fullName') !== null}
        errorMessage={getFieldError(fieldErrors, 'fullName')}
      />

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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          invalid={getFieldError(fieldErrors, 'password') !== null}
          errorMessage={getFieldError(fieldErrors, 'password')}
          className="pr-11"
        />
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

      <Input
        type={showPassword ? 'text' : 'password'}
        label="Confirm password"
        placeholder="Repeat your password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        disabled={isSubmitting}
        invalid={getFieldError(fieldErrors, 'confirmPassword') !== null}
        errorMessage={getFieldError(fieldErrors, 'confirmPassword')}
      />

      <Button
        type="submit"
        isLoading={isSubmitting}
        loadingText="Creating account…"
        className="mt-1 w-full"
      >
        Create account
      </Button>
    </form>
  );
}