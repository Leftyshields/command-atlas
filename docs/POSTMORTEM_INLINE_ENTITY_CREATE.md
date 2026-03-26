# Postmortem: Inline entity creation during capture (EPH-20250309-INEC)

**Feature:** Add "+ Add person" and "+ Add system" in the Fast Capture modal with minimal inline mini-forms; create and link without leaving the modal.

**Scope of analysis:** Friction, rework, misunderstandings, and missing docs during the process. Not code correctness.

---

## 1. Where friction occurred

| Area | What happened |
|------|----------------|
| **E2E strict-mode failure during QA** | When running "auto test" (full E2E suite), `observations.spec.ts` failed with "strict mode violation: getByRole('button', { name: /capture/i }) resolved to 2 elements" (header and dashboard both have a Capture button). The fix was to scope to the banner. `docs/QA_CHECKLIST.md` already documents this pattern under "Automation notes" (scope to `getByRole("banner").getByRole("button", { name: "Capture" })`), but that specific test had never been updated. Friction: rework during QA instead than prevention. |
| **No formal execution plan artifact** | The pre-implementation checklist requires "create_plan has been run (execution plan exists)." For this feature we did not run `/create_plan`; we used the design_decisions section "Inline entity creation during capture" as the full spec (user flow, field mapping, integration points, state management). The checklist result accommodated this with "Design decisions doc contains full feature design... no separate execution_plan.md for this feature (single-component change)." Friction: workflow assumes a separate plan file; for small features the boundary between "design" and "plan" was fuzzy. |

---

## 2. Where rework happened

- **observations.spec.ts:** Replaced `page.getByRole("button", { name: /capture/i })` with `page.getByRole("banner").getByRole("button", { name: "Capture" })` so the test targets a single element and no longer flakes. No other E2E or implementation rework.

---

## 3. What was misunderstood

- **Nothing material.** The capture and design_decisions were clear; implementation matched the spec. The only ambiguity was process (whether a separate execution_plan.md is required when design_decisions already contains step-by-step flow and acceptance criteria).

---

## 4. What instructions or documentation were missing

- **E2E selector consistency:** No instruction that when adding or running E2E for a feature that shares UI with existing tests (e.g. Capture modal), the agent (or human) should audit *existing* tests that target that shared UI for duplicate selectors and apply the documented scoping pattern (e.g. banner for Capture) so the full suite is strict-mode safe before adding new tests.
- **When to skip create_plan:** The workflow says "Next: Run /create_plan" after explore. It doesn’t say that for single-component, well-specified features, design_decisions with full user flow and acceptance criteria may serve as the execution plan and a separate create_plan artifact is optional. That led to an ad-hoc justification in the pre-implementation checklist result.

---

## 5. Root cause

1. **Documented E2E pattern not applied everywhere** — The "scope shared UI" rule was in QA_CHECKLIST automation notes, but one existing test (observations.spec.ts) still used an unscoped Capture selector. We only found it when running the full E2E during QA.
2. **Workflow assumes a separate plan artifact** — For small features, design_decisions can hold the full execution detail, but the workflow and checklist assume an execution plan file exists, so we had to document an exception instead of having a clear "lightweight path."

---

## 6. What should change in prompts or docs

- **QA checklist / qa_checklist command:** When "auto test" or "run E2E" is requested, add: "Before adding new E2E tests, run the existing E2E suite. If any test fails due to strict mode (e.g. multiple elements for the same selector), fix existing tests first by scoping to the intended region (see Automation notes in QA_CHECKLIST.md), then add new tests."
- **Workflow (workflow.md or create_plan):** Add a short note: "For single-component or very small features where design_decisions already contains full user flow, field mapping, and acceptance criteria, design_decisions may serve as the execution plan; pre_implementation_checklist can reference it instead of a separate execution_plan.md."
- **Postmortem command (this finding):** In the postmortem command’s "When automating manual QA" bullet, add: "(4) Run existing E2E first; fix any selector flakiness (e.g. duplicate buttons) in current tests before adding new ones."

---

## 7. How to prevent this next time

- **Before adding E2E for a shared UI flow:** Grep E2E specs for the same role/label (e.g. "Capture", "Save"); if multiple tests use it without scoping, apply the shared-UI scoping pattern to all of them, then add the new test. Alternatively, run the full E2E suite once before writing new tests and fix failures first.
- **For small features:** When explore + design_decisions already define the full flow and acceptance criteria, treat design_decisions as the execution plan and note that in the pre-implementation checklist instead of creating a minimal execution_plan.md that duplicates the same content.

---

## 8. Proposed updates

### 8.1 QA checklist command (`.cursor/commands/qa_checklist.md`)

- After "Do not write automated tests here" (or in a new "When automating QA" note), add:
  - **"If running or adding E2E:** Run the existing E2E suite first. Fix any strict-mode failures (e.g. duplicate button selectors) by scoping to the intended region (see Automation notes in docs/QA_CHECKLIST.md). Then add or run new tests."**

### 8.2 Workflow (`.cursor/commands/workflow.md`)

- In Phase 1, after step 3 (Create Execution Plan), add an optional note:
  - **"Optional shortcut:** For single-component or very small features, if design_decisions (step 4) already contains full user flow, field mapping, and acceptance criteria, it may serve as the execution plan; pre_implementation_checklist can reference it instead of a separate execution_plan.md."**

### 8.3 Postmortem command (`.cursor/commands/postmortem.md`)

- In the "When automating manual QA" bullet, add a fourth item:
  - **(4) Run existing E2E first; fix any selector flakiness (e.g. duplicate buttons) in current tests before adding new tests.**  

### 8.4 Optional: one-time E2E audit

- Consider a one-time pass over all E2E specs to ensure every use of "Capture", "Save", or other shared actions is scoped (e.g. banner for Capture). Document in QA_CHECKLIST or a short E2E_README that "all capture-modal entry points use banner-scoped Capture button."

---

**Tester:** Postmortem (process only)  
**Date:** 2025-03-09  
**Related:** EPH-20250309-INEC, `docs/QA_CHECKLIST.md` (Inline entity create section), `app/e2e/capture.spec.ts`, `app/e2e/observations.spec.ts`
