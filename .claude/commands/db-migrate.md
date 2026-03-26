# Create a New Supabase Migration

Arguments: $ARGUMENTS (migration name, e.g. "add_tags_table")

1. List existing files in `supabase/migrations/` to determine the next sequence number.
2. Create `supabase/migrations/NNN_$ARGUMENTS.sql` with the next number.
3. Add a header comment with the migration name and date.
4. Include template: `-- Migration: $ARGUMENTS` and placeholder for SQL.
5. Remind to add RLS policies for any new tables.
