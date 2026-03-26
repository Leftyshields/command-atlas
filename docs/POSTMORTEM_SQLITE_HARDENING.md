# Postmortem: SQLite Hardening (EPH-20250309-SQL1)

**Feature:** SQLite adoption hardening — timestamps, PATCH link semantics, search documentation, Zod validation for observations, seed, backup docs.

**Scope of analysis:** Friction, rework, misunderstandings, and missing docs during implementation. Not code correctness.

---

## 1. Where friction occurred

| Area | What happened |
|------|----------------|
| **Zod error extraction** | Code review suggested improving the POST validation error message by using Zod’s “first error” or path. Implementation used `parsed.error.errors[0]` to derive the message. In this project’s Zod version, `errors` was undefined (structure lives in `flatten().fieldErrors` / `formErrors`). That caused a runtime crash (Cannot read properties of undefined (reading '0')) and 500 on POST with empty body; tests failed until fixed. |
| **Backend file mapping** | Execute plan and code_review commands both say “Update both `functions/index.js` AND `server.js`” for new endpoints. This repo has a **single backend** in `api/` (no server.js or Firebase Functions). We followed the execution plan’s “Backend File Mapping (this project)” and didn’t touch wrong files, but the generic instruction added cognitive load and required an explicit “N/A — single backend” in the pre-implementation checklist. |
| **QA checklist bulk update** | When marking the new “SQLite hardening” section as completed, a single multi-line replace failed (exact match). Had to apply multiple single-line replacements to toggle `- [ ]` → `- [x]`. Minor friction. |

---

## 2. Where rework happened

- **POST 400 handler:** Replaced the initial “improved” logic (using `errors[0]` and path) with logic that uses only `parsed.error.flatten()`: read `fieldErrors.observation?.[0]`, and normalize the generic “expected string, received undefined” message to “observation is required” so tests and clients get a stable message. No reliance on `errors[0]`.
- **Tests:** After the fix, all 27 existing tests passed; no further test rework.

---

## 3. What was misunderstood

- **Zod’s public error shape:** Assumption that `safeParse()` failure always exposes a non-empty `error.errors` array. In this setup, the usable structure was `error.flatten()` (fieldErrors + formErrors); `errors` was undefined. The library’s documented “first error” pattern wasn’t verified against the project’s installed version before coding.
- **Generic workflow vs this repo:** Commands are written for a two-file backend (server.js + functions/index.js). This project isn’t that shape; the execution plan correctly documented “single backend in api/,” but the command text didn’t say “or follow the plan’s Backend File Mapping when it differs.”

---

## 4. What instructions or documentation were missing

- **Validation / third-party error handling:** No rule that when mapping validation errors (Zod, Joi, etc.) to API responses, the implementation must use only APIs verified in this project (e.g. `flatten()` and field/form errors), and must not assume optional structures (e.g. `errors[0]`) without a guard or test. |
- **Backend layout in workflow:** Execute plan and code_review don’t say “if the execution plan or ARCHITECTURE defines a different backend layout (e.g. single api/), follow that instead of the generic two-file checklist.” |
- **Code review follow-up:** No reminder that “approved suggestions” that touch third-party APIs (e.g. error extraction) should be validated with a quick run or test before considering the task done. |

---

## 5. Root cause

1. **Assumed third-party API shape** — Error handling was implemented using a generic “first error” pattern (`errors[0]`) without confirming Zod’s actual shape in this project, leading to a runtime crash and rework.
2. **Generic workflow text** — Checklist and commands assume a two-file backend; single-backend repos must infer “N/A” or rely on plan-specific “Backend File Mapping,” which is easy to miss.

---

## 6. What should change in prompts or docs

- **Execute plan / implementation:** When adding or changing validation (Zod or similar), add a one-line note: “Error response: use only the error API verified in this project (e.g. Zod’s `flatten()`); do not assume `errors[0]` or other optional fields without a guard or test.”
- **Workflow (execute_plan, code_review):** State that backend file mapping is project-specific: “Follow the execution plan’s ‘Backend File Mapping’ (or ARCHITECTURE) for this repo; if the plan says single backend (e.g. api/ only), do not add checklist items for server.js / functions/index.js.”
- **Code review:** For suggestions that touch third-party error shapes, add: “Verify the error structure (e.g. run a quick test or inspect in this project’s version) before implementing.”
- **QA checklist edits:** Optional: document that feature-specific sections can be toggled in bulk by matching the section heading and then replacing line-by-line, or use a convention (e.g. “Run: DATE” and “All [x]” in one block) to reduce replace failures.

---

## 7. How to prevent this next time

- **Before implementing validation error mapping:** Run a quick test (e.g. `node -e "require('zod').z.object({a: require('zod').z.string()}).safeParse({})"`) or read the project’s Zod version and use only the error API that exists (e.g. `flatten()`).
- **When executing the plan:** Always read the plan’s “Backend File Mapping” or “Architecture impact” first; if it says “single backend” or lists only api/, ignore generic “update both server.js and functions” in the command.
- **After implementing code review suggestions:** If the change touches library-specific behavior (errors, config), run the relevant test or a quick manual check before marking the suggestion done.

---

## 8. Proposed updates

### 8.1 Workflow (`.cursor/commands/workflow.md` or execute_plan.md)

- In **Execute Plan**, change or add after “Update both functions/index.js AND server.js”:
  - **“Backend:** Follow this project’s backend layout. If the execution plan has a ‘Backend File Mapping’ or ARCHITECTURE states a single backend (e.g. api/ only), update only those files; do not add checklist items for server.js or functions/index.js unless the plan explicitly lists them.”
- In **Code Review** (or as a reminder in the command):
  - **“Validation/errors:** When review suggests changing error handling for a validation library (Zod, Joi, etc.), implement using only the error API verified in this project (e.g. flatten(), fieldErrors); verify with a test or quick run before considering done.”**

### 8.2 Design decisions or implementation plan template

- Add under a “Validation / API contracts” or “Integrations” subsection:
  - **“Error shapes:** When mapping validation errors to HTTP responses, use only the error structure confirmed in this project (e.g. Zod: use `flatten().fieldErrors` / `formErrors`; do not assume `errors[0]` without checking).”**

### 8.3 Pre-implementation checklist

- Under “Data Format Specifications” or a new bullet:
  - **“Validation libraries:** If the feature uses Zod (or similar) for request validation, the plan or design doc should note how validation errors are mapped to 400 responses (and that the implementation must use the library’s error API as it exists in this project).”**

---

**Tester:** Postmortem (process only)  
**Date:** 2026-03-10  
**Related:** EPH-20250309-SQL1, `.ai/context/execution_plan.md`, `docs/QA_CHECKLIST.md` (SQLite hardening section)
