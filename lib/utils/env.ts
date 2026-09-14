/**
 * Phase 1 / Step 1.1 — Environment Variable Assertion.
 *
 * This module is the single source of truth for runtime configuration. It is
 * intentionally dependency-free (no `@/` imports, no Node built-ins) so that it
 * can be evaluated from every runtime surface:
 *
 *   - the browser bundle (`NEXT_PUBLIC_*` values are inlined by Next.js),
 *   - the Node.js server runtime (Server Components, Route Handlers),
 *   - the Edge runtime (root `middleware.ts`).
 *
 * Failure mode: a `ConfigurationError` is thrown immediately at module
 * evaluation time rather than deferring to a confusing downstream failure such
 * as `fetch failed` or `Invalid API key` on the first query.
 */

/** Names of the environment variables this application requires. */
export type EnvironmentVariableName =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

/** A single, human-readable configuration failure. */
export interface EnvironmentIssue {
  readonly variable: EnvironmentVariableName;
  readonly message: string;
}

/**
 * Raised when one or more required environment variables are missing or
 * malformed. Extends `Error` so existing `instanceof Error` handling keeps
 * working, while carrying structured issues for diagnostics.
 */
export class ConfigurationError extends Error {
  readonly issues: readonly EnvironmentIssue[];

  constructor(issues: readonly EnvironmentIssue[]) {
    const summary = issues.map((issue) => `${issue.variable}: ${issue.message}`).join('; ');

    super(`Invalid environment configuration — ${summary}`);

    this.name = 'ConfigurationError';
    this.issues = Object.freeze([...issues]);

    // Required so `instanceof ConfigurationError` survives the ES2022 downlevel
    // that `tsc`/SWC apply when targeting ES5-like output.
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }

  /** A multi-line, copy-pasteable remediation message for logs and UI banners. */
  toDisplayMessage(): string {
    const lines = this.issues.map((issue) => `  • ${issue.variable} — ${issue.message}`);

    return [
      'Supabase configuration is incomplete.',
      ...lines,
      'Add the missing values to `.env.local` (see `.env.example`) and restart the dev server.',
    ].join('\n');
  }
}

/**
 * A value that is clearly still a placeholder from `.env.example`. Treated as
 * "missing" so the developer gets an actionable error instead of a runtime
 * `TypeError: Invalid URL` from deep inside `fetch`.
 */
const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /^your[-_]?/i,
  /_here$/i,
  /^<.*>$/,
  /^changeme$/i,
  /^replace[-_]?me$/i,
  /^todo$/i,
  /^x+$/i,
];

function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

/**
 * Reads an environment variable using explicit member access so the Next.js
 * bundler can statically inline NEXT_PUBLIC_* variables into client bundles.
 */
function readRawEnv(name: EnvironmentVariableName): string | undefined {
  if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  if (name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  return undefined;
}

function validateVariable(
  name: EnvironmentVariableName,
  rawValue: string | undefined
): { value: string | null; issue: EnvironmentIssue | null } {
  const trimmed = rawValue?.trim() ?? '';

  if (trimmed.length === 0) {
    return {
      value: null,
      issue: { variable: name, message: 'is not set. This variable is required.' },
    };
  }

  if (isPlaceholderValue(trimmed)) {
    return {
      value: null,
      issue: {
        variable: name,
        message: 'still contains the example placeholder value from `.env.example`.',
      },
    };
  }

  if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
    let parsed: URL;

    try {
      parsed = new URL(trimmed);
    } catch {
      return {
        value: null,
        issue: {
          variable: name,
          message: 'is not a valid absolute URL (expected e.g. `https://<project-ref>.supabase.co`).',
        },
      };
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        value: null,
        issue: {
          variable: name,
          message: `must use the http or https protocol (received "${parsed.protocol}").`,
        },
      };
    }

    // Normalise away any trailing slash so downstream URL concatenation is stable.
    const normalised = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;

    return { value: normalised, issue: null };
  }

  return { value: trimmed, issue: null };
}

/** The fully validated, immutable runtime configuration. */
export interface Environment {
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  /** `true` when the application is running a production build. */
  readonly isProduction: boolean;
}

/**
 * Validates the required variables and returns the typed environment.
 *
 * @throws {ConfigurationError} when any required variable is missing or invalid.
 */
export function getEnvironment(): Environment {
  const names: readonly EnvironmentVariableName[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const issues: EnvironmentIssue[] = [];
  const resolved = new Map<EnvironmentVariableName, string>();

  for (const name of names) {
    const { value, issue } = validateVariable(name, readRawEnv(name));

    if (issue) {
      issues.push(issue);
    } else if (value !== null) {
      resolved.set(name, value);
    }
  }

  if (issues.length > 0) {
    throw new ConfigurationError(issues);
  }

  return Object.freeze({
    NEXT_PUBLIC_SUPABASE_URL: resolved.get('NEXT_PUBLIC_SUPABASE_URL') as string,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: resolved.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') as string,
    isProduction: readRawEnv('NEXT_PUBLIC_SUPABASE_URL') !== undefined && isProductionRuntime(),
  });
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * The validated environment, resolved eagerly at module load.
 *
 * Importing this constant from client, server, or middleware code fails fast
 * with a `ConfigurationError` if the deployment is misconfigured.
 */
export const env: Environment = getEnvironment();
