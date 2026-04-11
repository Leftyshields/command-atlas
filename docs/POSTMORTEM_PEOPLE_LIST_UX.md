# Postmortem: People list UX (EPH-20260410-PEOP1)

Process focus (not code review). Date: 2026-04-11.

## Where friction occurred

- **Workflow vs repo:** Cursor workflow commands still reference **`functions/index.js`** and **`server.js`** for API parity; this repository uses a **single Express app under `api/`**. Planning repeatedly had to reconcile “dual file” checklists with actual entry points (`api/src/app.ts`, route modules).
- **Multiple plans:** **`execution_plan.md`** (site locations) vs **`execution_plan_EPH-20260410-PEOP1.md`** (People list) caused momentary confusion about which file was “the” plan until naming convention was explicit.
- **Gitignored context:** **`.ai/context/`** is ignored; capture/explore/design snapshots live only locally unless copied into **`docs/`**. README referenced `.ai/context` for design—useful for the author, invisible in clone unless documented elsewhere.

## Where rework happened

- **Icons:** Initial implementation used inline SVG chevrons; product decision moved to **`lucide-react`** + **`ExternalLink`** for manager profile—small dependency and import churn.
- **Docs drift:** **`last_explore.md`** open questions (Lucide vs SVG, filter-only vs profile link) stayed open in files until execution explicitly synced markdown.

## What was misunderstood

- Assumption that “current file” in capture always matched a single checked-in path before exploration (resolved to **`app/src/pages/PeopleList.tsx`**).

## What was missing

- A **single repo-visible** pointer for “backend = `api/` only” next to workflow templates (partially addressed in exploration notes; this doc reinforces it).

---

## 1. Root cause

Template workflows were written for a **Firebase + dual-server** layout; this project’s **architecture differs**, so parity checklists did not apply without translation.

## 2. What should change in prompts or docs

- **Workflow / commands:** When a repo uses **one** API package, state **`api/`** (or `server.ts`) explicitly and mark **`functions`/`server.js`** as **N/A** instead of empty checkboxes that imply missing work.
- **README:** Describe user-visible People list behavior (sort/filter) so behavior is documented **without** relying on `.ai/context`.
- **Optional:** Keep a short **feature postmortem** in **`docs/`** for process lessons (this file).

## 3. How to prevent next time

- At **explore**, record **Architecture impact** with **exact paths** (`api/src/routes/...`) and **“N/A: no Firebase”** where applicable.
- Name execution plans **`execution_plan_<ISSUE>.md`** consistently and link from README or **`docs/`** when the feature is user-facing.

---

## Proposed follow-ups

| Area | Proposal |
|------|----------|
| Documentation | README “People list” subsection (done in same PR as this file). |
| Workflow | Adjust `.cursor/commands` templates when editing that folder to branch on “Express `api/` only” vs Firebase. |
| System instructions | None required in-repo; optional Cursor rule: “Verify backend entry points from README before applying Firebase parity.” |
