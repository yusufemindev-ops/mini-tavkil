import { customType } from 'drizzle-orm/pg-core';

// `citext` (case-insensitive text) is installed by the first migration and used for
// email columns. drizzle-kit's introspection doesn't recognise it and emits
// `unknown(...)`, so we define it here.
//
// If a future `drizzle-kit pull` regenerates schema.ts, re-apply this: replace any
// `unknown("col")` with `citext("col")` and keep this import.
export const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'citext';
  },
});
