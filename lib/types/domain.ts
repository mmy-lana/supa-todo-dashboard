/**
 * Phase 1 / Step 1.2 — Pure domain types and runtime Zod schemas.
 *
 * Every entity type is *derived* from `database.types.ts` so the schema stays
 * the single source of truth. Mutation inputs are derived from Zod schemas via
 * `z.infer`, guaranteeing that runtime validation and compile-time types can
 * never drift apart.
 */
import { z } from 'zod';

import type { Database } from '@/lib/supabase/database.types';

/* -------------------------------------------------------------------------- */
/* Entity types (derived from the generated database schema)                   */
/* -------------------------------------------------------------------------- */

type PublicSchema = Database['public'];
type Tables = PublicSchema['Tables'];

/** Row shapes as returned by PostgREST `select()`. */
export type Profile = Tables['profiles']['Row'];
export type Category = Tables['categories']['Row'];
export type Todo = Tables['todos']['Row'];

/** Insert/Update shapes, re-exported so callers never hand-write them. */
export type ProfileInsert = Tables['profiles']['Insert'];
export type ProfileUpdate = Tables['profiles']['Update'];
export type CategoryInsert = Tables['categories']['Insert'];
export type CategoryUpdate = Tables['categories']['Update'];
export type TodoInsert = Tables['todos']['Insert'];
export type TodoUpdate = Tables['todos']['Update'];

/** The Postgres `priority_level` enum, sourced from the generated Enums map. */
export type PriorityLevel = PublicSchema['Enums']['priority_level'];

/**
 * A todo joined with its category through the embedded PostgREST resource
 * selector `*, category:categories(*)`. `category` is `null` when the todo is
 * uncategorised or the referenced category was deleted (`ON DELETE SET NULL`).
 */
export interface TodoWithCategory extends Todo {
  readonly category: Category | null;
}

/* -------------------------------------------------------------------------- */
/* Zod primitives                                                             */
/* -------------------------------------------------------------------------- */

/** Ordered from least to most urgent — used for stable sort ties and UI order. */
export const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'] as const;

export const PrioritySchema = z.enum(PRIORITY_LEVELS);

/** PostgreSQL `uuid` textual representation. */
const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, {
    message: 'Invalid category identifier',
  });

/**
 * Accepts any ISO-8601 string that the native `Date` parser resolves to a valid
 * instant — including offsets (`2026-03-01T09:00:00+02:00`). Rejects
 * calendar-invalid values such as `2026-02-31T00:00:00Z`.
 */
const isoDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid ISO datetime',
  });

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'Invalid hex color representation',
  });

/** Empty form fields arrive as `''`; normalise them to `null` before writing. */
const optionalNullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === undefined || value === null || value === '' ? null : value));

/* -------------------------------------------------------------------------- */
/* Authentication schemas                                                     */
/* -------------------------------------------------------------------------- */

export const AuthCredentialsSchema = z.object({
  email: z.string().trim().min(1, { message: 'Email address is required' }).email({
    message: 'Valid email address required',
  }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .max(72, { message: 'Password must not exceed 72 characters' }),
});

/** Password policy mirrored from `AuthCredentialsSchema` for the register form. */
export const REGISTER_PASSWORD_MIN_LENGTH = 8;

export const RegisterCredentialsSchema = AuthCredentialsSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(1, { message: 'Full name is required' })
    .max(80, { message: 'Full name must not exceed 80 characters' }),
  confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/* -------------------------------------------------------------------------- */
/* Todo schemas                                                               */
/* -------------------------------------------------------------------------- */

export const CreateTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Title cannot be empty' })
    .max(255, { message: 'Title exceeds maximum length of 255 characters' }),
  description: optionalNullableText(2000),
  category_id: uuidSchema.nullable().optional().transform((value) => value ?? null),
  priority: PrioritySchema.default('medium'),
  due_date: isoDateTimeSchema.nullable().optional().transform((value) => value ?? null),
});

export const UpdateTodoSchema = CreateTodoSchema.partial().extend({
  is_completed: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

/* -------------------------------------------------------------------------- */
/* Category schemas                                                           */
/* -------------------------------------------------------------------------- */

export const CategoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Category name required' })
    .max(50, { message: 'Maximum 50 characters allowed' }),
  color_hex: hexColorSchema,
});

/** Curated palette offered by the category editor. */
export const CATEGORY_COLOR_PRESETS = [
  '#64748b',
  '#0ea5e9',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#e11d48',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
] as const;

/* -------------------------------------------------------------------------- */
/* Inferred input types (single source of truth for form + mutation payloads)  */
/* -------------------------------------------------------------------------- */

/** Credentials submitted to `signInWithPassword`. */
export type AuthCredentialsInput = {
  email: string;
  password: string;
};

/** Output shape produced by `AuthCredentialsSchema.parse`. */
export type AuthCredentials = z.infer<typeof AuthCredentialsSchema>;

/** Output shape produced by `RegisterCredentialsSchema.parse`. */
export type RegisterCredentials = z.infer<typeof RegisterCredentialsSchema>;

/** Raw form values bound to the register form before validation. */
export type RegisterCredentialsInput = z.input<typeof RegisterCredentialsSchema>;

/** Validated payload accepted by `createTodo`. */
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
/** Raw form values accepted by `CreateTodoSchema.parse`. */
export type CreateTodoFormValues = z.input<typeof CreateTodoSchema>;

/** Validated payload accepted by `updateTodo`. */
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;

/** Validated payload accepted by `createCategory`. */
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

/* -------------------------------------------------------------------------- */
/* Filter, sort, and statistics view-state types                              */
/* -------------------------------------------------------------------------- */

export const TODO_FILTER_STATUSES = ['all', 'active', 'completed'] as const;
export type TodoFilterStatus = (typeof TODO_FILTER_STATUSES)[number];

export const TODO_SORT_FIELDS = ['position', 'due_date', 'priority', 'created_at'] as const;
export type TodoSortField = (typeof TODO_SORT_FIELDS)[number];

export type SortDirection = 'asc' | 'desc';

/** The complete filter/sort state driving the dashboard task list. */
export interface TodoFilterParams {
  readonly status: TodoFilterStatus;
  readonly categoryId: string | null;
  readonly priority: PriorityLevel | 'all';
  readonly searchQuery: string;
  readonly sortBy: TodoSortField;
  readonly sortDirection: SortDirection;
}

/** The default, unfiltered dashboard view. */
export const DEFAULT_TODO_FILTERS: TodoFilterParams = {
  status: 'all',
  categoryId: null,
  priority: 'all',
  searchQuery: '',
  sortBy: 'position',
  sortDirection: 'asc',
};

/** Aggregate counters rendered by the KPI stat cards. */
export interface TodoStats {
  readonly total: number;
  readonly active: number;
  readonly completed: number;
  readonly overdue: number;
  /** Percentage in the inclusive range 0–100, rounded to the nearest integer. */
  readonly completionRate: number;
}

/* -------------------------------------------------------------------------- */
/* Result helper types                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Discriminated result returned by every mutation entry point, so the UI can
 * branch on `ok` and render a field-level or banner-level error without
 * throwing across component boundaries.
 */
export type DomainResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string; readonly fieldErrors?: Record<string, string[]> };
