'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { getErrorMessage } from '@/lib/utils/errors';
import { AUTH_REDIRECT_PATHS } from '@/lib/supabase/config';
import type { Profile } from '@/lib/types/domain';

/**
 * Phase 5 / Step 5.2 — User account menu.
 *
 * Avatar (or initial fallback) plus name, opening a popover with account
 * details and a sign-out action. Sign-out clears the Supabase session cookies,
 * refreshes server components, then routes to `/login`. Accessible menu
 * semantics mirror `TodoItemActions`: focus on open, Escape closes and returns
 * focus, outside pointer-down closes.
 */

export interface UserAccountMenuProps {
  /** Signed-in user's profile row. */
  profile: Profile;
  /** Layout of the trigger: a full row (sidebar) or compact avatar (header). */
  variant?: 'full' | 'compact';
  /** Called after sign-out completes successfully. */
  onSignedOut?: () => void;
  className?: string;
}

function getInitials(profile: Profile): string {
  const source = profile.full_name?.trim() || profile.email;

  const parts = source
    .split(/[\s@._-]+/)
    .filter((part) => part.length > 0)
    .slice(0, 2);

  const initials = parts.map((part) => part[0]?.toUpperCase() ?? '').join('');

  return initials === '' ? '?' : initials;
}

/** True only for absolute `https:` URLs — the only URLs the image loader accepts. */
function isSecureHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function UserAccountMenu({
  profile,
  variant = 'full',
  onSignedOut,
  className,
}: UserAccountMenuProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const signOutRef = useRef<HTMLButtonElement>(null);

  const displayName = profile.full_name?.trim() || profile.email;

  // Reset the avatar error fallback whenever the identity provider URL changes.
  useEffect(() => {
    setAvatarFailed(false);
  }, [profile.avatar_url]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(getErrorMessage(signOutError, 'Could not sign you out. Please try again.'));
        return;
      }

      onSignedOut?.();
      router.refresh();
      router.push(AUTH_REDIRECT_PATHS.login);
    } catch (signOutError) {
      setError(getErrorMessage(signOutError, 'Could not sign you out. Please try again.'));
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, onSignedOut, router]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => signOutRef.current?.focus());

    const handlePointerDown = (event: MouseEvent | TouchEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  const isCompact = variant === 'compact';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isCompact ? 'size-11 justify-center p-1' : 'w-full min-h-11 px-2 py-1.5'
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-xs font-semibold text-background">
          {profile.avatar_url && !avatarFailed && isSecureHttpsUrl(profile.avatar_url) ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={32}
              height={32}
              onError={() => setAvatarFailed(true)}
              className="size-8 rounded-full object-cover"
            />
          ) : (
            getInitials(profile)
          )}
        </span>
        {!isCompact ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              {profile.full_name ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {profile.email}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className={cn(
            'absolute z-40 min-w-56 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg animate-fade-in',
            isCompact ? 'right-0 top-full mt-1.5' : 'bottom-full left-0 mb-1.5 w-full'
          )}
        >
          <div className="flex items-start gap-2.5 px-2.5 py-2">
            <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="my-1 h-px bg-border" role="separator" />

          {error ? (
            <p role="alert" className="px-2.5 py-1.5 text-xs font-medium text-red-600">
              {error}
            </p>
          ) : null}

          <button
            ref={signOutRef}
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:none)]:min-h-11'
            )}
          >
            <LogOut className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Compact sign-out affordance used by the mobile drawer header. */
export interface SignOutButtonProps {
  className?: string;
  onSignedOut?: () => void;
}

export function SignOutButton({ className, onSignedOut }: SignOutButtonProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async (): Promise<void> => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(getErrorMessage(signOutError, 'Could not sign you out. Please try again.'));
        return;
      }

      onSignedOut?.();
      router.refresh();
      router.push(AUTH_REDIRECT_PATHS.login);
    } catch (signOutError) {
      setError(getErrorMessage(signOutError, 'Could not sign you out. Please try again.'));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleSignOut()}
        isLoading={isSigningOut}
        loadingText="Signing out…"
        className="w-full justify-center"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </Button>
      {error ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}