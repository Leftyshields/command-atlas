# Postmortem: EPH-20250309-RLTR — Reporting line tracking

**Feature:** Lightweight reporting-line tracking (manager / direct reports on Person)  
**Date:** 2025-03-10

## What was built

- **Data:** Person has optional `managerId` (FK), self-relation `manager` and `directReports`; migration added `manager_id`, removed legacy `manager` text column.
- **API:** List/detail include manager (and directReports on detail); POST/PATCH accept `managerId` with validation (exists, not self, no direct cycle); DELETE returns 409 when person has direct reports.
- **Frontend:** Person create/edit have optional Manager (searchable filter + select); detail shows Reports to and Direct reports; People list has Manager column.

## Friction and rework

- **Minimal.** Exploration and design_decisions were done in one pass; execution followed the checklist. No scope creep.
- **Schema:** Prisma self-relation and migration were straightforward; test DB got migrations via existing vitest.setup (migrate deploy).

## Misunderstandings

- None. Capture and explore clearly stated no org-chart engine, no manager in Fast Capture, and 409 on delete when direct reports exist.

## Missing instructions / docs

- **QA_CHECKLIST:** Updated with reporting-line manual items (Manager select, Reports to, Direct reports, delete 409 for managers) and auto-test result. Test counts updated (38 API, 21 E2E).
- **design_decisions:** Feature section and execution checklist already added; steps marked complete post-implementation.

## Root cause (if any)

- N/A — smooth run.

## What should change in prompts or docs

- Keep **single-backend (api/ only)** explicit in workflow so execute_plan does not add server.js/functions parity for this project.
- **Pre-implementation checklist:** Already references design_decisions; for single-component features the design_decisions execution checklist is sufficient.

## Proposed updates (applied)

1. **QA_CHECKLIST.md:** Automated test counts updated; auto-test run line added; People section and delete-409 edge case updated for reporting line.
2. **design_decisions.md:** Execution plan checklist marked complete.
3. No workflow.md or command file changes required for this feature.

## Lessons learned

- Having the execution plan embedded in design_decisions (with checklist) kept implementation aligned and easy to tick off.
- Running API and E2E after implementation confirmed no regressions; existing people E2E still pass with the new Manager field.
