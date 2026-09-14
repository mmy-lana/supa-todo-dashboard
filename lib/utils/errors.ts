/**
 * Phase 1 / Step 1.5 — Standardised error extraction.
 *
 * Supabase surfaces failures through `{ data, error }` tuples (never thrown
 * exceptions), while auth helpers and `fetch` may reject. These helpers turn
 * every failure shape into a predictable, user-renderable string so no
 * component ever has to inspect a raw Postgres payload.
 */
import { ZodError } from 'zod';

import { ConfigurationError } from '@/lib/utils/env';

/** Postgres error codes this UI reacts to explicitly. */
export const POSTGRES_ERROR_CODES = {
  /** `unique_violation` — e.g. duplicate category name for the same user. */
  uniqueViolation: '23505',
  /** `foreign_key_violation` — e.g. referencing a deleted category. */
  foreignKeyViolation: '23503',
  /** `check_violation` — e.g. an empty title slipping past client validation. */
  checkViolation: '23514',
  /** `not_null_violation`. */
  notNullViolation: '23502',
  /** PostgREST: no rows matched a `.single()` request. */
  noRows: 'PGRST116',
} as const;

/** Shape of a PostgREST/Auth error as returned by supabase-js. */
export interface SupabaseLikeError {
  readonly message?: unknown;
  readonly details?: unknown;
  readonly hint?: unknown;
  readonly code?: unknown;
  readonly status?: unknown;
  readonly name?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}

/**
 * Maps a Postgres/PostgREST error code to a friendly, actionable sentence.
 * Returns `null` when the code is not one we special-case.
 */
export function messageForPostgresCode(code: string): string | null {
  switch (code) {
    case POSTGRES_ERROR_CODES.uniqueViolation:
      return 'A record with these details already exists.';
    case POSTGRES_ERROR_CODES.foreignKeyViolation:
      return 'This item references a record that no longer exists. Refresh and try again.';
    case POSTGRES_ERROR_CODES.checkViolation:
      return 'The submitted values failed a validation rule.';
    case POSTGRES_ERROR_CODES.notNullViolation:
      return 'A required field was missing.';
    case POSTGRES_ERROR_CODES.noRows:
      return 'That item could not be found. It may have been deleted.';
    default:
      return null;
  }
}

/**
 * Extracts a human-readable message from any thrown or returned error value.
 *
 * @param error   - the unknown value to interpret.
 * @param fallback - message used when nothing useful can be derived.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (error === null || error === undefined) {
    return fallback;
  }

  if (error instanceof ConfigurationError) {
    return error.toDisplayMessage();
  }

  if (error instanceof ZodError) {
    return formatZodError(error);
  }

  if (error instanceof Error) {
    return error.message.trim() === '' ? fallback : error.message;
  }

  if (typeof error === 'string') {
    return error.trim() === '' ? fallback : error;
  }

  if (isRecord(error)) {
    const code = readString(error, 'code');

    if (code) {
      const friendly = messageForPostgresCode(code);
      if (friendly) {
        return friendly;
      }
    }

    const message = readString(error, 'message');
    if (message) {
      return message;
    }

    const details = readString(error, 'details');
    if (details) {
      return details;
    }
  }

  return fallback;
}

/** Flattens a `ZodError` into a single sentence for banner display. */
export function formatZodError(error: ZodError): string {
  const first = error.issues[0];

  return first?.message ?? 'The submitted values are invalid.';
}

/** Flattens a `ZodError` into a per-field map for inline form errors. */
export function getFieldErrors(error: unknown): Record<string, string[]> {
  if (!(error instanceof ZodError)) {
    return {};
  }

  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';

    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

/** Returns the first error message registered for a given form field. */
export function getFieldError(
  fieldErrors: Record<string, string[]> | undefined,
  field: string
): string | null {
  const messages = fieldErrors?.[field];

  return messages && messages.length > 0 ? messages[0] : null;
}

/** Network/offline detection, used to show a "check your connection" banner. */
export function isNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error, '').toLowerCase();

  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed')
  );
}

/**
 * Wraps an arbitrary async operation so callers receive a discriminated result
 * instead of a rejection. This keeps every hook's error path a plain state
 * value rather than a thrown exception.
 */
export async function toResult<T>(
  operation: () => Promise<T>,
  fallback = 'Something went wrong. Please try again.'
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, fallback) };
  }
}
