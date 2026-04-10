# Postmortem: Docker-canonical DB backup & portability (EPH-20260327-T01 context)

**Feature:** Single portable SQLite backup from Docker, MD5 validation, codename filenames, restore/runbook docs, WAL sidecar handling.

**Scope of analysis:** Process friction, rework, misunderstandings, and missing documentation. Not a line-by-line code audit.

---

## 1. Where friction occurred

| Area | What happened |
|------|----------------|
| **Workflow mode drift** | Implementation (script, `package.json`, README) started while the user still wanted **explore-only** context. That created out-of-band edits and rework/reconciliation with workflow discipline. |
| **PATCH 400 (separate thread)** | Observation edit sent JSON `null` for optional strings; Zod `z.string().optional()` rejects `null`, causing 400 until the API accepted nullable optional fields. Friction was debugging without the response body first. |
| **Dolt tangent** | Brief consideration of Dolt + private repo; correctly narrowed to SQLite file transport after priority clarification (transportability, not versioned data). |
| **Generic Cursor commands** | `/execute_plan` and `/code_review` still reference `functions/index.js` + `server.js` in some templates; this repo uses a **single** Express app under `api/`. Extra mental overhead until explicitly marked N/A. |
| **Restore “people missing”** | After a restore dry run, **People** appeared missing. Root cause was **SQLite WAL sidecar files** (`dev.db-wal`, `dev.db-shm`) left beside a replaced `dev.db`, not a separate people datastore or missing restore step. Docs initially did not say to delete WAL/SHM after replace. |
| **Backup correctness** | First implementation used `docker cp` of the live DB file; code review flagged risk under concurrent writes. Follow-up added `sqlite3` in the API image and **SQLite `.backup`** for consistent snapshots. |

---

## 2. Where rework happened

- Backup path: **raw `docker cp` → SQLite `.backup` + `sqlite3` in `api/Dockerfile`**.
- README: multiple passes — canonical Docker path, MD5, codenames, restore steps, then **WAL/SHM removal** and troubleshooting for “people missing.”
- `docs/QA_CHECKLIST.md`: added a **Docker backup/restore** section including People/Systems verification and WAL edge case.
- Context files (`.ai/context/*`): iterated decisions (Docker primary, recurring sync, single active machine, on-demand transfer, single file); gitignored so not versioned in repo.

---

## 3. What was misunderstood

| Misunderstanding | Reality |
|------------------|--------|
| “People need their own restore” | **All** entities (people, systems, observations, relationships) live in **one** SQLite file. One file restore is sufficient if done correctly. |
| “Restore replaced the DB so it should be complete” | Replacing only `dev.db` while **old** `-wal`/`-shm` remain can yield **partial or inconsistent** views of data. |
| Explore vs execute | **Explore** is analysis/logging; **execute_plan** is implementation. Mixing them causes duplicate or premature code changes. |

---

## 4. What instructions or documentation were missing early

- **SQLite WAL behavior** in restore runbooks: always remove or replace sidecar files when replacing the main DB file, or document stop-copy-rm-start sequence.
- **Single-file data model** called out explicitly in backup/restore docs: one `.db` = full app data.
- **Workflow:** explicit “do not implement code during `/explore` unless user runs `/execute_plan`” (or user explicitly asks to implement).

---

## 5. Root cause

1. **Operational SQLite detail (WAL)** not in the first restore doc — user followed steps but hit a classic SQLite pitfall.
2. **Process:** implementation started before **execute** phase, increasing confusion about what was “official” scope.
3. **Generic tooling text** (dual backend files) not consistently overridden for **single-backend** repos.

---

## 6. What should change in prompts or docs

- **README / restore:** Always document: stop API → copy `dev.db` → **remove `dev.db-wal` and `dev.db-shm`** → start API (and non-Docker equivalent beside the file path).
- **QA:** After restore, explicitly verify **People**, **Systems**, and **Observations** (smoke check for “one database” mental model).
- **Workflow commands:** In `/explore`, state: *intake + log only; no repo code changes unless user explicitly requests implementation.*
- **`/execute_plan` template:** Keep “Backend File Mapping (this repository)” as the source of truth; de-emphasize or conditionalize `server.js` / `functions` where N/A.

---

## 7. How to prevent this next time

- For **any** SQLite backup/restore doc: include a **WAL/SHM** bullet in v1, not only after an incident.
- Gate **code changes** on **`/execute_plan`** (or explicit user request: “implement now”).
- After **code_review** suggestions (e.g. `.backup`), implement and **re-run** backup + checksum + one restore smoke test on the checklist.

---

## 8. Proposed updates (applied or tracked)

| Target | Update |
|--------|--------|
| `README.md` | Restore section + troubleshooting for WAL; verify People/Systems after restore. |
| `docs/QA_CHECKLIST.md` | Section for Docker backup/restore + WAL edge case. |
| `.cursor/commands/workflow.md` | Common mistakes: clarify backend parity for this repo; add mistake “Implementing during explore without execute.” |
| `docs/POSTMORTEM_DOCKER_DB_PORTABILITY.md` | This document. |

---

**Related:** `docker-compose.yml` (volume `api_sqlite_data`), `scripts/backup-db.sh`, `api/Dockerfile` (`sqlite3`).
