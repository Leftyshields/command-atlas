# Command Atlas — Implementation Plan & Backlog (v1)

This document is the implementation-ready plan: design summary, scaffolding, schema, API, frontend structure, and ordered backlog. Design boundaries live in `.ai/context/design_decisions.md`.

---

## 1. Updated v1 Design Summary

- **Product:** Private leadership intelligence — structured notebook + relationship map for one technical leader. Observations are the center of gravity; People and Systems organize and enrich them.
- **Scope:** People, Systems, Observations, Relationships; fast capture (observation-first, links optional); basic dashboard; search. Single user, no auth.
- **Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router. Backend: Node, TypeScript, Express or Fastify, Prisma, PostgreSQL.
- **Principles:** Fast capture with minimal friction; lean entity models; simple relationship semantics; no Phase 2/3 features in v1.

---

## 2. Recommended Folder / Project Structure

### Monorepo or two packages (choose one)

**Option A — Single repo, two folders (recommended for speed):**

```
command-atlas/
├── api/                    # Backend
│   ├── src/
│   │   ├── index.ts        # or server.ts — entry, mounts routes
│   │   ├── routes/
│   │   │   ├── observations.ts
│   │   │   ├── people.ts
│   │   │   ├── systems.ts
│   │   │   ├── relationships.ts
│   │   │   └── search.ts
│   │   ├── middleware/
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   └── types/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   └── tsconfig.json
├── app/                    # Frontend (Vite + React)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/         # React Router route config + lazy pages
│   │   ├── components/
│   │   │   ├── ui/         # shadcn components
│   │   │   ├── layout/     # Shell, Nav, Header
│   │   │   ├── capture/    # FastCaptureModal, form
│   │   │   ├── observations/
│   │   │   ├── people/
│   │   │   └── systems/
│   │   ├── hooks/          # useObservations, etc. or TanStack Query wrappers
│   │   ├── lib/
│   │   │   ├── api.ts      # fetch wrapper / base URL
│   │   │   └── utils.ts
│   │   └── types/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
├── docs/
│   └── IMPLEMENTATION_PLAN.md
├── .ai/context/
├── docker-compose.yml      # optional: app + postgres
├── .env.example
└── README.md
```

**Option B — Separate repos:** `command-atlas-api` and `command-atlas-app`. Only if you need to deploy or version them independently; adds overhead for v1.

**Recommendation:** Option A. Single repo, `api/` and `app/`, shared only via API contract.

---

## 3. Prisma Schema Proposal (v1)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Person {
  id         String   @id @default(cuid())
  name       String
  title      String?
  team       String?
  department String?
  manager    String?  // text in v1, not FK
  notes      String?
  createdAt  DateTime @map("created_at")
  updatedAt  DateTime @map("updated_at")
}

model System {
  id          String   @id @default(cuid())
  name        String
  category    String?  // identity, endpoint, database, platform, networking, monitoring
  ownerTeam   String?  @map("owner_team")
  description String?
  notes       String?
  createdAt   DateTime @map("created_at")
  updatedAt   DateTime @map("updated_at")
}

model Observation {
  id           String   @id @default(cuid())
  title        String?
  observation  String   // required
  whyItMatters String?  @map("why_it_matters")
  context      String?  // e.g. "1:1 with James", "hallway conversation"
  capturedAt   DateTime @map("captured_at") // when user says it happened; default now
  createdAt    DateTime @map("created_at")
  updatedAt    DateTime @map("updated_at")
}

model Relationship {
  id               String   @id @default(cuid())
  sourceEntityType String   @map("source_entity_type") // "Observation" | "Person" | "System"
  sourceEntityId   String   @map("source_entity_id")
  targetEntityType String   @map("target_entity_type") // "Person" | "System"
  targetEntityId   String   @map("target_entity_id")
  relationshipType String   @map("relationship_type") // references_person, references_system, depends_on
  createdAt        DateTime @map("created_at")

  @@index([sourceEntityType, sourceEntityId])
  @@index([targetEntityType, targetEntityId])
}
```

**Note:** Prisma does not support polymorphic relations. Query `Relationship` by `sourceEntityType`/`sourceEntityId` and `targetEntityType`/`targetEntityId`; in API layer, fetch Person/System/Observation by id to build embedded `linkedPeople` / `linkedSystems` / linked observations. For v1 this app-level resolution is sufficient.

---

## 4. API Design (v1)

### Base
- **Base path:** `/api`
- **Format:** JSON. `Content-Type: application/json`.
- **Errors:** `{ "error": "message" }` with appropriate status (4xx/5xx).

### Routes

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/observations | List observations (optional sort, limit; default recent first) |
| GET    | /api/observations/:id | Single observation with embedded linked people & systems |
| POST   | /api/observations | Create observation; body may include linkedPersonIds, linkedSystemIds (replace-set for this observation) |
| PATCH  | /api/observations/:id | Update observation; same replace-set semantics for links |
| DELETE | /api/observations/:id | Delete observation and its relationship rows |
| GET    | /api/people | List people (optional sort) |
| GET    | /api/people/:id | Single person with embedded linked observations (or count) |
| POST   | /api/people | Create person |
| PATCH  | /api/people/:id | Update person |
| DELETE | /api/people/:id | Delete if no relationships; else 409 with message |
| GET    | /api/systems | List systems |
| GET    | /api/systems/:id | Single system with embedded linked observations |
| POST   | /api/systems | Create system |
| PATCH  | /api/systems/:id | Update system |
| DELETE | /api/systems/:id | Delete if no relationships; else 409 |
| GET    | /api/search?q= | Unified search (min 2 chars); returns grouped results by type |

### Payload shapes

**POST /api/observations**
```json
{
  "title": "optional",
  "observation": "required text",
  "whyItMatters": "optional",
  "context": "optional",
  "capturedAt": "ISO8601 (optional, default now)",
  "linkedPersonIds": ["id1", "id2"],
  "linkedSystemIds": ["id1"]
}
```

**PATCH /api/observations/:id** — same shape; omitted link arrays = replace with empty (unlink all). Scalar fields replace.

**Observation response (GET)** — include embedded links for convenience:
```json
{
  "id": "...",
  "title": "...",
  "observation": "...",
  "whyItMatters": "...",
  "context": "...",
  "capturedAt": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "linkedPeople": [{ "id": "...", "name": "..." }],
  "linkedSystems": [{ "id": "...", "name": "..." }]
}
```

**Person / System** — standard CRUD; create/update body = model fields (camelCase). Delete: 409 if any relationship references this entity; body `{ "error": "Cannot delete: 3 observations link to this person." }`.

**GET /api/search?q=xy**
```json
{
  "observations": [{ "id", "title", "observation", "capturedAt", ... }],
  "people": [{ "id", "name", "title", ... }],
  "systems": [{ "id", "name", "category", ... }]
}
```
Search: case-insensitive partial match on defined fields; min length 2.

### Update behavior (contract)
- **Observations:** Scalar fields replace on PATCH. For linked people/systems: on create or update, backend deletes all relationship rows where source = this observation and type in (references_person, references_system), then inserts one row per id in linkedPersonIds (references_person) and linkedSystemIds (references_system). So “replace-set” semantics.

### Delete restrictions
- **Person / System:** If any Relationship row has this entity as target (or source for system→system), return **409 Conflict** with message listing dependent observations or “linked entities” so user can unlink first.
- **Observation:** Allow delete; delete observation and all relationships where source = this observation.

---

## 5. Frontend Page / Component Architecture

### Routes (React Router)
- `/` — Dashboard (recent observations, counts, quick capture)
- `/observations` — List
- `/observations/:id` — Detail/edit
- `/observations/new` — Create (optional; fast capture can cover create)
- `/people` — List
- `/people/:id` — Detail/edit
- `/people/new` — Create
- `/systems` — List
- `/systems/:id` — Detail/edit
- `/systems/new` — Create
- `/search` — Search page (or search in header with results dropdown)

### Key components
- **Layout:** Shell (sidebar or top nav), header with global search and “Capture” action.
- **FastCaptureModal:** Dialog (shadcn) with form: observation (required), why_it_matters, context, captured_at, linked_people (multi-select/search), linked_systems (multi-select/search), title in “more options”. Submit → POST observation with links → invalidate queries → close.
- **Lists:** Table or compact list (shadcn Table or list); observations list prominent, sort by captured_at desc.
- **Detail pages:** Read view with edit button or inline edit; observation detail shows linked people/systems; person/system detail shows list of linked observations.
- **Dashboard:** Recent observations (link to observation detail), people count, systems count, button to open FastCaptureModal.
- **Search:** Input in header or dedicated page; min 2 chars; results grouped by type; click → navigate to entity.

### Data layer
- TanStack Query: one query key pattern per resource (e.g. `['observations']`, `['observations', id]`, `['people']`, `['search', q]`). Mutations invalidate list/dashboard/search as needed.
- API client: single `api` helper (base URL from env); `get`, `post`, `patch`, `delete` returning JSON.

---

## 6. Development Backlog (Epics → Stories → Tasks, Implementation Order)

**v1 status:** All epics below are **done**. DB is SQLite by default; automated API + E2E tests added post-MVP.

### Epic 1: Project scaffolding — Done
- **Story:** Developer can run backend and frontend locally and hit API from app.
- **Tasks:**
  - [x] Initialize repo: `api/` (Node + TypeScript + Express or Fastify), `app/` (Vite + React + TypeScript).
  - [x] Add Tailwind to app; add and configure shadcn/ui (init with Tailwind).
  - [x] Configure app proxy to `/api` → backend port (e.g. 4000).
  - [ ] Optional: Docker Compose for PostgreSQL + backend (and optionally app) for one-command run.
  - [x] README with: install deps, set DATABASE_URL, run migrations, start api, start app.

### Epic 2: Database schema + Prisma — Done
- **Story:** Database and ORM reflect v1 domain model; migrations run cleanly.
- **Tasks:**
  - [x] Add Prisma; define schema (Person, System, Observation, Relationship) per section 3.
  - [x] Add indexes on Relationship (source_*, target_*).
  - [x] Create initial migration; document how to run and reset.
  - [ ] Seed script optional (minimal: 0–2 people, 0–2 systems, 0–2 observations) for dev.

### Epic 3: Backend CRUD — Observations, People, Systems, Relationships — Done
- **Story:** All v1 CRUD and link behavior available via API.
- **Tasks:**
  - [x] Observations: GET list (recent first), GET by id (with embedded linked people/systems), POST (with linkedPersonIds/linkedSystemIds), PATCH (replace-set links), DELETE.
  - [x] People: GET list, GET by id, POST, PATCH, DELETE (block with 409 if any relationship targets this person).
  - [x] Systems: GET list, GET by id, POST, PATCH, DELETE (block with 409 if any relationship targets or sources this system).
  - [x] Replace-set logic: on observation create/update, delete existing observation→person and observation→system relationships, then insert from request arrays.
  - [x] Error handling and validation (e.g. required observation text, valid IDs); return consistent JSON error shape.

### Epic 4: Backend search — Done
- **Story:** GET /api/search?q= returns unified results for observations, people, systems.
- **Tasks:**
  - [x] Implement search: case-insensitive partial match on defined fields; min 2 chars; return grouped by type.
  - [x] Sort: observations by capturedAt desc; people/systems by name.

### Epic 5: Frontend shell + routing — Done
- **Story:** App loads with layout, nav, and routes; no 404 for defined routes.
- **Tasks:**
  - [x] React Router with routes: /, /observations, /observations/:id, /people, /people/:id, /systems, /systems/:id, /search (and /new routes if used).
  - [x] Layout: shell (nav links to dashboard, observations, people, systems, search); header with placeholder for search and capture.
  - [x] API client (base URL, get/post/patch/delete); TanStack Query provider.

### Epic 6: Observations list and detail
- **Story:** User can view observations list and open observation detail; create/edit from detail or separate create page.
- **Tasks:**
  1. Observations list page: fetch list, table or dense list, sort by captured_at desc; link to detail.
  2. Observation detail page: fetch by id, show all fields and linked people/systems; edit mode (form) with PATCH; optional “Create observation” page (POST) if not only using fast capture.
  - [x] TanStack Query: observations list and detail; invalidate on create/update/delete.

### Epic 7: Fast capture modal
- **Story:** User can open fast capture from header/dashboard, submit observation (required) and optional links, then modal closes and dashboard/list updates.
- **Tasks:**
  1. FastCaptureModal component (shadcn Dialog): form with observation (required), why_it_matters, context, captured_at (default now), linked_people, linked_systems, optional title (e.g. “More options”).
  2. People/systems pickers: multi-select with search (fetch people/systems list or typeahead); submit sends linkedPersonIds, linkedSystemIds.
  - [x] Submit: POST /api/observations; on success invalidate observations list and dashboard query; close modal; clear form.
  4. Wire modal open to header button and dashboard button (and optional shortcut).

### Epic 8: People and systems management — Done
- **Story:** User can list, create, edit, delete people and systems (delete blocked when linked).
- **Tasks:**
  - [x] People list + detail + create + edit; forms map to API; delete with 409 handling (show message: unlink first).
  - [x] Systems list + detail + create + edit; same; delete with 409 handling.
  - [x] Person/System detail: show linked observations (list or count with link to observations filtered by this entity if needed).
  - [x] TanStack Query for people/systems; invalidate on mutate.

### Epic 9: Dashboard — Done
- **Story:** Dashboard shows recent observations, people/systems counts, and quick capture entry.
- **Tasks:**
  - [x] Dashboard page: fetch recent observations (e.g. limit 10); display list with link to detail.
  - [x] Fetch or derive people count and systems count; display.
  - [x] “Capture” button opens FastCaptureModal; optional “Recently added people/systems” if trivial.
  - [x] Empty state when no observations yet.

### Epic 10: Search — Done
- **Story:** User can search from header or search page; results grouped by type; click goes to entity.
- **Tasks:**
  - [x] Search input (header or /search page); min 2 chars; debounce; GET /api/search?q=.
  - [x] Results UI: grouped (Observations, People, Systems); each row links to detail.
  - [x] Empty state and “no results” state.

### Epic 11: Polish and edge cases — Done
- **Story:** v1 behaves correctly on empty data, validation errors, and delete restrictions.
- **Tasks:**
  - [x] Empty states: no observations, no people, no systems; fast capture works with no links.
  - [x] API validation errors shown in forms (e.g. required observation).
  - [x] Delete 409: show clear message and optionally list which observations link to this person/system.
  - [x] Responsive basics: layout usable on small screens.
  - [x] Any loading/error states for lists and detail.

---

## 7. Fields or Behaviors to Cut for a Lean v1

- **People:** Drop `technical_strengths`, `areas_of_responsibility`, `influence_level`, `communication_style` from original spec; keep name, title, team, department, manager (text), notes. Confirmed in revised model.
- **Systems:** Drop `owners` (use `owner_team` only), `criticality`, `dependencies`, `known_constraints`, `reliability_notes`, `modernization_opportunities`; keep name, category, owner_team, description, notes. Confirmed.
- **Observations:** No `evidence`, `confidence_level`, `tags` in v1; add `context` and `captured_at` as in revised model. No linked_observations to other observations in v1.
- **Relationships:** No generic ontology; only observation→person, observation→system, system→system; optional person→system. No tags/entity_tags table.
- **Product:** No hypotheses, initiatives, timeline, graph, export, sync, auth, AI, WYSIWYG. No “analytics” dashboard beyond counts and recent list.

---

## 8. Express vs Fastify

**Recommendation: Express for v1.**

- **Reasons:** More examples and Stack Overflow for Express + TypeScript + Prisma; team familiarity is usually higher; middleware and route patterns are well understood. For a small, single-server API, the performance difference is irrelevant.
- **When to choose Fastify:** If you already use Fastify elsewhere or want schema-based validation (e.g. JSON Schema) built in; then Fastify is a good choice and the plan does not change. Both are reversible; pick one and stick to it.

---

## 9. Simple Markdown in v1

**Recommendation: Include simple markdown for observation and notes in v1.**

- **Scope:** Observation body (`observation`, `why_it_matters`, `context`) and `notes` on people/systems. Read-only view: render with one small library (e.g. `react-markdown`). Edit: plain textarea (raw markdown).
- **Why:** Low effort; avoids dependency on a rich editor; leaders often use bullets and links in notes. If you skip it, v1 is plain text only and you can add markdown in a later iteration without schema changes.

---

## Suggested Implementation Order (Summary)

1. Project scaffolding (api + app, Tailwind, shadcn, proxy, optional Docker).
2. Database schema + Prisma (schema, migrations, optional seed).
3. Backend CRUD: observations (with replace-set links), people, systems, delete restrictions.
4. Backend search.
5. Frontend shell + routing + API client + TanStack Query.
6. Observations list + detail + create/edit.
7. Fast capture modal (observation + links; invalidate on success).
8. People and systems list/detail/create/edit/delete.
9. Dashboard (recent observations, counts, capture entry).
10. Search (input, results grouped, navigate to entity).
11. Polish (empty states, validation, 409 messaging, responsive basics).

---

## 10. EPH-20250310-VIZ: Reporting Structure Visualization (Phase 2)

**Goal:** Compact graphical "Reporting Structure" section on Person detail: manager above, current person centered, peers and direct reports below; Tailwind-native, CSS connectors only.

### Backend steps

1. **Person detail GET** (`api/src/routes/people.ts`): Extend `GET /:id` include:
   - `manager`: select `{ id, name, title, team }` (add `team` to existing select).
   - `directReports`: select `{ id, name, title, team }` (add `team`).
   - **Peers:** Not a Prisma relation. After loading person, if `person.managerId` is set, query `prisma.person.findMany({ where: { managerId: person.managerId, id: { not: person.id } }, select: { id: true, name: true, title: true, team: true } })`. Attach as `peers` on response. If no managerId, `peers: []`.
2. **Response shape:** Same endpoint returns `{ ...person, manager, directReports, peers, linkedObservations }`. Compact: manager/directReports/peers are `{ id, name, title, team? }`.

### Frontend steps

1. **Types** (`app/src/types.ts`): Extend `PersonSummary` with optional `team?: string | null`. Add `peers?: PersonSummary[]` to `Person`.
2. **PersonNodeCard** (`app/src/components/people/PersonNodeCard.tsx`): Props: `person: PersonSummary`, `variant: 'current' | 'manager' | 'peer' | 'report'`, `clickable?: boolean`. Render compact card (name, title, team if present). If clickable, wrap in `Link` to `/people/{id}`; else plain div. Variant drives border/shadow (current = stronger).
3. **ReportingStructure** (`app/src/components/people/ReportingStructure.tsx`): Props: `person: Person` (full detail with manager, directReports, peers). Layout:
   - Section title: "Reporting Structure".
   - Manager row: one centered card or muted "No manager recorded".
   - Current person row: one centered PersonNodeCard variant="current" clickable={false}.
   - Peers row: label "Peers"; flex row of PersonNodeCard variant="peer" clickable; empty state "No peers recorded".
   - Direct reports row: label "Direct reports"; flex row (or wrap) of PersonNodeCard variant="report" clickable; empty state "No direct reports recorded".
   - Connector lines: CSS only (e.g. left border or pseudo-element vertical line between manager and current; from current down to reports). Use slate-300; simple vertical/connector.
4. **PersonDetail** (`app/src/pages/PersonDetail.tsx`): In read view (non-editing), add ReportingStructure section below the existing dl / "Reports to" / "Direct reports" list. Optionally keep or remove the old "Reports to" / "Direct reports" text list to avoid duplication—prefer single source: Reporting Structure section only for read view, and keep "Reports to" in the dl for compact reference; direct reports only in Reporting Structure to avoid duplication. Per design: one "Reporting Structure" section that replaces the previous direct reports list in read view; "Reports to" in dl can remain as a one-line link.
5. **Styling:** Tailwind only; borders rounded; connector lines via border-left or a thin div; responsive (flex wrap for peers/reports).

### Field mappings

| API (GET /people/:id) | Frontend |
|-----------------------|----------|
| manager: { id, name, title, team? } | PersonNodeCard(manager) |
| directReports: [{ id, name, title, team? }] | PersonNodeCard(report) × N |
| peers: [{ id, name, title, team? }] | PersonNodeCard(peer) × N |
| person (self) | PersonNodeCard(current) |

### Acceptance criteria

- [ ] API returns manager, directReports, peers with id, name, title, team.
- [ ] Peers = same managerId as current person, excluding current.
- [ ] "Reporting Structure" section on Person detail (read view).
- [ ] Manager row (one card or "No manager recorded"); current row (emphasized); peers row (cards or empty); direct reports row (cards or empty).
- [ ] Connector lines CSS-only, subtle (slate-300).
- [ ] Cards clickable to person detail (except current).
- [ ] Responsive; Tailwind-native; no third-party graph libs.

---

**End of implementation plan.** Use this plus `.ai/context/design_decisions.md` as the single source of truth for v1 build and backlog.
