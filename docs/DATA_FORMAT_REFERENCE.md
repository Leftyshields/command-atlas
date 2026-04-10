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

**GET /api/site-locations** — Returns `{ code, label, sortOrder }[]` for dropdowns (ordered). Allowed codes and labels are **stored in the database** (reference rows inserted by migrations), not hardcoded in application source.

**Changing locations:** Add or edit rows in `SiteLocation` (e.g. new migration with `INSERT`, or direct SQL against your SQLite file). Restart not required; app reads from DB at request time.

## System

Create/update bodies: same as Prisma model fields (camelCase). No format conversion; send as-is.

## Search

**GET /api/search?q=** response: `{ observations: [...], people: [...], systems: [...] }`. Each item has same shape as list/detail for that type. Min query length 2 characters.

## Errors

API errors: `{ "error": "message" }`. Use HTTP status (e.g. 400 validation, 409 delete blocked).
