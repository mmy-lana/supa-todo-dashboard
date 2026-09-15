# Supa Todo Dashboard

A high-performance, fullstack productivity workspace and task dashboard built with Next.js 15, React 19, Supabase (Auth, PostgreSQL, and Realtime CDC), and Tailwind CSS v4.

* **Live Demo**: [https://supa-todo-dashboard.vercel.app](https://supa-todo-dashboard.vercel.app)

---

## Architectural Highlights

* **Authentication & Edge Security**: Complete session management using `@supabase/ssr` with HTTP-only cookie synchronization across Next.js Middleware, Server Components, and Server Actions.
* **PostgreSQL Row Level Security (RLS)**: Fine-grained security policies on all tables (`profiles`, `categories`, `todos`), guaranteeing data isolation at the database engine level (`auth.uid() = user_id`).
* **Multi-Table Realtime Synchronization**: Live updates powered by PostgreSQL Change Data Capture (CDC) via Supabase Realtime channels with mutation echo-suppression to prevent duplicate renders.
* **Optimistic Mutation Pipeline**: Zero-latency UI response on task toggles, creation, and deletion with targeted server reconciliation on network failure.
* **Zero-Latency Modals**: Instant 0ms modal state management decoupling view toggles from server component network round-trips.
* **Debounced Search**: Main-thread protection with a 200ms debounce pipeline on search input against in-memory task filters.
* **Tailwind CSS v4**: CSS-first design system utilizing `@theme` directives without legacy configuration files.
* **Mobile-First Layout**: Fully hardened for 360px, 390px, 430px, 768px, and desktop viewports, with minimum 44x44px touch targets and zero hover-dependent actions.

---

## Tech Stack

* **Framework**: Next.js 15 (App Router)
* **Library**: React 19
* **Database & Auth**: Supabase (PostgreSQL 15+, Auth, Realtime)
* **Styling**: Tailwind CSS v4
* **Validation**: Zod (derived domain types)
* **Icons**: Lucide React
* **Package Manager**: pnpm

---

## Project Structure

```text
supa-todo-dashboard/
├── app/
│   ├── (auth)/             # Authentication route group (login, register)
│   ├── (dashboard)/        # Protected workspace routes
│   ├── api/auth/callback/  # Secure OAuth and email code exchange handler
│   ├── globals.css         # Tailwind v4 @theme design tokens
│   └── layout.tsx          # Root HTML layout
├── components/
│   ├── compound/           # Composed molecules (search bar, stat cards, tags)
│   ├── features/           # Domain feature organisms (todos, navigation, auth)
│   └── ui/                 # Atomic UI primitives (button, input, modal, sheet)
├── lib/
│   ├── hooks/              # Custom reactive hooks (useTodos, useCategories)
│   ├── supabase/           # Browser, server, and middleware client factories
│   ├── types/              # Pure domain types derived from database schema
│   └── utils/              # Pure utility modules (cn, date, env, errors, stats)
└── middleware.ts           # Root edge session boundary guard
```

---

## Getting Started

### Prerequisites

* Node.js 20.x or higher
* pnpm (`corepack enable` or `npm install -g pnpm`)
* A Supabase project

### 1. Clone and Install

```bash
git clone https://github.com/mmy-lana/supa-todo-dashboard.git
cd supa-todo-dashboard
pnpm install
```

### 2. Environment Configuration

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Initialization

Execute the SQL schema in your Supabase SQL Editor:

1. Tables: `profiles`, `categories`, and `todos`.
2. Functions & Triggers:
   * `handle_new_user`: Auto-creates a profile record on user signup.
   * `handle_todo_completion`: Manages `completed_at` timestamps server-side.
   * `handle_todo_auto_position`: Assigns sequential integer ordering on insert.
3. Realtime Publication:
   ```sql
   alter table public.todos replica identity full;
   alter table public.categories replica identity full;
   alter publication supabase_realtime add table public.todos;
   alter publication supabase_realtime add table public.categories;
   ```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment (Vercel)

1. Import the repository into Vercel.
2. Add environment variables:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In Supabase Dashboard -> **Authentication** -> **URL Configuration**:
   * Set **Site URL** to your Vercel deployment URL.
   * Add `https://your-domain.vercel.app/api/auth/callback` to **Redirect URLs**.
