# Create a New React Component

Arguments: $ARGUMENTS (component name and optional location, e.g. "TaskCard packages/ui" or "SettingsPanel apps/web/src/components/settings")

1. Parse the component name (PascalCase) and target directory from arguments.
2. Default location: `packages/ui/src/` for shared components.
3. Create the component file (`kebab-case.tsx`) with:
   - TypeScript props interface
   - Functional component with proper typing
   - Tailwind CSS classes for styling
   - Named export
4. Update the nearest `index.ts` barrel export if one exists.
5. Follow all conventions from CLAUDE.md.
