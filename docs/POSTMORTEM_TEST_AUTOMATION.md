# Postmortem: Test Automation (QA Checklist → Automated Tests)

**Feature:** Automate the 60-item manual QA checklist into API integration tests and E2E (Playwright) tests.

**Scope of analysis:** Friction, rework, misunderstandings, and missing docs during implementation. Not code correctness.

---

## 1. Where friction occurred

| Area | What happened |
|------|----------------|
| **Search + SQLite** | API tests failed on search: Prisma `mode: "insensitive"` is not supported by SQLite. Search had been written for PostgreSQL; DB was switched to SQLite earlier without re-validating all Prisma usages. |
| **E2E selectors** | Multiple “strict mode” failures: two Capture buttons (header + dashboard), multiple nav links, many rows with the same observation text. Required scoping (e.g. `getByRole("banner")`) and unique test data (timestamps). |
| **Form validation** | Empty-submit validation tests didn’t show our error message: HTML5 `required` blocked submit, so custom “Observation is required” / “Name is required” never ran. Tests had to use spaces to submit and trigger JS validation. |
| **People/Systems forms** | `getByLabel("Name *")` failed: labels are not associated with inputs (no `for`/`id`). Had to use `getByRole("textbox").first()` and direct navigation to `/people/new` and `/systems/new`. |
| **Playwright webServer** | First E2E run failed with “port already in use” when API was already running. Needed `reuseExistingServer: true` for local dev. |
| **Create-observation test** | Assertion “text visible” failed with “resolved to 16 elements”: same text from prior runs. Fixed by using unique content (e.g. `Date.now()`) in created data. |

---

## 2. Where rework happened

- **Search route:** Added DB detection and `containsClause()` that omits `mode: "insensitive"` for SQLite.
- **E2E specs:** Several passes to fix selectors (banner-scoped Capture, header-scoped nav, row-filter + link for observation list, unique observation text).
- **Validation E2E:** Switched from “submit empty” to “fill spaces then submit” so custom validation runs.
- **People/Systems E2E:** Switched from “Add person” link + `getByLabel` to direct goto `/people/new` and `getByRole("textbox").first()`.
- **Create-observation E2E:** Dropped `waitForResponse(201)` + modal assertion; simplified to Save → goto list → assert unique text visible.

---

## 3. What was misunderstood

- **Two Capture entry points:** Not obvious until Playwright reported “2 elements”; manual checklist said “Click Capture” without specifying header vs dashboard.
- **Provider-specific Prisma:** Assumption that “switch to SQLite” only required schema + URL; search’s use of `mode: "insensitive"` was provider-specific and undocumented.
- **Test data lifetime:** E2E runs leave data in the shared dev DB; re-runs produced many rows with the same text, causing strict-mode and “which row?” issues.

---

## 4. What instructions or documentation were missing

- **DB provider and Prisma:** No note that search (or other queries) use PostgreSQL-only options; no “when changing provider, grep for provider-specific Prisma options.”
- **E2E conventions:** No rule to use unique content (e.g. timestamps) for created entities to avoid strict mode and test pollution.
- **Forms and validation:** No note that forms use both HTML5 `required` and custom validation, so E2E validation tests should trigger custom validation (e.g. spaces), not rely on empty submit.
- **UI duplicates:** No note that “Capture” (and similar) appear in multiple places; E2E should scope to the intended one (e.g. header).
- **Root scripts:** Root `package.json` and `npm run test` were added ad hoc; no prior doc of “how to run all tests from root.”

---

## 5. Root cause

1. **Provider switch not fully validated** — Moving to SQLite updated schema and URL but didn’t check all Prisma usage (e.g. search) for provider-specific behavior.
2. **Checklist written for humans, not automators** — Steps like “Click Capture” and “observation text” didn’t specify which control or unique data, so automation hit ambiguous selectors and shared data.
3. **No E2E/automation conventions** — No documented rules for selectors (scope to region, prefer unique data), form validation testing, or test data isolation.

---

## 6. What should change in prompts or docs

- **Design / stack docs:** When documenting DB or Prisma, add a short “Provider notes” subsection: list any provider-specific options (e.g. `mode: "insensitive"` for Postgres only) and that changing provider requires checking those call sites.
- **QA_CHECKLIST.md:** Keep manual checklist; add a short “Automation notes” section: use unique content for created data; scope to header/banner for shared actions (e.g. Capture); validation tests must trigger custom validation (e.g. spaces), not only empty submit.
- **README or SETUP:** Document “Run all tests: from root `npm run test`; E2E requires API and app running (or reuse existing servers).”
- **Workflow:** In “Execute plan” or “QA,” mention that when adding E2E, follow selector and test-data conventions above.

---

## 7. How to prevent this next time

- **When changing DB/provider:** Grep for Prisma options that differ by provider (e.g. `mode:`, raw SQL, extensions); run full API test suite against the new provider before considering the switch done.
- **When automating a manual checklist:** Before writing E2E, skim the UI for duplicate labels/buttons and document which instance each step means; decide up front on unique test data (e.g. timestamps) for any created entities.
- **When adding forms with validation:** Document “HTML5 required vs custom validation” and how to test both in E2E (e.g. empty vs spaces).

---

## 8. Proposed updates

### 8.1 Documentation

- **design_decisions.md (or new DB/backend doc):** Add “Provider notes (Prisma)”: SQLite does not support `mode: "insensitive"`; search uses `contains` only for SQLite. When changing provider, check all Prisma query options.
- **QA_CHECKLIST.md:** Add “Automation notes” (see below).
- **README.md:** In “Testing” or “Scripts,” add: run API tests with `npm run test:api`, E2E with `npm run test:e2e`, and full suite with `npm run test` from root; E2E expects API and app running unless reusing existing servers.

### 8.2 Workflow / commands

- **execute_plan or qa_checklist:** When the plan includes E2E or Playwright, add a reminder: “Use unique test data for created entities; scope shared actions (e.g. Capture) to the correct region (e.g. header); validation tests that check custom messages must trigger submit (e.g. spaces) so JS validation runs.”
- **postmortem.md:** No change; this postmortem follows its template.

### 8.3 System instructions

- For “automate manual QA” tasks: before writing E2E, (1) identify duplicate UI elements and which instance each step refers to, (2) decide on unique content for created data, (3) check whether validation is HTML5-only or also custom (and how to trigger custom in tests).

---

**Next steps:** Implement the doc and workflow updates above; use these conventions in the next feature that adds or changes E2E or DB usage.
