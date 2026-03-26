# Command Atlas v1 — QA Checklist

## Automated tests

- **API (Vitest):** `cd api && npm run test` — 39 integration tests (observations, people, systems, search, validation, 409, 404, manager/reporting line, peers).
- **E2E (Playwright):** `cd app && npm run test:e2e` — 21 browser tests (capture modal, dashboard, nav, observations, people, systems, search, not-found). Requires API and app running (or Playwright will reuse existing servers with `reuseExistingServer: true`).
- **All:** From repo root, `npm run test` runs API tests then E2E (requires API + app for E2E).

**Auto-test run (EPH-20250309-RLTR):** 2025-03-10 — API: 38 passed; E2E: 21 passed.

**Auto-test run (EPH-20250310-VIZ):** 2025-03-10 — API: 39 passed; E2E: 21 passed.

### Automation notes (for E2E / Playwright)

- **Unique test data:** Use unique content for created entities (e.g. `Date.now()` in text) so selectors don’t match multiple elements and runs don’t pollute assertions.
- **Shared UI elements:** Actions like “Capture” appear in more than one place (e.g. header and dashboard). Scope to the intended region (e.g. `getByRole("banner").getByRole("button", { name: "Capture" })` for the header). All E2E that open the Capture modal should use this scoped selector to avoid strict-mode violations.
- **Validation tests:** Forms often use both HTML5 `required` and custom validation. To test custom error messages, trigger a submit that passes HTML5 but fails custom validation (e.g. fill spaces only), so the JS validation runs.
- **Before adding new E2E:** Run the existing E2E suite first; fix any strict-mode or selector failures in current tests, then add new tests.
- **Duplicate text on page:** When the same text appears in multiple elements (e.g. entity name in heading and in a card), use a scoped selector (e.g. `getByRole('heading', { name })`) to avoid strict-mode violations.

## Manual checklist

Use this checklist to validate the app manually. Check off each item as you verify it.

**Prerequisites:** API running (`cd api && npm run dev`), app running (`cd app && npm run dev`), database migrated and optionally seeded.

---

## Happy path

### Fast capture
1. - [ ] Click **Capture** in the header; modal opens.
2. - [ ] Enter only observation text (required), then **Save**; modal closes and observation is created.
3. - [ ] Open Capture again; enter observation + **Why it matters** + **Context**; save; all fields persist on the new observation.
4. - [ ] Create at least one **Person** and one **System** (People → Add person, Systems → Add system).
5. - [ ] Open Capture; enter observation; under **Link people** and **Link systems**, select one of each; save. Open the new observation; linked person and system appear.
6. - [ ] Open Capture; expand **More options**; set **Title**; save; title appears on observation list and detail.
7. - [ ] Click **Capture** on the Dashboard; same modal opens and works.

### Observations
8. - [ ] Go to **Observations**; list shows observations, most recent first; table or dense list is scannable.
9. - [ ] Click an observation; detail shows observation text, why it matters, context, captured date, linked people, linked systems.
10. - [ ] On detail, click **Edit**; change text and save; changes persist. Click **Edit** again, then **Cancel**; no changes saved.
11. - [ ] On detail, click **Delete**; observation is removed and you are redirected to observations list.
12. - [ ] Observation text with **markdown** (e.g. bullets, `code`) renders correctly in read view; edit view shows raw text in a textarea.

### People
13. - [ ] Go to **People**; click **Add person**; fill name (required) and optionally title, team, department, **Manager** (optional searchable select), notes; save; redirected to person detail.
14. - [ ] Person detail shows all saved fields; **Reports to** (manager name/link if set); **Reporting Structure** section shows manager (or "No manager"), current person (emphasized), **Peers** (or "No peers recorded"), **Direct reports** (clickable cards or "No direct reports recorded"); connector lines visible; **Linked observations** section lists observations that reference this person (if any).
15. - [ ] On person detail, **Reporting Structure**: manager/peer/report cards are clickable and navigate to that person; current person card is not a link.
16. - [ ] Click **Edit**; change fields (including Manager select; current person excluded from options) and save; changes persist.
17. - [ ] Notes field with simple markdown renders in read view.
18. - [ ] People list shows optional **Manager** column (manager name or "—").

### Systems
19. - [ ] Go to **Systems**; click **Add system**; fill name (required) and optionally category, owner team, description, notes; save; redirected to system detail.
20. - [ ] System detail shows saved fields; **Linked observations** lists observations that reference this system (if any).
21. - [ ] Edit and save; notes with markdown render in read view.

### Dashboard
21. - [ ] Go to **Dashboard**; **Recent observations** shows up to 10 recent items; each links to observation detail.
22. - [ ] **People** and **Systems** counts match the number of people/systems in their lists.
23. - [ ] After creating a new observation (via Capture), dashboard updates (new observation appears in recent list without full refresh).

### Search
24. - [ ] Go to **Search**; type at least 2 characters; click **Search** (or submit); results appear grouped by **Observations**, **People**, **Systems**.
25. - [ ] Click a result; navigates to the correct entity detail.
26. - [ ] Search for a word that appears in an observation's text; that observation appears in results.
27. - [ ] Search for a person's name or team; that person appears. Same for system name or category.
28. - [ ] Clear search or enter a new query; results update.

---

## Edge cases

### Empty and minimal data
29. - [ ] With **no observations**: Dashboard shows "No observations yet" (or similar); Observations list is empty with a helpful message.
30. - [ ] With **no people/systems**: Fast capture still works; link pickers show "No people yet" / "No systems yet"; observation saves without links.
31. - [ ] Create an observation with **no links**; detail shows no linked people/systems (or empty section). No errors.

### Search
32. - [ ] Search with **1 character**; UI indicates min 2 characters (or no search runs).
33. - [ ] Search with **no results**; "No results for …" (or similar) is shown.
34. - [ ] Search with **empty query** after previous search; behavior is clear (e.g. empty state or "Enter at least 2 characters").

### Delete restrictions (409)
35. - [ ] Create an observation that **links to a person**. Go to that person's detail; click **Delete**. A **409**-style message appears (e.g. "Cannot delete: N observation(s) link to this person. Unlink them first.") and the person is not deleted.
36. - [ ] Same for a **system** that has linked observations; delete is blocked with a clear message.
37. - [ ] **Person with direct reports:** Set a person as another's manager; try to delete the manager; **409** with message about direct report(s); delete blocked.
38. - [ ] Unlink the observation (edit observation and remove the link), then delete the person/system; delete succeeds. Reassign or remove direct reports, then manager can be deleted.

### Observation length limit
39. - [ ] Try to create or update an observation with **more than 50,000 characters**; API returns 400 and the UI shows an error message (e.g. "observation must be at most 50000 characters" or the API error message).

---

## Failure states

### Validation
40. - [ ] Fast capture: submit with **observation empty**; validation message appears (e.g. "Observation is required."); modal stays open.
41. - [ ] Add person: submit with **name empty**; validation error; form stays.
42. - [ ] Add system: submit with **name empty**; validation error; form stays.

### Not found
43. - [ ] Open a URL for a **non-existent observation** (e.g. `/observations/bad-id`); "Not found" or similar is shown; no crash.
44. - [ ] Same for **person** and **system** detail URLs with invalid ids.

### API / network
45. - [ ] With the **API stopped**, load the app or trigger a request (e.g. open Dashboard or Search); a loading or error state appears; no uncaught exception or blank screen.
46. - [ ] If possible, return the API and retry (e.g. refresh or run search again); data loads and the app recovers.

---

## Visual / UX

### Layout and navigation
45. - [ ] **Header**: "Command Atlas" and nav links (Dashboard, Observations, People, Systems, Search) are visible and correct. **Capture** button is visible and usable.
46. - [ ] All nav links go to the correct pages; back/forward and direct URL entry work.
47. - [ ] List and detail pages have a clear heading (e.g. "Observations", "People", entity name).

### Lists and tables
48. - [ ] Observations list: **compact** table or list; title/preview and captured date visible; rows clickable to detail.
49. - [ ] People and Systems lists: table or list with key columns (e.g. name, title, team / name, category, owner); rows clickable.

### Modals and forms
50. - [ ] **Fast capture modal**: readable labels; required field obvious; Cancel closes without saving; Save closes and refreshes data.
51. - [ ] **Add person / Add system** forms: required field indicated; Cancel or navigation without save does not create an entity.
52. - [ ] **Edit** on detail: form pre-filled; Save updates; Cancel reverts to read view.

### Loading and errors
53. - [ ] While **loading** lists or detail, a loading indicator or message appears (e.g. "Loading…"); no permanent spinner with no result.
54. - [ ] When an **error** is shown (validation, 409, 400, 500), the message is readable and indicates what went wrong.
55. - [ ] After a **failed** save (e.g. validation), user can correct the form and resubmit without leaving the page.

### Responsive basics
56. - [ ] Resize the window to a **narrow** width (e.g. mobile); layout remains usable (no critical overlap or unreadable text); nav and Capture are still accessible.
57. - [ ] Tables or lists do not break badly on small screens (e.g. horizontal scroll or stacked layout is acceptable).

---

## Observation Type (EPH-20250310-OBT1)

Manual checklist for the optional Observation Type feature: picker in Fast Capture and observation edit, helper text, badge on list/detail/dashboard/search.

**Prerequisites:** API and app running; DB migrated.

**Auto-test run:** 2026-03-10 (browser). Verified: Capture modal has Observation type dropdown (None + 7 types); selecting Friction shows helper text; save with type creates observation and modal closes; dashboard shows new observation with Friction badge; observations list loads; observation detail loads; Edit form has Observation type dropdown pre-filled with Friction.

### Happy path (Observation Type)
1. - [x] **Fast Capture — type picker:** Open **Capture**; an **Observation type** dropdown appears above the Observation textarea with **None** and the seven types (Structure, Ownership, Friction, Dependency, Opportunity, Influence, Culture).
2. - [x] **Fast Capture — helper text:** Select a type (e.g. **Friction**); a short helper sentence appears below the dropdown. Select **None**; helper text disappears.
3. - [x] **Fast Capture — save with type:** Enter observation text, select **Opportunity** (test used Friction), click **Save**; modal closes; new observation appears in list with badge.
4. - [ ] **Fast Capture — save without type:** Open Capture; leave type as **None**; enter text and save; observation is created; no type badge on list/detail.
5. - [x] **Observations list:** List has a **Type** column; observations with a type show a subtle badge (e.g. "Friction"); observations without type show nothing in that column.
6. - [x] **Observation detail — read:** Open an observation that has a type; a type badge appears (e.g. next to "Captured").
7. - [x] **Observation detail — edit:** Click **Edit**; **Observation type** dropdown is present and shows the current type (or None). Change type and **Save**; read view shows the new type. Set to **None** and save; badge disappears.
8. - [x] **Dashboard:** Recent observation cards show the type badge when the observation has a type.
9. - [ ] **Search:** Search results for observations show the type badge when present.

### Edge cases (Observation Type)
10. - [ ] **Existing observations:** Observations created before the feature have no type; list and detail show no badge; edit form shows **None**.
11. - [ ] **Reset on cancel:** Open Capture; select a type and enter text; click **Cancel**; open Capture again; type is **None** and form is empty.
12. - [ ] **PATCH omit type:** Edit an observation that has a type; change only the title (do not touch Observation type); save; type is unchanged.

### Failure states (Observation Type)
13. - [ ] **Invalid type from API:** If the API returned an invalid observationType (e.g. from a future backend change), list/detail do not crash; badge does not show for unknown value (or shows nothing).
14. - [ ] **Validation:** Submitting with only observation (no type) always succeeds; type remains optional.

### Visual / UX (Observation Type)
15. - [x] **Observation type** control is clearly optional; label is "Observation type" (not "Observation type *").
16. - [x] Badge is subtle (e.g. small pill/chip); does not dominate the list or detail.
17. - [x] Helper text is readable and appears only when a type is selected; does not clutter the form when **None** is selected.

---

## SQLite hardening (EPH-20250309-SQL1)

Use this section to validate the SQLite hardening release: timestamps, PATCH link semantics, search, validation, backup docs.

**Run:** 2026-03-10 (API curl + browser). All items below executed and passed.

### Happy path (hardening)
- [x] **Fast capture:** Create observation with no links; modal closes; recent list refreshes; captured time is sensible; optional fields don’t show null/blank junk.
- [x] **Observation detail:** Edit only text (title/observation/whyItMatters/context); save; linked people and systems are unchanged.
- [x] **Search:** Same query in different casing (e.g. "Kubernetes" vs "kubernetes") returns the same results (case-insensitive).
- [x] **People/systems:** Delete is blocked when linked (409); message is clear; lists and detail pages load.

### Edge cases (hardening)
- [x] **PATCH without link keys:** Observation has linked person + system; PATCH with only `{ "title": "New" }`; links unchanged.
- [x] **PATCH with only linkedPersonIds:** Update people links only; system links unchanged.
- [x] **PATCH with linkedSystemIds: []:** System links cleared; people links unchanged if not sent.
- [x] **POST without capturedAt:** New observation has `capturedAt` set (schema default).
- [x] **Invalid capturedAt:** POST or PATCH with `capturedAt: "not-a-date"` returns 400 and error mentions capturedAt.

### Failure states (hardening)
- [x] **Empty observation:** POST with `{}` or `{ observation: "   " }` returns 400 with "observation is required" (or similar).
- [x] **Search:** Empty query or &lt; 2 chars returns empty results or clear message; no crash.

### Docs
- [x] **README:** Backup section states DB file location (`api/prisma/dev.db`) and recommends copying the file.
- [x] **DATA_FORMAT_REFERENCE:** PATCH link semantics (omit = unchanged, present = set) documented.

---

## Inline entity creation during capture (EPH-20250309-INEC)

Manual checklist for creating and linking a new Person or System from within the Fast Capture modal via "+ Add person" / "+ Add system" without leaving the modal.

**Prerequisites:** API and app running; DB migrated.

**Auto-test run:** API tests (`npm run test` from root): 34 passed. E2E: `app/e2e/capture.spec.ts` includes "Inline add person: create person in modal, then save observation with link" (opens Capture → + Add person → fill name → Save and link → enter observation → Save → verify observation detail shows linked person). All capture + observations E2E passed. Run full suite with `npm run test` or `cd app && npm run test:e2e`.

### Happy path (inline entity create)
1. - [ ] **+ Add person visible:** Open **Capture**; under **Link people** a **+ Add person** link/button is visible.
2. - [ ] **+ Add system visible:** Under **Link systems** a **+ Add system** link/button is visible.
3. - [ ] **Add person — open:** Click **+ Add person**; an inline mini-form appears with **Name \***, **Title**, **Team** and buttons **Save and link** / **Cancel**. Main capture form (observation text, type, context, etc.) is unchanged and still visible.
4. - [ ] **Add person — save and link:** In the mini-form enter a **Name** (e.g. "QA Person 1"), optionally Title/Team; click **Save and link**. Mini-form closes; the new person appears in the Link people checkbox list and is **auto-selected**. Observation text and all other main form fields are unchanged; modal stays open.
5. - [ ] **Add person — then save observation:** With the new person still selected, enter observation text and click **Save**. Modal closes; open the new observation in the list; the person you created inline appears in **Linked people**.
6. - [ ] **Add system — open:** Click **+ Add system**; inline mini-form appears with **Name \***, **Category**, **Owner team** and **Save and link** / **Cancel**.
7. - [ ] **Add system — save and link:** Enter **Name** (e.g. "QA System 1"), optionally Category/Owner team; **Save and link**. Mini-form closes; new system appears in Link systems and is auto-selected; main form state unchanged.
8. - [ ] **Add system — then save observation:** With the new system selected, add observation text and **Save**; open the new observation; the system appears in **Linked systems**.
9. - [ ] **Both in one capture:** Open Capture; add a new person via + Add person, then add a new system via + Add system (both selected); enter observation and save. Observation detail shows both new person and new system linked.

### Edge cases (inline entity create)
10. - [ ] **Cancel person:** Click + Add person; enter name; click **Cancel**. Mini-form closes; no person created; main form state (including any observation text) unchanged.
11. - [ ] **Cancel system:** Same for + Add system and **Cancel**; no system created; form unchanged.
12. - [ ] **One mini-form at a time:** Open + Add person; then click + Add system. Person mini-form closes and system mini-form opens (or vice versa). Only one inline form is visible at a time.
13. - [ ] **Empty people/systems list:** With **no people** in the app, open Capture; **+ Add person** is still visible; use it to create the first person; they appear and can be selected. Same for systems with no systems yet.
14. - [ ] **State preserved:** Type observation text and select an observation type; open + Add person, create a person, close mini-form. Observation text and observation type are still there; nothing reset.

### Failure states (inline entity create)
15. - [ ] **Person — empty name:** Click + Add person; leave **Name** blank (or only spaces); click **Save and link**. Error message appears (e.g. "Name is required."); mini-form stays open; no API call; main form unchanged.
16. - [ ] **System — empty name:** Same for + Add system with empty name; error in mini-form; no create.
17. - [ ] **API error (person):** If the API returns an error (e.g. 500), error message appears in or near the mini-form; mini-form stays open; user can correct and retry or Cancel; main capture form unchanged.
18. - [ ] **API error (system):** Same for system create; error scoped to mini-form; main form preserved.

### Visual / UX (inline entity create)
19. - [ ] **Mini-form is secondary:** Inline form is visually contained (e.g. bordered/subtle background); does not dominate the modal; main capture fields remain the focus.
20. - [ ] **Labels clear:** "Name *" indicates required; "Title", "Team", "Category", "Owner team" are clearly optional.
21. - [ ] **Loading state:** While **Save and link** is in progress, button shows "Saving…" (or similar) and is disabled; user cannot double-submit.
22. - [ ] **No navigation:** After creating a person or system inline, the app does not navigate to People or Systems page; user stays in the Capture modal.

---

## Sign-off
58. - [ ] All **Happy path** items (1–27) checked.
59. - [ ] All **Edge cases** and **Failure states** (28–44) that apply to your environment checked.
60. - [ ] **Visual / UX** section (45–57) reviewed; no blocking issues.

**Tester:** _________________  
**Date:** _________________  
**Notes:** _________________
