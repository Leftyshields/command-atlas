# Postmortem: EPH-20250310-VIZ — Reporting Structure Visualization

**Feature:** Graphical reporting-structure visualization on Person detail (Phase 2)  
**Date:** 2025-03-10

---

## 1. Root cause (summary)

- **Layout:** Capture left “Option A vs Option B” for peers; design chose A without validation. User expected B (current + peers horizontal) → rework.
- **Diagram spec:** Connector length and “spine reaches direct reports” were underspecified; “direct reports in the org chart” was implied but not stated as a layout constraint → multiple peer-review rounds.

## 2. What should change in prompts or docs

- **Capture/explore:** For diagram or “chart” features, add a “Visual layout” bullet: (a) all nodes share the same visual column/centering so it reads as one diagram; (b) connectors extend into target rows where connection matters.
- **Design decisions:** When locking “Option A vs B,” add: “If stakeholder preference unknown, validate before implementation or call out in pre-implementation checklist.”
- **Workflow:** Add common mistake: “Layout options left open” — lock one and validate when ambiguous.

## 3. How to prevent this next time

- Resolve layout options (A vs B) in capture or design with a single chosen option and a one-line “validate with stakeholder if unclear.”
- For any “connector from X to Y,” specify that the line visually reaches/touches the target (e.g. “extends into the direct-reports row”).
- State explicitly when diagram nodes must share one visual column so they’re not read as a separate list.

---

## What was built

- **Backend:** GET `/api/people/:id` now returns `manager` and `directReports` with `id, name, title, team`; added `peers` array (same managerId as current person, excluding self) with same shape.
- **Frontend:** New "Reporting Structure" section on Person detail (read view): manager row, current person (emphasized), peers row, direct reports row; Tailwind-only connector lines; `PersonNodeCard` and `ReportingStructure` components; clickable cards to person detail; empty states for no manager / no peers / no direct reports.

---

## Friction & rework

1. **E2E strict-mode failure:** After adding the Reporting Structure, the person's name appeared twice on the page (h1 and current-person card). The test `getByText(name)` resolved to 2 elements and failed. **Fix:** Use `getByRole("heading", { name })` to assert the detail page by the main heading only.
2. **API test shape:** Existing test used `toEqual` for manager object; adding `team` to the response would have broken it. **Mitigation:** Switched to `toMatchObject` for manager and added explicit `peers` expectation plus a dedicated peers test.
3. **Connector visibility and “connected from underneath”:** Initial connectors were 12px; they were hard to see. Increased to 20px, then a 44px segment into the direct-reports block so the line “reached” the cards. Multiple peer-review rounds to get “spine connects direct reports from underneath” right. **Cause:** Capture said “vertical line between manager and current” and “horizontal + vertical connector from current person to direct reports” but did not specify minimum height or that the line should visually reach into the card row.
4. **Direct reports “in the org chart”:** First implementation used full-width rows for peers and direct reports, so they read as a separate list. Reviewer expected direct reports “in the org chart under the person, just like manager but underneath.” **Fix:** Constrained peers and direct reports to the same centered column (`max-w-xs` / `justify-center`) as manager and current person so the whole section reads as one diagram.
5. **Current person + peers horizontal:** Design decisions had chosen **Option A** (peers in a row *under* a “Peers” label, below current person). User expectation was **Option B** (current person and peers on the *same* horizontal row). Implementation followed Option A; post–code-review feedback requested “Jimmy and Lita horizontal.” **Fix:** Reworked layout to one row: current person card + optional “Peers” label + peer cards, so current and peers are side-by-side.

---

## Lessons learned

- When adding a section that repeats entity names (e.g. current person in a card), E2E tests that assert visibility of that name should use a unique or scoped selector (e.g. heading) to avoid strict-mode violations.
- Backend response extensions (new fields like `team`, `peers`) are easier to keep green if list/detail tests use `toMatchObject` for embedded objects so new optional fields don’t break assertions.
- **Layout options in capture/design:** When the capture or design doc leaves two layout options (e.g. “Option A vs Option B”), lock one with a short rationale *and* call out “validate with stakeholder or quick mock if ambiguous.” Otherwise implementation may pick one option and user expectation may be the other, causing rework.
- **Visual “connection” in diagrams:** For “connector from X to Y,” specify that the line should visually reach or touch the target (e.g. “connector extends into the direct-reports row so it reads as attached”) so connector height/layout doesn’t need multiple iterations.
- **“In the chart” vs “below the chart”:** If a diagram should read as one unit (org chart), state explicitly that all nodes—manager, current, peers, direct reports—share the same visual column/centering so they’re not perceived as a separate list.

---

## Root cause (UX/layout rework)

- **Peers layout:** Capture left “Option A vs Option B” open; design chose Option A without validating with user. User expected Option B (current + peers horizontal). One-sentence “validate with stakeholder if ambiguous” would have caught this before implementation.
- **Connectors and “in the chart”:** Connector length and “spine reaches direct reports” were underspecified; “direct reports in the org chart” was implied by “just like manager but underneath” but not stated as a layout constraint (same centered column). Specifying “connector extends into target row” and “all nodes share same visual column” would have reduced peer-review back-and-forth.

---

## Proposed workflow/doc updates

1. **QA_CHECKLIST.md:** Updated with Reporting Structure manual items (14–15), renumbered People/Systems items, automation run note, and duplicate-text selector note. **Done.**
2. **design_decisions.md (or capture template):** When a feature has two layout options (A vs B), add: “Chosen: [X]. If stakeholder preference unknown, validate before implementation or call out in pre-implementation checklist.”
3. **Capture / explore:** For diagram or “chart” features, add a short “Visual layout” bullet: (a) same column/centering for all nodes so it reads as one diagram, and (b) connectors “reach” target elements (e.g. extend into row) where connection is important.
4. **workflow.md:** In “Common Mistakes” or design_decisions step, add: “Lock layout options when capture has A vs B; validate with stakeholder if ambiguous.”

---

## Files changed (summary)

| Area | File |
|------|------|
| Backend | `api/src/routes/people.ts` — peers query, team in manager/directReports select |
| Backend tests | `api/tests/api.test.ts` — toMatchObject for manager, peers test |
| Frontend types | `app/src/types.ts` — PersonSummary.team, Person.peers |
| Frontend components | `app/src/components/people/PersonNodeCard.tsx` (new) |
| Frontend components | `app/src/components/people/ReportingStructure.tsx` (new) |
| Frontend page | `app/src/pages/PersonDetail.tsx` — ReportingStructure, removed duplicate direct reports list |
| E2E | `app/e2e/people-systems.spec.ts` — selector fix for person detail |
| Docs | `docs/QA_CHECKLIST.md` — Reporting Structure items, auto-test run |
| Context | `.ai/context/last_explore.md`, `design_decisions.md`, `pre_implementation_checklist_result.md`, `docs/IMPLEMENTATION_PLAN.md` §10 |

---

**Workflow closed.**
