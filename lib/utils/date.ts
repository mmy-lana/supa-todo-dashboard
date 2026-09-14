/**
 * Phase 1 / Step 1.5 — Date formatting, relative time, and overdue detection.
 *
 * All helpers are pure and timezone-aware: comparisons happen on the numeric
 * epoch value, while display formatting uses the runtime's local timezone.
 * A single `Intl` formatter cache avoids re-instantiating formatters on every
 * render (each `new Intl.*Format` call is expensive).
 */

const MS_PER_DAY = 86_400_000;

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const cacheKey = `${locale}::${JSON.stringify(options)}`;

  const existing = formatterCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat(locale, options);
  formatterCache.set(cacheKey, formatter);

  return formatter;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const DEFAULT_LOCALE = 'en-US';

/* -------------------------------------------------------------------------- */
/* Parsing & normalisation                                                    */
/* -------------------------------------------------------------------------- */

/** Returns `true` when the value parses to a valid instant. */
export function isValidDateInput(value: string | null | undefined): value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Normalises any accepted date input to a canonical UTC ISO string, or `null`
 * when the value is absent/unparseable. Use this before writing to Postgres so
 * the stored `timestamptz` is always consistent.
 */
export function toIsoDateTimeString(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Converts an ISO timestamp into the `YYYY-MM-DDTHH:mm` string required by
 * `<input type="datetime-local">`, expressed in the user's local timezone.
 * Returns `''` for absent/invalid input so the input renders empty.
 */
export function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!isValidDateInput(value)) {
    return '';
  }

  const date = new Date(value);
  const pad = (part: number): string => part.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/**
 * Converts a `<input type="datetime-local">` value (local wall-clock time) into
 * a UTC ISO string, or `null` when the field is empty/invalid.
 */
export function fromDateTimeLocalValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

/** Returns the start of the local day for the given instant. */
export function startOfLocalDay(value: Date | string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setHours(0, 0, 0, 0);

  return date;
}

/** Number of whole local days between two instants, ignoring time of day. */
export function differenceInCalendarDays(target: Date | string, from: Date = new Date()): number {
  const targetStart = startOfLocalDay(target);
  const fromStart = startOfLocalDay(from);

  return Math.round((targetStart.getTime() - fromStart.getTime()) / MS_PER_DAY);
}

/* -------------------------------------------------------------------------- */
/* Overdue detection                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A task is overdue when it has a due date in the past and is not completed.
 * The grace period is the end of the due day: a task due "today at 09:00" is
 * not flagged overdue until the day is over.
 */
export function isOverdue(
  dueDate: string | null | undefined,
  isCompleted: boolean,
  now: Date = new Date()
): boolean {
  if (isCompleted || !isValidDateInput(dueDate)) {
    return false;
  }

  const endOfDueDay = startOfLocalDay(dueDate);
  endOfDueDay.setDate(endOfDueDay.getDate() + 1);

  return endOfDueDay.getTime() <= startOfLocalDay(now).getTime();
}

/** `true` when the due date falls on the current local day and is unfinished. */
export function isDueToday(
  dueDate: string | null | undefined,
  isCompleted: boolean,
  now: Date = new Date()
): boolean {
  if (isCompleted || !isValidDateInput(dueDate)) {
    return false;
  }

  return differenceInCalendarDays(dueDate, now) === 0;
}

/* -------------------------------------------------------------------------- */
/* Display formatting                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Compact due-date label used on task badges.
 * Examples: `Today`, `Tomorrow`, `Yesterday`, `Mar 14`, `Mar 14, 2026`.
 */
export function formatDueDate(
  dueDate: string | null | undefined,
  now: Date = new Date()
): string {
  if (!isValidDateInput(dueDate)) {
    return '';
  }

  const delta = differenceInCalendarDays(dueDate, now);

  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';

  const date = new Date(dueDate);
  const sameYear = date.getFullYear() === now.getFullYear();

  return getFormatter(DEFAULT_LOCALE, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}

/** Full date + time label, e.g. `Mar 14, 2026, 9:00 AM`. */
export function formatDateTime(value: string | null | undefined): string {
  if (!isValidDateInput(value)) {
    return '';
  }

  return getFormatter(DEFAULT_LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

/** Long, human-readable timestamp for the task details drawer. */
export function formatAbsoluteTimestamp(value: string | null | undefined): string {
  if (!isValidDateInput(value)) {
    return '—';
  }

  return formatDateTime(value);
}

/**
 * Relative time label, e.g. `just now`, `5m ago`, `3h ago`, `2d ago`,
 * `in 4d`, falling back to an absolute date beyond 30 days.
 */
export function formatRelativeTime(
  value: string | null | undefined,
  now: Date = new Date()
): string {
  if (!isValidDateInput(value)) {
    return '';
  }

  const then = new Date(value).getTime();
  const diffMs = then - now.getTime();
  const isPast = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const minutes = Math.round(absMs / 60_000);
  const hours = Math.round(absMs / 3_600_000);
  const days = Math.round(absMs / MS_PER_DAY);

  const suffix = (label: string): string => (isPast ? `${label} ago` : `in ${label}`);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return suffix(`${minutes}m`);
  if (hours < 24) return suffix(`${hours}h`);
  if (days <= 30) return suffix(`${days}d`);

  return formatDueDate(value, now);
}

/** Formats a 0–100 completion rate for the KPI progress bar. */
export function formatCompletionRate(rate: number): string {
  if (!Number.isFinite(rate)) {
    return '0%';
  }

  return `${Math.min(100, Math.max(0, Math.round(rate)))}%`;
}
