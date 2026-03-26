# Fix All Errors

1. Run `pnpm type-check` and `pnpm lint` in parallel.
2. Collect all errors from both commands.
3. Fix each error, prioritizing:
   - Type errors (most critical)
   - Lint errors (auto-fixable first, then manual)
4. Re-run checks to verify all fixes.
5. Report what was fixed and any remaining issues.
