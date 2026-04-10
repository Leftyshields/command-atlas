# Postmortem: DB Backup UI + Workflow Friction (EPH-20260409-BKP1)

**Feature:** In-app SQLite backup/import UI (`/backup`) plus API endpoints and docs.

**Scope of analysis:** Process friction, rework, misunderstood requirements, and documentation/workflow gaps. Not code correctness.

---

## 1. Where friction occurred

| Area | What happened |
|------|----------------|
| **Visibility of new UI entry** | Backup link existed in code but was not immediately visible in the user’s running app view due to stale frontend assets / restart mismatch. |
| **Workflow instruction mismatch** | Generic workflow text repeatedly referenced `functions/index.js` + `server.js` parity while this repo uses a single Express backend under `api/`. This created avoidable cognitive overhead in every step (`explore`, `create_plan`, `execute_plan`, `code_review`). |
| **E2E selector fragility** | One Playwright test failed on a placeholder selector (`what did you notice`) after UI copy/placeholder differences, while functional behavior was still correct. |
| **Review timing vs delivery pressure** | Automated review findings surfaced high-severity concerns late (after feature felt “done”), increasing rework pressure before push. |

---

## 2. Where rework happened

- Repositioned backup entry to improve discoverability (header right action group + dashboard shortcut).
- Added/updated docs multiple times (README backup section, troubleshooting, QA backup checks).
- Ran E2E + API tests again to isolate UI selector failure from feature regressions.

---

## 3. What was misunderstood

| Misunderstanding | Reality |
|------------------|--------|
| “If it’s in code, user will see it immediately” | In dev, stale Vite/Docker assets can hide fresh UI changes until hard refresh/restart/rebuild. |
| “Workflow backend parity text always applies” | This repository is explicitly single-backend (`api/src/index.ts` + `api/src/app.ts`), so dual-file parity instructions are N/A. |
| “E2E failure implied feature failure” | Failure was selector brittleness, not backup/import behavior; API tests and manual flow still passed. |

---

## 4. Missing instructions or docs

- A short README troubleshooting note for **“UI change not visible after pull”** was missing.
- QA automation notes lacked explicit guidance for placeholder-copy drift in capture tests.
- Workflow templates lacked a stronger conditional “use repository backend mapping when dual-file parity is N/A.”

---

## 5. Root cause

1. **Environment-state blind spot:** frontend asset cache/restart state was not treated as a first-class validation step after UI edits.
2. **Template drift:** generic command text overrode local architecture context too often.
3. **Selector coupling:** E2E relied on one specific placeholder phrase instead of resilient modal-scoped selectors.

---

## 6. What should change in prompts/docs

- **README:** keep a permanent “UI change not visible after pull” troubleshooting section.
- **QA checklist:** include selector-resilience guidance for placeholder drift and modal scoping.
- **Workflow commands:** add a hard “if architecture mapping says single backend, ignore dual-file parity template.”
- **Code review workflow:** run security/correctness review before declaring feature complete in user-facing updates.

---

## 7. How to prevent this next time

- After any nav/UI entry change, validate with: hard refresh → app restart → Docker rebuild (if applicable) before sign-off.
- Keep E2E selectors scoped to semantic containers (banner/modal/section), not copy-only placeholder text.
- Require architecture parity section in plan to be referenced in every backend step/review.
- Treat post-implementation review findings as “must triage before push,” not optional.

---

## 8. Proposed updates (applied/tracked)

| Target | Update |
|--------|--------|
| `README.md` | Added troubleshooting for stale UI after pull/rebuild mismatch. |
| `docs/QA_CHECKLIST.md` | Added E2E note for placeholder selector drift + modal scoping guidance. |
| `docs/POSTMORTEM_DB_BACKUP_UI_WORKFLOW.md` | This document. |

---

**Date:** 2026-04-10  
**Related:** EPH-20260409-BKP1, `docs/QA_CHECKLIST.md`, `README.md`
