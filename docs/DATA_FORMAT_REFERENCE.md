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

## Person / System

Create/update bodies: same as Prisma model fields (camelCase). No format conversion; send as-is.

## Search

**GET /api/search?q=** response: `{ observations: [...], people: [...], systems: [...] }`. Each item has same shape as list/detail for that type. Min query length 2 characters.

## Errors

API errors: `{ "error": "message" }`. Use HTTP status (e.g. 400 validation, 409 delete blocked).
