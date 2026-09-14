# Production Architecture Plan: Fullstack Todo App with Supabase Auth

## 1. Data Schema, DDL, and Type Integrity

### 1.1 Complete PostgreSQL DDL, Constraints, RLS, and Triggers

```sql
-- Extensions
create extension if not exists "uuid-ossp";

-- Enums
create type priority_level as enum ('low', 'medium', 'high', 'urgent');

-- Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Categories Table
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color_hex text not null default '#64748b',
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint uq_categories_user_name unique (user_id, name)
);

-- Todos Table
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  priority priority_level not null default 'medium',
  is_completed boolean not null default false,
  completed_at timestamptz,
  due_date timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Indexes
create index idx_todos_user_id on public.todos(user_id);
create index idx_todos_user_status on public.todos(user_id, is_completed);
create index idx_todos_user_due_date on public.todos(user_id, due_date);
create index idx_todos_position on public.todos(user_id, position asc);
create index idx_categories_user_id on public.categories(user_id);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.todos enable row level security;

-- Profiles Policies
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Categories Policies
create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

-- Todos Policies
create policy "todos_select_own" on public.todos for select using (auth.uid() = user_id);
create policy "todos_insert_own" on public.todos for insert with check (auth.uid() = user_id);
create policy "todos_update_own" on public.todos for update using (auth.uid() = user_id);
create policy "todos_delete_own" on public.todos for delete using (auth.uid() = user_id);

-- Trigger Function: Auto-populate Profile on Auth User Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger Function: Auto-update updated_at Timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger on_todos_updated_at before update on public.todos for each row execute procedure public.handle_updated_at();
create trigger on_profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();

-- Trigger Function: Server-side completed_at Management
create or replace function public.handle_todo_completion()
returns trigger as $$
begin
  if new.is_completed = true and (old.is_completed is null or old.is_completed = false) then
    new.completed_at = timezone('utc'::text, now());
  elsif new.is_completed = false then
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_todos_completion
  before insert or update of is_completed on public.todos
  for each row execute procedure public.handle_todo_completion();

-- Trigger Function: Server-side Sequential Positioning
create or replace function public.handle_todo_auto_position()
returns trigger as $$
begin
  if new.position = 0 then
    select coalesce(max(position) + 1, 0) into new.position
    from public.todos
    where user_id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_todos_auto_position
  before insert on public.todos
  for each row execute procedure public.handle_todo_auto_position();

-- Supabase Realtime Broadcasting
alter table public.todos replica identity full;
alter table public.categories replica identity full;
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.categories;
```

---

### 1.2 Generated Supabase Database Types (`lib/supabase/database.types.ts`)

```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color_hex: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color_hex?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color_hex?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          title: string;
          description: string | null;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          is_completed: boolean;
          completed_at: string | null;
          due_date: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          title: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          is_completed?: boolean;
          completed_at?: string | null;
          due_date?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          title?: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          is_completed?: boolean;
          completed_at?: string | null;
          due_date?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      priority_level: 'low' | 'medium' | 'high' | 'urgent';
    };
  };
}
```

---

### 1.3 Pure Domain Types and Runtime Zod Schemas (`lib/types/domain.ts`)

```typescript
import { z } from 'zod';
import { Database } from '@/lib/supabase/database.types';

// Single source of truth derived from Database schema
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Todo = Database['public']['Tables']['todos']['Row'];
export type PriorityLevel = Database['public']['Tables']['todos']['Row']['priority'];

export interface TodoWithCategory extends Todo {
  category: Category | null;
}

// Zod Schemas
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const AuthCredentialsSchema = z.object({
  email: z.string().trim().email({ message: 'Valid email address required' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

export const CreateTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Title cannot be empty' })
    .max(255, { message: 'Title exceeds maximum length of 255 characters' }),
  description: z.string().trim().max(2000).nullable().optional(),
  category_id: z.string().uuid({ message: 'Invalid category identifier' }).nullable().optional(),
  priority: PrioritySchema.default('medium'),
  due_date: z.string().datetime({ message: 'Invalid ISO datetime' }).nullable().optional(),
});

export const UpdateTodoSchema = CreateTodoSchema.partial().extend({
  is_completed: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const CategoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Category name required').max(50, 'Maximum 50 characters allowed'),
  color_hex: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, { message: 'Invalid hex color representation' }),
});

// Infer input interfaces directly from schemas to prevent drift
export type AuthCredentialsInput = z.infer<typeof AuthCredentialsSchema>;
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

// Filter and View State Types
export type TodoFilterStatus = 'all' | 'active' | 'completed';
export type TodoSortField = 'position' | 'due_date' | 'priority' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface TodoFilterParams {
  status: TodoFilterStatus;
  categoryId: string | null;
  priority: PriorityLevel | 'all';
  searchQuery: string;
  sortBy: TodoSortField;
  sortDirection: SortDirection;
}

export interface TodoStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  completionRate: number;
}
```

---

## 2. Component Architecture and Directory Structure

```
app/
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   └── page.tsx
├── api/
│   └── auth/callback/route.ts
├── layout.tsx
└── globals.css

components/
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── badge.tsx
│   ├── modal.tsx
│   ├── sheet.tsx
│   ├── skeleton.tsx
│   └── dropdown.tsx
├── compound/
│   ├── search-bar.tsx
│   ├── priority-badge.tsx
│   ├── category-tag.tsx
│   ├── date-picker-trigger.tsx
│   ├── empty-state.tsx
│   ├── error-banner.tsx
│   └── stat-card.tsx
└── features/
    ├── auth/
    │   ├── login-form.tsx
    │   └── register-form.tsx
    ├── navigation/
    │   ├── desktop-sidebar.tsx
    │   ├── mobile-header.tsx
    │   ├── mobile-nav-drawer.tsx
    │   └── user-account-menu.tsx
    └── todos/
        ├── todo-list.tsx
        ├── todo-item.tsx
        ├── todo-item-actions.tsx
        ├── todo-quick-create.tsx
        ├── todo-details-sheet.tsx
        ├── todo-filter-bar.tsx
        └── todo-stats-summary.tsx

lib/
├── supabase/
│   ├── database.types.ts
│   ├── client.ts
│   ├── server.ts
│   └── middleware.ts
├── types/
│   └── domain.ts
├── utils/
│   ├── cn.ts
│   ├── date.ts
│   ├── env.ts
│   └── errors.ts
└── hooks/
    ├── use-todos.ts
    ├── use-categories.ts
    └── use-media-query.ts
```

---

## 3. Core Feature Logic and State Pipelines

### 3.1 Authentication and Session Handling Pipeline

```
Inbound Request -> Next.js Middleware (middleware.ts)
  │
  ├── Call createServerClient from @supabase/ssr
  ├── Execute supabase.auth.getUser() to refresh cookies securely
  │
  ├── Path matched: /(dashboard)/*
  │     ├── User authenticated   -> Proceed to requested route
  │     └── User unauthenticated -> 307 Redirect to /login
  │
  ├── Path matched: /(login|register)
  │     ├── User authenticated   -> 307 Redirect to /
  │     └── User unauthenticated -> Proceed to auth route
  │
  └── Inbound Auth Callback: /api/auth/callback
        └── Exchange OAuth / email token code for active session cookies
```

### 3.2 Optimistic Mutation and Realtime Deduplication Pattern

```typescript
// Architectural specification for lib/hooks/use-todos.ts
// Hooks never import UI components; return pure state, data, and dispatchers.

export function useTodos(initialTodos: TodoWithCategory[], userId: string) {
  const [todos, setTodos] = useState<TodoWithCategory[]>(initialTodos);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Set to track pending optimistic mutations and prevent realtime echo clobbering
  const pendingMutationIds = useRef<Set<string>>(new Set());

  // Optimistic Toggle Task Completion
  const toggleTodo = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    pendingMutationIds.current.add(id);

    // 1. Optimistic local state apply
    setTodos((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              is_completed: nextStatus,
              completed_at: nextStatus ? new Date().toISOString() : null,
            }
          : item
      )
    );

    // 2. Remote database execution
    const supabase = createBrowserClient();
    const { data, error: updateError } = await supabase
      .from('todos')
      .update({ is_completed: nextStatus })
      .eq('id', id)
      .select('*, category:categories(*)')
      .single();

    if (updateError) {
      // Revert optimistic update on failure
      setTodos((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                is_completed: currentStatus,
                completed_at: currentStatus ? item.completed_at : null,
              }
            : item
        )
      );
      setError(updateError.message);
    } else if (data) {
      setTodos((prev) => prev.map((item) => (item.id === id ? (data as TodoWithCategory) : item)));
    }

    pendingMutationIds.current.delete(id);
  };

  return { todos, error, isLoading, toggleTodo, setTodos, setError };
}
```

### 3.3 Multi-Table Realtime Synchronization Architecture

* Channel Identifier: `supabase.channel('workspace:' + userId)`.
* `todos` Events:
  - `INSERT`: Verify payload ID is not present in local list; prepend new task if it matches active view filters.
  - `UPDATE`: If `pendingMutationIds.has(payload.new.id)` is true, ignore event (prevents mutation echo). Otherwise, update record in-place.
  - `DELETE`: Filter item out of local state by ID immediately.
* `categories` Events:
  - `DELETE`: Map existing tasks in memory: if `todo.category_id === payload.old.id`, set `category_id: null` and `category: null`.
  - `UPDATE`: Update matching category tags across all cached tasks in memory.

### 3.4 Responsive Viewport and Tap Target Invariants

* **Mobile Viewports (360px, 390px, 430px)**:
  - Minimum tap target: All interactive targets (checkboxes, action triggers, buttons) must occupy a minimum dimension of `44px x 44px`.
  - `todo-item.tsx` structural composition:
    - Row 1: Checkbox container (`min-w-[44px] min-h-[44px]`) + Title (`truncate max-w-[200px] text-sm sm:max-w-md`). Action ellipsis button anchored to top-right (`min-w-[44px] min-h-[44px]`).
    - Row 2: Badges (Priority, Category, Due Date) wrap beneath title with `flex flex-wrap gap-1 mt-1.5 pl-11`.
  - Filter bar transformation: Segmented control (`All`, `Active`, `Completed`) converts into a full-width native `<select>` dropdown (`block sm:hidden`). Desktop segmented pill row is hidden (`hidden sm:flex`).
  - Stat KPI cards layout: Rendered as a single-column vertical stack (`grid-cols-1 gap-2.5`).
  - Z-Index hierarchy:
    - FAB (Quick-Create Trigger): `fixed bottom-6 right-6 z-30` (conditionally hidden when mobile sheet is open).
    - Modal / Sheet Backdrop: `fixed inset-0 z-40 bg-black/60`.
    - Mobile Bottom Navigation / Details Drawer: `fixed bottom-0 inset-x-0 z-50`.
* **Tablet Viewport (768px)**:
  - Stat KPI cards: Two-column grid (`grid-cols-2 gap-4`).
  - Filter row: Inline search input and segmented buttons display horizontally.
  - Actions: Ellipsis menu retains permanent touch target, no hover dependencies.
* **Desktop Viewport (1024px+)**:
  - Stat KPI cards: Four-column grid (`grid-cols-4 gap-4`).
  - Sidebar: Permanent fixed column (`w-64 border-r`).
  - Task inspector: Secondary right panel or slide-over drawer (`w-96`).

---

## 4. 5-Phase Sequential Queue

```
================================================================================
PHASE 1: TYPES, STORAGE/API CLIENT CONFIG, AND BASE UTILITIES
================================================================================
[ ] Step 1.1: Environment Variable Assertion
    Implement typed environment validator in `lib/utils/env.ts`:
    - NEXT_PUBLIC_SUPABASE_URL (valid URL format)
    - NEXT_PUBLIC_SUPABASE_ANON_KEY (non-empty string)
    Throw explicit configuration errors at runtime if missing.

[ ] Step 1.2: Database Types and Domain Schemas
    - Create `lib/supabase/database.types.ts` containing the generated database schema.
    - Create `lib/types/domain.ts` deriving all domain models (`Todo`, `Category`, `Profile`, `PriorityLevel`) from `database.types.ts`.
    - Implement Zod schemas: `AuthCredentialsSchema`, `CreateTodoSchema`, `UpdateTodoSchema`, `CategoryInputSchema`.
    - Derive input types via `z.infer` to prevent divergence.

[ ] Step 1.3: Supabase SSR Client Initialization
    - Implement `lib/supabase/client.ts` using `createBrowserClient<Database>`.
    - Implement `lib/supabase/server.ts` using `createServerClient<Database>` with Next.js cookie adapters.
    - Implement `lib/supabase/middleware.ts` for session refresh handling.

[ ] Step 1.4: Middleware Boundary Enforcement
    - Construct root `middleware.ts` intercepting `/dashboard/*`, `/login`, and `/register`.
    - Ensure unauthenticated users requesting protected routes receive a 307 redirect to `/login`.
    - Ensure authenticated users requesting auth routes receive a 307 redirect to `/`.

[ ] Step 1.5: Utility Functions
    - Implement `lib/utils/cn.ts` wrapping `clsx` and `tailwind-merge`.
    - Implement `lib/utils/date.ts` for relative formatting, overdue status calculation, and ISO string normalization.
    - Implement `lib/utils/errors.ts` providing standardized error message extraction from Supabase responses.

================================================================================
PHASE 2: DESIGN FOUNDATION & ATOMIC UI PRIMITIVES
================================================================================
[ ] Step 2.1: Design Tokens & Tailwind v4 Theme Configuration
    Configure `@theme` tokens in `app/globals.css` for Tailwind CSS v4 CSS-first engine:
    - Priority accent tokens: `--color-priority-low: #64748b;`, `--color-priority-medium: #f59e0b;`, `--color-priority-high: #f97316;`, `--color-priority-urgent: #e11d48;`.
    - Retain `@import "tailwindcss";` and maintain zero JS config (`tailwind.config.ts` removed).

[ ] Step 2.2: Button Primitive (`components/ui/button.tsx`)
    - Implement variants: `default`, `secondary`, `outline`, `ghost`, `danger`.
    - Implement sizes: `sm`, `md`, `lg`, `icon`.
    - Include accessible focus indicators and minimum 44px tap area on touch devices.
    - Provide loading spinner state with disabled interaction lock.

[ ] Step 2.3: Form Primitives
    - Input (`components/ui/input.tsx`): 1px border, neutral focus-visible ring, disabled and invalid states.
    - Textarea (`components/ui/textarea.tsx`): Resizable vertical control with synchronized typography.
    - Checkbox (`components/ui/checkbox.tsx`): Accessible custom input with high-contrast SVG checkmark, minimum 44px tap container.
    - Select (`components/ui/select.tsx`): Native-accessible selector with custom styled appearance.

[ ] Step 2.4: Status and Overlay Primitives
    - Badge (`components/ui/badge.tsx`): Pill styling with solid and outline variations for priorities and categories.
    - Skeleton (`components/ui/skeleton.tsx`): Monochromatic pulsing placeholder for loading states.
    - Modal (`components/ui/modal.tsx`): Accessible dialog container with backdrop blur, focus trap, and Escape key listener.
    - Sheet (`components/ui/sheet.tsx`): Slide-over drawer supporting bottom-sheet mode on mobile and right-panel mode on desktop.

================================================================================
PHASE 3: COMPOUND MOLECULES & FEATURE COMPONENTS
================================================================================
[ ] Step 3.1: Task Item Component (`components/features/todos/todo-item.tsx`)
    - Layout: Two-row responsive flex structure.
    - Row 1: Checkbox (44px target) + Title with truncation + Action trigger ellipsis.
    - Row 2: Badges (Priority, Category, Due Date) wrapping underneath title.
    - Completed state: Strike-through text, reduced opacity (70%), muted category color.
    - Overdue state: Prominent red warning tag for past-due unfinished tasks.

[ ] Step 3.2: Task Quick-Create Bar (`components/features/todos/todo-quick-create.tsx`)
    - Inline task creation input with autofocus support.
    - Category selector dropdown and Priority selector buttons embedded directly in control bar.
    - Enter key submission handler running validation through `CreateTodoSchema`.

[ ] Step 3.3: Filter and Sort Bar (`components/features/todos/todo-filter-bar.tsx`)
    - Desktop: Segmented pill selector (`All`, `Active`, `Completed`).
    - Mobile (<= 430px): Full-width `<select>` dropdown replacing segmented pills.
    - Text search input with instant clear button.
    - Category filter and Priority filter dropdowns.

[ ] Step 3.4: Metric and Stat Overview (`components/compound/stat-card.tsx`)
    - Display KPI cards: Total Tasks, Active, Completed, Overdue.
    - Progress bar reflecting completion rate percentage.
    - Grid rules: Single column on <= 430px, 2-column on 768px, 4-column on 1024px+.

[ ] Step 3.5: Auth Forms
    - LoginForm (`components/features/auth/login-form.tsx`): Email and password inputs, form validation, error message banner.
    - RegisterForm (`components/features/auth/register-form.tsx`): Registration input fields with confirmation validation.

================================================================================
PHASE 4: DOMAIN LOGIC, REACTIVE STATE, AND SPECIALIZED APIS
================================================================================
[ ] Step 4.1: Custom Reactive Hook: `useTodos` (`lib/hooks/use-todos.ts`)
    - Encapsulate Supabase querying with server sorting.
    - Implement `pendingMutationIds` ref set to eliminate realtime self-echo collisions.
    - Implement optimistic updates for `toggleTodo`, `createTodo`, `updateTodo`, and `deleteTodo`.
    - Return pure data handles and mutation methods without importing any UI components.

[ ] Step 4.2: Category Management Hook: `useCategories` (`lib/hooks/use-categories.ts`)
    - Fetch and cache user category definitions.
    - Provide mutation handlers for creating and removing categories with duplicate name checking.

[ ] Step 4.3: Realtime Subscription Engine
    - Establish multi-table channel `workspace:${userId}` listening to `todos` and `categories`.
    - Ingest remote insertions, updates, and deletions into active state without full refetch.
    - Handle unlinking of deleted categories across tasks in memory.
    - Ensure clean channel termination on component unmount.

[ ] Step 4.4: Task Details and Edit Drawer (`components/features/todos/todo-details-sheet.tsx`)
    - Slide-out sheet allowing edit of title, description, category, priority, and due date.
    - Display read-only timestamps: Created at, last modified, completed at.
    - Confirmable delete button with immediate local optimistic removal.

================================================================================
PHASE 5: COMPLETE PAGE ASSEMBLY & RESPONSIVE SHELL
================================================================================
[ ] Step 5.1: Auth Pages Assembly
    - Route `app/(auth)/login/page.tsx`: Centered minimalist card layout with login form.
    - Route `app/(auth)/register/page.tsx`: Onboarding registration view with validation.
    - Route `app/api/auth/callback/route.ts`: Secure cookie token exchange endpoint.

[ ] Step 5.2: Dashboard Responsive Layout Shell (`app/(dashboard)/layout.tsx`)
    - Desktop: Persistent fixed left sidebar (navigation links, category lists, user session menu).
    - Mobile: Sticky top navigation bar with hamburger menu, workspace title, and user profile avatar.
    - Mobile bottom drawer for full workspace navigation.
    - Floating Action Button (FAB) at `z-30` for mobile task creation, hidden when bottom drawer opens.

[ ] Step 5.3: Main Dashboard Page Assembly (`app/(dashboard)/page.tsx`)
    - Server Component initial data fetch: Load session and initial tasks server-side to eliminate client waterfall.
    - Pass data to Client Component container for hydration.
    - Layout hierarchy: Stat cards top -> Quick create row -> Filter bar -> Task list.

[ ] Step 5.4: Edge State Implementations
    - Loading: Render 5 skeleton rows matching exact task card height.
    - Empty (Zero Tasks): Informative illustration and prompt to create first task.
    - Empty (Filtered): Message indicating no tasks match current search/filter combination with reset button.
    - Error: Inline notification banner with manual retry action.

[ ] Step 5.5: Responsive Hardening and Quality Audit
    - Validate 360px viewport: Verify zero horizontal overflow, title truncation, wrapped badge layout, and 44px tap targets.
    - Validate 390px / 430px viewports: Check padding, modal positioning, and bottom sheet reachability.
    - Validate 768px tablet layout: 2-column KPI grid and compact navigation.
    - Validate 1024px+ desktop layout: Persistent sidebar and multi-column presentation.
    - Verify full keyboard navigation: `Tab` order, `Space` for completion toggle, `Escape` to close drawers.
```

---

## 5. Verification and Quality Gate Checklist

* [ ] Database Integrity: All tables have Row Level Security enabled with `auth.uid() = user_id` policies for select, insert, update, and delete operations.
* [ ] Trigger Automation: `completed_at` updates automatically based on `is_completed` state; `position` assigns sequential integer on insertion.
* [ ] Type Safety: Types derived strictly from `database.types.ts`; form and mutation inputs derived from Zod schemas via `z.infer`. Zero duplicate hand-written interfaces.
* [ ] Architectural Boundaries: Hooks in `lib/hooks/*` do not import components from `components/*`. Errors are surfaced as state values.
* [ ] Realtime Stability: Realtime update handler checks `pendingMutationIds` to prevent optimistic mutation clobbering and flickering.
* [ ] Mobile Usability: No feature requires desktop hover states. All interactive elements provide a minimum `44px x 44px` hit area. Text titles truncate cleanly at 360px width without horizontal scrollbars.
