# Todome — Claude Code Project Guide

**コード品質を最高水準で作ること。最小の実装で済むように開発すること。拡張性を持たせること。一貫したコード規則にするために自身でルールを決めること。ベストプラクティスに従うこと。パフォーマンスを意識すること。ここにあることは全て重要なのでコード規則として自身でルールを定めること。全てサブエージェントで並列して実装を行うこと。**

---

## Project Overview

Todome is a full-featured productivity app (Todo / Calendar / Notes) with web and desktop versions. Built as a pnpm monorepo with Turborepo orchestration.

- **Web**: Next.js 15 on Vercel
- **Desktop**: Tauri 2 (Windows, macOS)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **State**: Zustand + TanStack Query

---

## Tech Stack

| Layer        | Technology                                      |
|-------------|--------------------------------------------------|
| Framework   | Next.js 15 (App Router), React 19               |
| Desktop     | Tauri 2                                          |
| Styling     | Tailwind CSS 3                                   |
| State       | Zustand 5, TanStack Query 5                      |
| Editor      | TipTap 2                                         |
| DnD         | dnd-kit                                          |
| Auth / DB   | Supabase (SSR client, RLS)                       |
| Language    | TypeScript 5.7+ (strict mode)                    |
| Build       | Turborepo, pnpm 10.30.3                          |
| Node        | 22                                               |
| IaC         | Terraform                                        |

---

## Repository Structure

```
todome/
├── apps/
│   ├── web/              # @todome/web — Next.js 15 web app
│   └── desktop/          # @todome/desktop — Tauri 2 desktop shell
├── packages/
│   ├── ui/               # @todome/ui — Shared UI components
│   ├── hooks/            # @todome/hooks — Shared React hooks
│   ├── store/            # @todome/store — Zustand stores
│   └── db/               # @todome/db — Supabase client & repository
├── backend/              # Python backend services
├── infrastructure/
│   └── terraform/        # IaC definitions
├── supabase/
│   └── migrations/       # Numbered SQL migration files
├── scripts/              # Build & utility scripts
├── .claude/              # Claude Code configuration
│   ├── settings.json     # Permissions & hooks
│   └── commands/         # Custom slash commands
├── .github/
│   └── workflows/        # CI/CD pipelines
├── turbo.json            # Turborepo task config
├── pnpm-workspace.yaml   # Workspace definition
├── tsconfig.json         # Root TypeScript config
└── package.json          # Root scripts & devDependencies
```

---

## Development Commands

```bash
# Install
pnpm install

# Development
pnpm dev                  # Start all dev servers (Turbo)
pnpm desktop:dev          # Tauri desktop dev mode

# Build
pnpm build                # Build all packages
pnpm build:web            # Build web only
pnpm build:tauri          # Build for Tauri (static export)
pnpm desktop:build        # Build desktop binary

# Quality
pnpm lint                 # Lint all workspaces
pnpm type-check           # TypeScript type checking

# Clean
pnpm clean                # Remove build artifacts
```

---

## Architecture & Data Flow

```
Supabase (PostgreSQL + RLS)
  └─> @todome/db          # Client creation, repository pattern, type definitions
       └─> @todome/store   # Zustand stores with Supabase subscriptions
            └─> @todome/hooks  # React hooks wrapping stores & queries
                 └─> @todome/ui   # Presentational components
                      └─> apps/web   # Pages, layouts, API routes
```

### Key Patterns

- **Repository Pattern**: `@todome/db` exposes typed repository functions, never raw Supabase queries in UI
- **Store Pattern**: Zustand stores in `@todome/store` handle client state + Supabase realtime subscriptions
- **Hook Pattern**: `@todome/hooks` provides `use*` hooks that combine store access with TanStack Query
- **Component Pattern**: `@todome/ui` contains stateless, composable components; apps compose with data

---

## Code Conventions

### TypeScript

- Strict mode enabled (`strict: true`, `noUncheckedIndexedAccess: true`)
- Prefer `type` over `interface` unless extending is needed
- Use `as const` for literal types
- No `any` — use `unknown` and narrow with type guards
- Prefer discriminated unions over optional properties

### Naming

| Item             | Convention            | Example                   |
|-----------------|-----------------------|---------------------------|
| Files            | kebab-case            | `use-keyboard-shortcut.ts`|
| Components       | PascalCase            | `NoteEditor.tsx` → `NoteEditor` |
| Hooks            | camelCase with `use`  | `useNotes`                |
| Stores           | camelCase with `Store`| `noteStore`               |
| Types/Interfaces | PascalCase            | `TodoItem`, `CalendarEvent` |
| Constants        | UPPER_SNAKE_CASE      | `MAX_RETRY_COUNT`         |
| CSS classes      | Tailwind utility-first| —                         |

### Imports

Order (enforced):
1. React / Next.js
2. External libraries
3. `@todome/*` packages
4. Relative imports
5. Type-only imports (`import type`)

### Components

- Functional components only (no class components)
- Co-locate component, types, and styles
- Extract logic into hooks; keep components thin
- Use `React.memo` only when profiling shows benefit
- Prefer composition over prop drilling

### Performance

- Lazy load heavy components (`next/dynamic`, `React.lazy`)
- Use `useMemo`/`useCallback` only for expensive computations or stable references
- Virtualize long lists
- Optimize images with `next/image`
- Minimize client-side JavaScript; prefer Server Components

---

## Database (Supabase)

### Migrations

Migration files live in `supabase/migrations/` with sequential numbering:

```
001_initial_schema.sql
002_enable_realtime.sql
003_event_note_ids.sql
...
```

To create a new migration:
1. Create `supabase/migrations/NNN_description.sql`
2. Write idempotent SQL (use `IF NOT EXISTS`, `CREATE OR REPLACE`)
3. Always include RLS policies for new tables
4. Apply via `supabase db push` or CI

### RLS Rules

- Every table must have RLS enabled
- Policies use `auth.uid()` for user scoping
- Shared resources use membership-based policies

---

## Deployment

| Target   | Platform       | Trigger             |
|----------|---------------|---------------------|
| Web      | Vercel         | Push to `main`      |
| Desktop  | GitHub Release | Push to `main` (CI) |
| Database | Supabase       | CI migration job    |

### CI/CD Pipeline

- **CI** (`ci.yml`): Lint → Type Check → Build (on PR & push to main)
- **Release** (`release.yml`): DB migrate → Version → Build Tauri → GitHub Release

---

## Rules for Claude

### Quality Standards

1. **最高品質**: Production-ready code only. No TODO comments, no placeholder implementations.
2. **最小実装**: Solve the problem with minimal code. No premature abstractions or over-engineering.
3. **拡張性**: Design for extension. Use dependency injection, composable patterns, and clear interfaces.
4. **一貫性**: Follow the conventions in this file strictly. When in doubt, match existing code patterns.
5. **ベストプラクティス**: Apply SOLID principles, prefer immutability, handle errors at boundaries.
6. **パフォーマンス**: Consider bundle size, render cycles, and query efficiency in every change.
7. **並列実装**: Use subagents (`Agent` tool) to parallelize independent work items.

### Workflow Rules

- Always run `pnpm type-check` after TypeScript changes
- Always run `pnpm lint` after code changes
- Run `pnpm build:web` to verify builds before committing
- Read existing code before modifying — understand context first
- Keep commits atomic and well-described
- Never commit `.env` files or secrets

### File Rules

- New components go in the appropriate package (`@todome/ui` for shared, `apps/web` for app-specific)
- New hooks go in `@todome/hooks` if reusable, co-located if app-specific
- New store slices go in `@todome/store`
- Database types and queries go in `@todome/db`
- Migrations go in `supabase/migrations/`
