# Postmortem: Person site locations + legacy backup restore (2026-04)

**Scope:** Process and documentation—not a code audit.

## Where friction occurred

- **Reference data location:** Initial implementation put site codes in TypeScript; product intent was “not in source code,” leading to a follow-up migration to a `SiteLocation` table and API-driven dropdowns.
- **Backup restore:** Restoring a `.db` exported **before** `SiteLocation` / `Person.location` caused **500** on `/api/people` because import recreates `Person` from the backup’s older `CREATE TABLE` (missing `location`) while Prisma expects the current schema.
- **E2E:** A location-specific Playwright test was attempted then removed: `reuseExistingServer` + stale Vite bundles made the new field absent; API tests remained the reliable gate.

## Rework

- DB-backed `SiteLocation`, seed migration SQL, `GET /api/site-locations`, post-import **`repairSchemaAfterSqliteImport`** after backup import.
- Observations E2E placeholder broadened for Quick Capture copy changes.
- Playwright API server step runs `prisma migrate deploy` before `npm run dev`.

## What was misunderstood / missing in docs

- **Import semantics** were easy to treat as “replace my data” without emphasizing that **application tables are recreated from the backup file’s DDL**, so **older backups omit columns** the current app requires unless repaired or migrated.
- **Seeding** of site locations lived only in migration SQL; operators had no single README pointer for “where do locations come from?”

## Root cause (restore failures)

**Schema drift:** The live Prisma schema expected `Person.location` and `SiteLocation` rows; a pre-feature backup restored an older `Person` shape without `location`, so queries failed at runtime.

## What should change (prompts / workflow)

- For any feature that adds **required-for-query** columns or new tables: call out **backup compatibility** in the same PR as README + DATA_FORMAT_REFERENCE.
- **Backup / restore** checklist item: “After import from an old file, confirm migrations or use app repair (post-fix).”

## Prevention next time

- Keep **post-import repair** (or migrate-after-import) for additive schema as long as import copies DDL from arbitrary backups.
- Document **reference data** (SiteLocation) in README: seeded by migrations, optional manual SQL for advanced cases.
- **Privacy:** Real site names/codes must not live in application source or committed migrations; use neutral placeholder rows in the repo and customize data only in local/production databases.
