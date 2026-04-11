# Data Format Reference (v1)

API and frontend use the same JSON field names (camelCase). Dates are ISO 8601.

## Observation

**POST /api/observations** (create) and **PATCH /api/observations/:id** (update) body:

| Field             | Type     | Required | Notes                          |
|-------------------|----------|----------|--------------------------------|
| observation       | string   | yes      | Main text; max 50,000 characters |
| title             | string   | no       |                                |
| whyItMatters      | string   | no       |                                |
| context           | string   | no       | e.g. "1:1 with James"          |
| capturedAt       | string   | no       | ISO 8601; default now          |
| observationType   | string   | no       | One of: structure, ownership, friction, dependency, opportunity, influence, culture. Omit or null = no type. **PATCH:** if omitted, type left unchanged; if present (including null), replace. |
| linkedPersonIds   | string[] | no       | Replace-set on create. **PATCH:** if omitted, people links are left unchanged; if present (including `[]`), that set is replaced. |
| linkedSystemIds   | string[] | no       | Replace-set on create. **PATCH:** if omitted, system links are left unchanged; if present (including `[]`), that set is replaced.   |

**GET observation response:** Same fields plus `id`, `createdAt`, `updatedAt`, and embedded `linkedPeople` (e.g. `[{ id, name }]`), `linkedSystems` (e.g. `[{ id, name }]`). `observationType` is `string | null`.

## Person

**POST /api/people** (create) and **PATCH /api/people/:id** (update) body (subset; other scalars unchanged):

| Field      | Type   | Required | Notes |
|------------|--------|----------|--------|
| name       | string | yes (create) | |
| title, team, department, notes | string | no | |
| managerId  | string | no | Existing semantics: omit vs clear vs set. |
| location   | string \| null | no | **Foreign key** to `SiteLocation.code`. Must match a row in the `SiteLocation` table (see migrations / DB seed), or **null** / omitted for no location. Unknown codes → **400**. |

**GET person / list responses:** `location` is `string | null`. Responses may include **`siteLocation`**: `{ code, label }` when joined for display.

**GET /api/site-locations** — Returns `{ code, label, sortOrder }[]` for dropdowns (ordered). Allowed codes and labels are **stored in the database** (reference rows inserted by migrations and/or the in-app CRUD below), not hardcoded in application source. The shipped seed uses neutral placeholder codes (`LOC01`, …); you can edit or replace them in the **Locations** UI or in the database.

**Site location CRUD (`SiteLocation`):**

| Method | Path | Body | Status | Notes |
|--------|------|------|--------|--------|
| GET | `/api/site-locations` | — | 200 | List all rows, ordered by `sortOrder` then `code`. |
| POST | `/api/site-locations` | `code` (string, required), `label` (string, required), `sortOrder` (integer, optional, default `0`) | 201 | Returns created `{ code, label, sortOrder }`. Duplicate `code` → **409**. `code` max **64** chars, `label` max **256** (enforced). |
| PATCH | `/api/site-locations/:code` | `code` (optional), `label` and/or `sortOrder` (optional). **Rename:** send `code` with the new value; people’s `location` updates via FK **ON UPDATE CASCADE**. | 200 | Returns updated row. Unknown path `code` → **404**. Empty `code`/`label` → **400**. Duplicate new `code` → **409**. `label` max **256** chars. |
| DELETE | `/api/site-locations/:code` | — | 204 | Deletes row. People with this `location` get **`location` set to null** (FK). Unknown `code` → **404**. |

**Changing locations (bulk / automation):** For mass edits on a new clone, you can still use a new migration with `INSERT` / `UPDATE`, or direct SQL against your SQLite file. No restart required; the app reads from the DB at request time.

## System

Create/update bodies: same as Prisma model fields (camelCase). No format conversion; send as-is.

## Search

**GET /api/search?q=** response: `{ observations: [...], people: [...], systems: [...] }`. Each item has same shape as list/detail for that type. Min query length 2 characters.

## Errors

API errors: `{ "error": "message" }`. Use HTTP status (e.g. 400 validation, 409 delete blocked).
