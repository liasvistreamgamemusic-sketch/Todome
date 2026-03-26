# Pre-Deployment Verification

Run all checks **in parallel** using subagents:

1. `pnpm type-check` — Ensure no type errors
2. `pnpm lint` — Ensure no lint violations
3. `pnpm build:web` — Ensure production build succeeds
4. Search for `console.log` in `apps/` and `packages/` source files (exclude test files)
5. Search for hardcoded secrets or API keys in source files
6. Verify `.env.example` is up to date if new env vars were added

Report a deployment readiness summary: **READY** or **NOT READY** with details.
