# Todome - Claude Code Project Configuration

> **コード品質を最高水準で作ること。最小の実装で済むように開発すること。拡張性を持たせること。一貫したコード規則にするために自身でルールを決めること。ベストプラクティスに従うこと。パフォーマンスを意識すること。ここにあることは全て重要なのでコード規則として自身でルールを定めること。全てサブエージェントで並列して実装を行うこと。**

---

## 1. Project Overview

Todome is a full-featured productivity application (Todo / Calendar / Notes / Diary) with web and desktop versions. Built as a pnpm monorepo with Turborepo orchestration, it provides rich text editing (TipTap), calendar management with iCal subscription support, shared calendars with member management, diary entries, drag-and-drop task management, recurring events (rrule), and desktop auto-updates via Tauri.

### Architecture Summary

- **Monorepo**: pnpm workspaces + Turborepo for orchestration
- **Web**: Next.js 15 (App Router) deployed on Vercel
- **Desktop**: Tauri 2 wrapping the Next.js static export, distributed via GitHub Releases with auto-updater
- **Backend**: Supabase (PostgreSQL + Row Level Security + Realtime) as the primary backend; Python backend for auxiliary services
- **Shared code**: Four internal packages (`@todome/ui`, `@todome/hooks`, `@todome/store`, `@todome/db`) consumed by both web and desktop apps

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 22 |
| Package Manager | pnpm | 10.30.3 |
| Build Orchestration | Turborepo | 2.x |
| Language | TypeScript | 5.7+ (strict mode) |
| Web Framework | Next.js (App Router) | 15.x |
| UI Library | React | 19.x |
| Styling | Tailwind CSS | 3.x |
| Rich Text Editor | TipTap | 2.11+ |
| State Management | Zustand | 5.x |
| Server State | TanStack Query | 5.x |
| Drag & Drop | dnd-kit | core 6.x / sortable 10.x |
| Database / Auth | Supabase (PostgreSQL + RLS) | supabase-js 2.x |
| Auth SSR | @supabase/ssr | 0.5.x |
| Desktop | Tauri | 2.x |
| Icons | Lucide React | 0.469+ |
| Date Utilities | date-fns | 4.x |
| Recurrence | rrule | 2.8+ |
| iCal Parsing | ical.js | 2.x |
| Math Rendering | KaTeX | 0.16+ |
| Command Palette | cmdk | 1.x |
| Theme | next-themes | 0.4.x |
| IaC | Terraform | - |
| CI/CD | GitHub Actions | - |
| Hosting (Web) | Vercel | - |

---

## 3. Repository Structure

```
todome/
├── apps/
│   ├── web/                    # @todome/web - Next.js 15 web application
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router (routes, layouts, API)
│   │   │   │   ├── (app)/     # Authenticated app routes
│   │   │   │   ├── (auth)/    # Auth routes (login, signup)
│   │   │   │   ├── api/       # API routes
│   │   │   │   └── invite/    # Invite flow
│   │   │   ├── components/     # Feature-scoped UI components
│   │   │   │   ├── auth/
│   │   │   │   ├── calendar/
│   │   │   │   ├── command-palette/
│   │   │   │   ├── diary/
│   │   │   │   ├── editor/     # TipTap editor components
│   │   │   │   ├── layout/
│   │   │   │   ├── notes/
│   │   │   │   ├── settings/
│   │   │   │   ├── shortcuts/
│   │   │   │   └── todos/
│   │   │   ├── hooks/          # Web-specific hooks & TanStack Query queries
│   │   │   │   └── queries/    # TanStack Query hook definitions
│   │   │   ├── lib/            # Pure utility functions (date, filters, parsers, rrule, ics)
│   │   │   └── middleware.ts   # Supabase auth middleware
│   │   └── scripts/            # Build scripts (build-tauri.mjs)
│   └── desktop/                # @todome/desktop - Tauri 2 desktop wrapper
│       └── src-tauri/          # Rust Tauri source, config & capabilities
├── packages/
│   ├── ui/                     # @todome/ui - Shared UI primitives
│   │   └── src/                # button, modal, input, tooltip, badge, spinner, etc.
│   ├── hooks/                  # @todome/hooks - Shared React hooks
│   │   └── src/                # useDebounce, useClickOutside, useKeyboardShortcut, etc.
│   ├── store/                  # @todome/store - Zustand stores
│   │   └── src/                # todo-store, calendar-store, note-store, diary-store, ui-store, etc.
│   └── db/                     # @todome/db - Supabase client & repository
│       └── src/                # supabase.ts, repository.ts, types.ts
├── backend/                    # Python backend service
│   └── app/
├── infrastructure/
│   └── terraform/              # IaC (AWS, Azure)
├── supabase/
│   └── migrations/             # Sequential SQL migrations (001_, 002_, ...)
├── scripts/                    # Build & utility scripts
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint, type-check, build on PR/push
│       └── release.yml         # DB migration + Tauri build + GitHub Release
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Workspace definition
├── tsconfig.json               # Root TypeScript config (strict)
└── package.json                # Root scripts & devDependencies
```

---

## 4. Development Commands

### Root Commands (run from repository root)

```bash
# Install
pnpm install                  # Install all dependencies

# Development
pnpm dev                      # Start all dev servers (Turborepo)
pnpm desktop:dev              # Tauri desktop dev mode

# Build
pnpm build                    # Build all packages & apps
pnpm build:web                # Build web app only
pnpm build:tauri              # Build Next.js static export for Tauri
pnpm desktop:build            # Build Tauri desktop binary for production

# Quality
pnpm lint                     # Lint all workspaces
pnpm type-check               # TypeScript type-check all packages

# Clean
pnpm clean                    # Remove build artifacts (.next, dist, .turbo)
```

### Per-Package Commands (via `pnpm --filter`)

```bash
pnpm --filter @todome/web dev         # Web dev server only
pnpm --filter @todome/web build       # Web build only
pnpm --filter @todome/ui type-check   # Type-check UI package
pnpm --filter @todome/db lint         # Lint DB package
```

### Supabase

```bash
supabase start                        # Local Supabase (Docker)
supabase db push                      # Apply migrations to remote
supabase db reset                     # Reset local DB and reapply all migrations
supabase migration new <name>         # Create new migration file
```

---

## 5. Code Conventions

### TypeScript

- **Strict mode** is enabled globally (`strict: true`, `noUncheckedIndexedAccess: true`)
- Target: ES2022, Module: ESNext, ModuleResolution: bundler
- All packages export via `src/index.ts` barrel files
- Never use `any`; prefer `unknown` with type narrowing
- Use `satisfies` operator for type-safe object literals
- Use `as const` for literal types
- Prefer `interface` for object shapes that may be extended, `type` for unions/intersections
- Prefer discriminated unions over optional properties for variant types

### Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Files (components) | `kebab-case.tsx` | `date-picker.tsx` |
| Files (hooks) | `use-kebab-case.ts` | `use-debounce.ts` |
| Files (stores) | `kebab-case-store.ts` | `todo-store.ts` |
| Files (utilities) | `kebab-case.ts` | `format-date.ts` |
| React components | `PascalCase` | `DatePicker` |
| Hooks | `useCamelCase` | `useDebounce` |
| Variables / functions | `camelCase` | `formatDate` |
| Types / Interfaces | `PascalCase` | `TodoItem`, `CalendarEvent` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| CSS classes | Tailwind utility-first | - |
| DB columns | `snake_case` | `created_at` |
| Store files | `{domain}-store.ts` | `calendar-store.ts` |

### Import Ordering

Imports must follow this order, separated by blank lines:

1. React / Next.js
2. Third-party libraries
3. `@todome/*` workspace packages
4. Relative imports (parent `../` before sibling `./`)
5. Type-only imports (`import type`)

### Component Patterns

- **Functional components only** (no class components)
- Use **named exports** (no default exports except Next.js pages/layouts)
- Co-locate component-specific types in the same file
- Props interface naming: `{ComponentName}Props`
- Prefer composition over prop drilling
- Use `clsx` for conditional class merging
- Keep components under 200 lines; extract sub-components when exceeding
- Extract logic into hooks; keep components thin

### React Patterns

- Use React 19 features: `use()`, Server Components where applicable
- Memoize expensive computations with `useMemo`, callbacks with `useCallback`
- Never create state for values derivable from existing state
- Use Zustand selectors to minimize re-renders: `useStore(s => s.field)`
- Use `React.memo` only when profiling shows measurable benefit

---

## 6. Architecture Patterns

### Data Flow

```
Supabase (PostgreSQL + RLS)
  └─> @todome/db          (repository.ts: CRUD operations, supabase.ts: client, types.ts: DB types)
       └─> @todome/store   (Zustand stores: client state + Supabase realtime subscriptions)
            └─> @todome/hooks  (shared React hooks wrapping stores & queries)
                 └─> apps/web/hooks/queries  (TanStack Query: cache, sync, optimistic updates)
                      └─> apps/web/components  (UI rendering)
```

### Package Dependency Graph

```
@todome/ui       ── (standalone, no internal deps)
@todome/db       ── (standalone, wraps Supabase)
@todome/store    ── depends on @todome/db
@todome/hooks    ── depends on @todome/store, @todome/db
@todome/web      ── depends on all packages
@todome/desktop  ── wraps @todome/web via Tauri
```

### State Management

- **Zustand** for client-side state (UI state, filters, optimistic data)
- **TanStack Query** for server state (fetching, caching, invalidation)
- Stores are organized per domain: `todo-store`, `calendar-store`, `note-store`, `diary-store`, `subscription-store`, `ui-store`
- Each store file contains its own types, state shape, and actions
- Use Zustand slices pattern when stores grow complex

### Component Architecture

```
apps/web/src/
├── app/           # Route definitions only (thin; delegate to components)
├── components/    # Feature modules (calendar/, todos/, notes/, diary/, etc.)
│   └── feature/
│       ├── feature-view.tsx        # Main view component
│       ├── feature-item.tsx        # List item component
│       └── feature-form.tsx        # Create/edit form
├── hooks/         # App-specific hooks & TanStack Query hooks
│   └── queries/   # Query key factories and query hooks
└── lib/           # Pure utility functions (no React imports)
```

### Key Principles

- **Repository Pattern**: `@todome/db` exposes typed repository functions; never write raw Supabase queries in UI code
- **Separation of concerns**: DB access in `@todome/db`, state in `@todome/store`, UI in `@todome/ui`
- **Feature-scoped components**: Group by domain (calendar, todos, notes), not by type (buttons, modals)
- **Shared packages are app-agnostic**: `@todome/ui`, `@todome/hooks`, `@todome/store` must not import from `next` or `@tauri-apps`
- **Server Components by default**: Only add `"use client"` when state, effects, or browser APIs are needed
- **Optimistic updates**: Use TanStack Query's `onMutate` for immediate UI feedback

---

## 7. Testing Guidelines

### Strategy

- Unit tests for pure utility functions in `lib/`
- Component tests for shared `@todome/ui` components
- Integration tests for store logic and repository operations
- E2E tests for critical user flows

### Conventions

- Test files: `*.test.ts` or `*.test.tsx` co-located with source
- Use `describe`/`it` blocks with descriptive test names
- Mock Supabase client in repository tests
- Test store actions independently from components
- Prefer testing behavior over implementation details

---

## 8. Database (Supabase)

### Configuration

- **PostgreSQL** with Row Level Security (RLS) enabled on all tables
- **Realtime** enabled for live sync (migration 002)
- Auth handled by Supabase Auth with SSR cookie strategy (`@supabase/ssr`)
- Auth middleware in `apps/web/src/middleware.ts`

### Migrations

Located in `supabase/migrations/`, numbered sequentially:

| Migration | Description |
|---|---|
| `001_initial_schema.sql` | Core tables (todos, events, notes) |
| `002_enable_realtime.sql` | Enable Realtime subscriptions |
| `003_event_note_ids.sql` | Link events to notes |
| `004_diaries.sql` | Diary entries table |
| `005_calendar_subscriptions.sql` | External iCal subscriptions |
| `006_shared_calendars.sql` | Shared calendar + members |
| `007_fix_shared_calendar_rls.sql` | RLS policy fixes |
| `008_member_display_names.sql` | Display names for members |

### Migration Rules

- Always create a new numbered migration file; **never modify existing migrations**
- Include both DDL and corresponding RLS policies in the same migration
- Write idempotent SQL (use `IF NOT EXISTS`, `CREATE OR REPLACE`)
- Test migrations locally with `supabase db reset` before pushing
- Name format: `NNN_descriptive_name.sql`

### RLS Policy Guidelines

- Every table must have RLS enabled
- Policies must cover SELECT, INSERT, UPDATE, DELETE
- Use `auth.uid()` for user-scoped access
- Shared resources use membership-based policies
- Always add `WITH CHECK` clauses for write operations

---

## 9. Deployment

### CI Pipeline (`.github/workflows/ci.yml`)

Triggered on push to `main` and all PRs:

1. **Lint & Type Check**: `pnpm type-check` then `pnpm lint`
2. **Build**: `pnpm build:web` (depends on lint/type-check passing)
3. Next.js build cache is stored via GitHub Actions cache

Concurrency: auto-cancels previous runs on the same branch.

### Release Pipeline (`.github/workflows/release.yml`)

Triggered on push to `main`:

1. **DB Migrations**: `supabase db push` via Supabase CLI
2. **Version Detection**: Read from `apps/desktop/src-tauri/tauri.conf.json`
3. **Desktop Build**: Tauri build for Windows (macOS disabled pending Apple Developer signing)
4. **GitHub Release**: Create release with installers + auto-update manifest (`latest.json`)

### Web Deployment

- Vercel auto-deploys from `main` branch
- Preview deployments on PRs
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Desktop Deployment

- Tauri 2 with auto-updater plugin (`@tauri-apps/plugin-updater`)
- Version sourced from `apps/desktop/src-tauri/tauri.conf.json`
- Update manifest (`latest.json`) published to GitHub Releases
- Windows: NSIS installer (`.exe`) + MSI with signing
- macOS: Universal binary DMG (requires Apple Developer certificate, currently disabled)

### Versioning

- Desktop version in `tauri.conf.json` is the single source of truth
- Git tags follow `vX.Y.Z` format
- Bump version in `tauri.conf.json` before merging to `main` for a new release

---

## 10. Rules for Claude

These rules are **mandatory** for all code generation and modifications. (全てのコード生成・変更において必須)

### Quality Standards (コード品質を最高水準で作ること)

- Write production-grade code: no TODOs, no placeholders, no shortcuts
- Handle all error cases explicitly with typed errors
- Add proper TypeScript types for everything; never use `any`
- Ensure accessibility (ARIA attributes, keyboard navigation, focus management)
- Follow existing patterns in the codebase; read neighboring files before writing
- No commented-out code in committed files

### Minimal Implementation (最小の実装で済むように開発すること)

- Implement the simplest correct solution first
- No premature abstractions; refactor only when patterns repeat 3+ times (Rule of Three)
- Prefer built-in browser APIs and existing dependencies over new packages
- Remove dead code immediately; do not leave unused imports or variables
- One responsibility per function, one concern per file
- Justify any new dependency before adding it

### Extensibility (拡張性を持たせること)

- Design interfaces and types to accommodate future growth
- Use discriminated unions for variant types
- Prefer composition patterns (render props, children, slots) over deep inheritance
- Keep package boundaries clean; changes to `@todome/db` should not require changes to `@todome/ui`
- Store business logic in stores/hooks, not in components
- Use dependency injection where testability matters

### Consistent Code Rules (一貫したコード規則にするために自身でルールを決めること)

- Follow all naming conventions defined in Section 5 without exception
- Follow import ordering rules strictly
- Use the established data flow pattern (Section 6)
- Match existing file structure and export patterns
- Consistent error handling: use typed errors, handle at boundary layers
- When adding to an existing file, match the style of that file exactly

### Best Practices (ベストプラクティスに従うこと)

- **React**: Follow Rules of Hooks, use proper dependency arrays, avoid unnecessary re-renders
- **Next.js**: Leverage Server Components, route groups, middleware patterns
- **Supabase**: Always use parameterized queries, never bypass RLS
- **Zustand**: Use selectors (`useStore(s => s.field)`), avoid subscribing to entire store
- **TanStack Query**: Set appropriate `staleTime`/`gcTime`, use query key factories
- **Tailwind**: Use design tokens consistently, avoid inline styles, use `@apply` sparingly
- **SOLID**: Apply Single Responsibility, Open-Closed, Interface Segregation principles

### Performance (パフォーマンスを意識すること)

- Lazy load heavy components (`next/dynamic` in Next.js, `React.lazy` elsewhere)
- Use `React.memo` for expensive list items rendered in loops
- Implement virtual scrolling for long lists (100+ items)
- Optimize images with Next.js `<Image />`
- Minimize bundle size: check import cost, use tree-shakeable imports (e.g., `import { format } from 'date-fns'` not `import * as dateFns`)
- Database: add indexes for frequently queried columns, avoid N+1 queries
- Use `useCallback`/`useMemo` for referential stability in dependency arrays
- Prefer Server Components to reduce client JavaScript

### Parallel Implementation (全てサブエージェントで並列して実装を行うこと)

- When implementing features that span multiple packages, use sub-agents to work on each package in parallel
- Independent file changes should be executed concurrently
- Run independent tool calls (reads, searches, writes) in parallel batches
- Structure work to maximize parallelizable units

### Workflow Rules

- Always verify type-safety mentally before suggesting code changes
- Read existing code before modifying; understand context first
- Keep commits atomic and well-described
- Never commit `.env` files or secrets
- Run `pnpm type-check` and `pnpm lint` after changes

### File Placement Rules

- New shared UI components -> `packages/ui/src/`
- New shared hooks -> `packages/hooks/src/`
- New stores -> `packages/store/src/`
- Database types and queries -> `packages/db/src/`
- App-specific components -> `apps/web/src/components/{feature}/`
- App-specific hooks -> `apps/web/src/hooks/`
- TanStack Query hooks -> `apps/web/src/hooks/queries/`
- Pure utility functions -> `apps/web/src/lib/`
- Migrations -> `supabase/migrations/`
- Always use package name (`@todome/ui`) for cross-package imports, never relative paths across boundaries
- Preserve existing CLAUDE.md files in subdirectories (they contain package-specific instructions)
