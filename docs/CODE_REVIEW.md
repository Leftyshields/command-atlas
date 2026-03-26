# Code Review: Command Atlas v1 Implementation

## Summary

Review of the Command Atlas MVP: API (`api/`) and frontend (`app/`) including observations, people, systems, relationships, fast capture, dashboard, and search. Scope is security, correctness, architecture, code quality, performance, and testing.

---

## Security Issues 🔴

**None.** No hardcoded secrets, no use of `dangerouslySetInnerHTML` or `eval` in application code. Prisma is used for all DB access (parameterized; no raw SQL). User content is rendered via `react-markdown` (no raw HTML). Auth is intentionally out of scope for v1.

---

## Bugs / Correctness Issues 🟠

### 1. 🟠 API `handleRes`: JSON parse can throw on non-JSON error body — **FIXED**

**File:** `app/src/lib/api.ts`  
**Issue:** When `res.ok` is false, `JSON.parse(text)` is used. If the server returns a non-JSON body (e.g. HTML error page), this throws and the user sees a parse error instead of the intended error message.  
**Fix:** Wrapped in try/catch; fall back to `res.statusText` when parse fails.

### 2. 🟠 Delete 204 handling in frontend

**File:** `app/src/lib/api.ts` — `delete` method  
**Issue:** For 204 No Content, the response body is empty. The code doesn’t explicitly handle 204 before checking `!r.ok`; in practice 204 is ok so `handleRes` isn’t called for delete. If the API ever returns 200 with a body for delete, the current `delete` helper wouldn’t parse it (it only throws when !ok).  
**Verdict:** Acceptable for current API contract (204 on success). No change required unless contract changes.

### 3. 🟡 PersonDetail / SystemDetail: form sync when opening edit

**Files:** `app/src/pages/PersonDetail.tsx`, `app/src/pages/SystemDetail.tsx`  
**Issue:** `useEffect` syncs form from `person`/`system` when `!editing`. If the user opens edit, then the query refetches (e.g. after tab focus), the effect runs again with `editing` true and the dependency array includes `editing`, so it won’t overwrite the form. Correct as implemented. No bug.

---

## Suggestions 🟡

### 1. CORS for production — **DONE**

**File:** `api/src/index.ts`  
**Change:** `cors({ origin: process.env.FRONTEND_ORIGIN ?? true })`. Set `FRONTEND_ORIGIN` in production to restrict; documented in `api/.env.example`.

### 2. Avoid logging full errors in production — **DONE**

**Files:** `api/src/index.ts`, `api/src/lib/logger.ts`, `api/src/routes/*.ts`  
**Change:** Global handler and all routes use `logError(context, e)`; in production only the context string is logged. Full error logged in development.

### 3. react-markdown: explicitly disable HTML — **DONE**

**Files:** `app/src/components/SafeMarkdown.tsx`; ObservationDetail, PersonDetail, SystemDetail use it.  
**Change:** Shared `SafeMarkdown` component with comment: "HTML is not rendered; do not add rehype-raw." All markdown rendering goes through it.

### 4. Console statements

**Files:** `api/src/index.ts`, all `api/src/routes/*.ts`  
**Current:** `console.error(e)` in catch blocks; `console.log` for server listen.  
**Verdict:** Error logging is intentional. The single `console.log` for startup is acceptable. No change required for checklist; optional: use a small logger that can be turned off in production.

### 5. Input validation — **DONE**

**Change:** Observation text limited to 50,000 characters in POST and PATCH; 400 returned if exceeded. Documented in `docs/DATA_FORMAT_REFERENCE.md`.

---

## Positive Notes 🟢

- **Single backend:** No server.js vs functions parity; all API logic in `api/` with one entry point.
- **Prisma only:** No raw SQL; injection risk avoided.
- **Replace-set semantics:** Observation links implemented as specified (delete then insert).
- **Delete 409:** People/systems return 409 with a clear message when linked; frontend shows it.
- **State updates:** Functional updates used where state depends on previous state (e.g. FastCaptureModal link toggles, form updates).
- **No XSS vectors:** No `dangerouslySetInnerHTML`; markdown rendered via `react-markdown`.
- **TanStack Query:** Consistent cache keys and invalidation after mutations.
- **Types:** Shared types and API payloads in line with design; dates ISO 8601.
- **Layout and Capture:** Capture available from header and dashboard via context; modal and layout are clear.

---

## Verdict

- [x] ✅ **Approved**
- [ ] ⚠️ Approved with suggestions
- [ ] ❌ Changes requested

Implementation is suitable to merge. No blocking security or correctness issues. Suggestions above are optional improvements.

---

## Next Steps

1. **Optional:** Harden `app/src/lib/api.ts` error handling (try/catch around `JSON.parse` when `!res.ok`).
2. **Optional:** Restrict CORS and production error logging before any production deploy.
3. Run **`/qa_checklist`** for manual testing (happy path, 409 delete, search, fast capture with links).
4. Add API or E2E tests when prioritizing test coverage (currently deferred for v1).
