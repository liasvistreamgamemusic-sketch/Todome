# Code Review Current Changes

1. Run `git diff` to see all staged and unstaged changes.
2. Run `git diff --cached` to see staged changes specifically.
3. Analyze changes for:
   - **Type Safety**: Missing types, `any` usage, unchecked access
   - **Security**: XSS, injection, exposed secrets, missing RLS
   - **Performance**: Unnecessary re-renders, missing memoization, N+1 queries
   - **Conventions**: Naming, import order, component patterns per CLAUDE.md
   - **Logic**: Edge cases, error handling, race conditions
4. Run `pnpm type-check` and `pnpm lint` to catch automated issues.
5. Provide structured feedback with file paths and line numbers.
