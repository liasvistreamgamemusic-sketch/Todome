# Run All Quality Checks

Run these checks **in parallel** using subagents and report results:

1. `pnpm type-check` — TypeScript type checking
2. `pnpm lint` — ESLint linting
3. `pnpm build:web` — Production build verification

For each check, report: **Pass/Fail**, error count, and affected files.
Provide an overall status summary at the end.
