# Command Atlas

Private leadership intelligence for technical leaders entering a new organization. A structured notebook and relationship map: capture observations, link people and systems, and surface patterns over time. Single-user, local-first. Not a CRM.

**Design and backlog:** See `.ai/context/design_decisions.md`. Implementation follows the execution plan in `.ai/context/execution_plan.md`. Shared technical references: `docs/REACT_PATTERNS.md`, `docs/DATA_FORMAT_REFERENCE.md`.

### Solo, local-first by design

Command Atlas is aimed at **one person** using it **on their own machine** (or an equivalent local setup such as Docker on your workstation). Data stays under your control; the stack assumes a **low-trust network boundary**—for example localhost or a private container network—not the public internet.

**If you grow beyond that**—shared hosting, remote access, multiple users, importing data from untrusted parties, or anything that widens who can reach the API—treat security as a **first-class requirement**: authentication, transport protection (TLS), careful validation of uploads and backups, secrets handling, and operational hardening appropriate to the threat model. The current codebase optimizes for simplicity and local trust; **do not reuse that implicit model** when you expand scope.

## Prerequisites

- Node 18+
- npm or pnpm
- Docker-compatible runtime (Docker Desktop or OrbStack) for containerized local install

**Database:** SQLite by default (no separate server). The DB file is created at `api/prisma/dev.db` when you run migrations. To use PostgreSQL instead, switch the Prisma provider and set `DATABASE_URL` in `api/.env`.

## Docker quick start (recommended for simple local install)

This path works with Docker Desktop and OrbStack.

```bash
docker compose up --build
```

Open `http://localhost:5173`.

Note: the Docker setup does **not** publish API port `4000` to the host by default (to avoid port conflicts). The app reaches the API over the internal compose network.

### Docker commands

```bash
# If 5173 is in use on your host, choose another host port:
# APP_PORT=5174 docker compose up --build

# Stop services
docker compose down

# Rebuild after dependency or Dockerfile changes
docker compose up --build

# View logs
docker compose logs -f
```

### Docker persistence

- SQLite data persists in named volume `api_sqlite_data` mounted at `/app/sqlite` in the API container (`DATABASE_URL` points at `sqlite/dev.db`). The `prisma/` directory is **not** overlaid by a volume so `schema.prisma` and migrations from the image stay visible and `prisma generate` stays in sync with the schema.
- Obsidian direct-write export path is mounted from `./obsidian-vault` to `/obsidian-vault` in the API container.
- To remove containers and persisted SQLite data:

```bash
docker compose down -v
```

## Setup

### 1. API

```bash
cd api
npm install
cp .env.example .env                 # already set for SQLite (file:./dev.db)
npx prisma migrate dev --name init  # creates SQLite DB and tables
# Optional: npm run db:seed          # seed sample data
npm run dev                          # starts API on http://localhost:4000
```

### 3. App

In another terminal:

```bash
cd app
npm install
npm run dev   # starts Vite on http://localhost:5173, proxies /api to API
```

Open http://localhost:5173. Use **Capture** to add observations; add **People** and **Systems** first to link from observations.

## Observations and toil tracking

Observations hold the main text plus optional metadata (title, **observation type**, links to people/systems). You can also record **operational toil** so repetitive or scaling manual work is easier to spot later:

| Concept | In the UI | Notes |
|--------|-----------|--------|
| What happened / the work | **The Manual Action** | Required body text in quick capture. |
| Why it matters | **The Toil Cost (Impact)** | Optional; maps to `whyItMatters`. |
| Where it came from | **The Trigger/Catalyst** | Optional; maps to `context`. |
| Category of toil | **Toil type** | Optional dropdown (e.g. Manual Deployment/Release, Incident Firefighting, Handoff/Ticket Friction). |
| Subjective severity | **Friction score** | Optional **1–5**; clearable in the editor. |

Set these in **Quick Capture** or when **editing** an observation on its detail page. **Obsidian export** includes toil type and friction score in generated observation notes when present.

## Obsidian export (MVP)

- Scope: **manual**, **one-way** export from Command Atlas -> Obsidian.
- Delivery:
  - **Download zip** from Dashboard (primary path).
  - Optional direct write to `OBSIDIAN_VAULT_ROOT` via API.
- Link mode: Obsidian wikilinks (`[[...]]`) in generated note bodies.
- Overwrite mode: full regenerate/replace of generated folders on each export.

### Configure vault path (optional for direct-write endpoint)

Set `OBSIDIAN_VAULT_ROOT` in `api/.env` to your vault directory:

```bash
OBSIDIAN_VAULT_ROOT="/absolute/path/to/your/vault"
```

### Run export

1. Start API (`cd api && npm run dev`) and app (`cd app && npm run dev`).
2. In the app Dashboard, click **Download Obsidian Zip**.
3. Unzip the downloaded file into your Obsidian vault.

### Direct-write export (optional)

1. Set `OBSIDIAN_VAULT_ROOT` in `api/.env`.
2. Trigger:

```bash
curl -X POST http://localhost:4000/api/export/obsidian
```

3. The API writes generated files to:
   - `People/`
   - `Systems/`
   - `Observations/`
   inside your configured vault root.

### Download endpoint (without UI)

```bash
curl -L "http://localhost:4000/api/export/obsidian.zip" -o command-atlas-obsidian.zip
```

### Current limitations

- No import from Obsidian back into Command Atlas.
- No bidirectional sync, scheduling, or on-save automation.
- No `.canvas`, Dataview/Bases generation, or merge/conflict handling.

## Scripts

| Location | Command | Description |
|----------|---------|--------------|
| root | `npm run test` | Run API tests then E2E (E2E needs API + app running) |
| root | `npm run backup:db -- "<codename>"` | Canonical Docker backup: creates one portable `.db` file and `.md5` checksum in `backups/` |
| api | `npm run test` | API integration tests (Vitest) |
| api | `npm run dev` | Start API (tsx watch) |
| api | `npm run db:migrate` | Run Prisma migrations |
| api | `npm run db:seed` | Seed sample data |
| api | `curl -X POST http://localhost:4000/api/export/obsidian` | Trigger direct-write Obsidian export via API |
| api | `curl -L "http://localhost:4000/api/export/obsidian.zip" -o command-atlas-obsidian.zip` | Download Obsidian export zip via API |
| app | `npm run test:e2e` | E2E tests (Playwright; reuses existing API/app if running) |
| app | `npm run dev` | Start Vite dev server |
| app | `npm run build` | Build for production |

## Reset database

```bash
cd api
npx prisma migrate reset   # drops DB, reapplies migrations, optionally runs seed
```

## Backup

### In-app backup (web UI)

With the API and app running, open **Backup** in the header (`/backup`). **Download** saves a full SQLite `.db` snapshot; **import** replaces all application data from a compatible backup file (export first if you need to keep the current database). For deep recovery steps and WAL sidecar handling when replacing files on disk, see below.

**Canonical mode:** use Docker as the source of truth for runtime + backup.
Sync model is **single active machine at a time**, with **on-demand manual** backup + upload.

Run exactly one backup command from repo root:

```bash
npm run backup:db -- "spring-harbor"
```

What it does:
- Runs **SQLite `.backup`** inside the API container against `/app/sqlite/dev.db` so the snapshot is consistent even if the app is writing (better than copying the raw file while SQLite is open).
- Writes backup file to `backups/command-atlas-<UTC timestamp>-<codename>.db`
- Writes checksum to `backups/command-atlas-<UTC timestamp>-<codename>.db.md5`
- Prints the MD5 hash in terminal for quick validation

If the script says `sqlite3 is not available in the API container`, rebuild the API image once: `docker compose build --no-cache api` (the image installs the `sqlite3` CLI for backups).

If you omit the codename, the script auto-generates a human-readable codename.

### Transfer to another machine

Move/upload the single `.db` backup file to the other machine:

`backups/command-atlas-<timestamp>-<codename>.db`

Optional but recommended: move the matching `.md5` file too and verify after transfer.

### Verify backup integrity

```bash
cd backups
md5sum -c "command-atlas-<timestamp>-<codename>.db.md5"
```

### Restore on another machine (Docker mode)

SQLite may create sidecar files next to the DB (`dev.db-wal`, `dev.db-shm`) when using WAL mode. If you replace only `dev.db` but leave old WAL/SHM files behind, SQLite can show **wrong or partial data** (for example missing **people** or **systems**) because the journal no longer matches the new main file. Always remove those sidecars after copying a restored `dev.db`.

1. Stop the API so nothing holds the DB open:

```bash
docker compose stop api
```

2. Copy your backup over the live DB file:

```bash
docker cp "backups/command-atlas-<timestamp>-<codename>.db" "$(docker compose ps -q api):/app/sqlite/dev.db"
```

3. Remove stale WAL/SHM files on the same volume (safe if missing):

```bash
docker compose run --rm --no-deps api sh -lc 'rm -f /app/sqlite/dev.db-wal /app/sqlite/dev.db-shm'
```

4. Start API again:

```bash
docker compose up -d api
```

5. Verify data: open **People** and **Systems** as well as observations — all live in the same SQLite file, so they should match the backup.

### No-Docker fallback (if work machine is restricted)

If Docker is unavailable, run API + app locally with Node and point API `DATABASE_URL` to the transferred `.db` file path. Keep the same single-file handoff model (`.db` + optional `.md5`). After placing the file, delete any `dev.db-wal` and `dev.db-shm` next to it before starting the API, for the same WAL reason as Docker.

## Troubleshooting

### After restore, people/systems missing but observations look OK

Usually **stale SQLite WAL sidecar files** (`dev.db-wal`, `dev.db-shm`) left next to a newly restored `dev.db`. Follow the restore steps above (stop API → copy → `rm` WAL/SHM → start API). All entities share one database file; there is no separate “people” restore step.

### "Failed to create observation" (500)

1. **API running?** The app proxies `/api` to `http://localhost:4000`. Start the API with `cd api && npm run dev`. If your API runs on another port, set the proxy in `app/vite.config.ts` (e.g. `target: "http://localhost:5001"`).
2. **Database:** Default is SQLite (`DATABASE_URL="file:./dev.db"` in `api/.env`). Run `cd api && npx prisma migrate dev --name init` to create the DB and tables. For PostgreSQL, change the provider in `api/prisma/schema.prisma` and set `DATABASE_URL` to your connection string.
3. **Prisma client:** Run `cd api && npx prisma generate` after changing the schema.
4. **Dev error details:** With `NODE_ENV` unset or not `production`, the API includes the underlying error message in the 500 response. Check the API terminal for full logs.
5. **Docker startup race:** On first `docker compose up --build`, the app may load before API migrations finish. Wait a few seconds and refresh, or check `docker compose logs -f api`.
6. **Docker: `Unknown argument toilType` (or similar) on save:** The API container must see `prisma/schema.prisma` from the image. If an older compose file mounted a volume over **all** of `/app/prisma`, the volume could hide the schema and `prisma generate` would produce a stale client. Current compose mounts only `sqlite/` for the DB file. Rebuild and recreate: `docker compose down && docker compose up --build`.

### Docker port conflict

If `5173` is already in use:

```bash
APP_PORT=5174 docker compose up --build
```

Then open `http://localhost:5174`.

### SQLite volume permissions (Docker)

If the API cannot write the SQLite database in Docker, recreate containers and volume:

```bash
docker compose down -v
docker compose up --build
```

### Prisma/OpenSSL error in API container

If API logs show Prisma `libssl/openssl` detection errors, rebuild the API image after pulling latest changes:

```bash
docker compose down
docker compose build --no-cache api
docker compose up --build
```

If API logs show `@prisma/client did not initialize yet`, regenerate Prisma client by rebuilding the API image:

```bash
docker compose down
docker compose build --no-cache api
docker compose up --build
```

### TypeError in console

If you see "Cannot convert undefined or null to object" after a failed request, ensure the backend returns JSON error bodies (e.g. `{ "error": "message" }`) and that the API URL/port matches the app proxy in `vite.config.ts`.

### UI change not visible after pull

If you added a new nav link/page (for example **Backup**) but cannot see it in the browser:

1. Hard refresh the page (`Ctrl+Shift+R` / `Cmd+Shift+R`).
2. Restart the app dev server (`cd app && npm run dev`).
3. If using Docker, rebuild and restart (`docker compose up --build`).

Vite/Docker can occasionally serve stale assets after branch switches or dependency changes.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, react-markdown
- **Backend:** Node, Express, TypeScript, Prisma
- **Database:** SQLite (default; file at `api/prisma/dev.db`). PostgreSQL supported by changing the Prisma provider.

## License

Private use. See repo for details.

## Open-source security checklist

Before publishing this repository:

- Verify no secrets are committed (`.env`, API keys, tokens, private keys).
- Keep local machine paths out of tracked files (for example, absolute vault paths).
- Prefer `.env.example` templates for required configuration.
- Ensure `node_modules`, build artifacts, and local SQLite files are ignored.
- Rotate any credential that was ever stored in a local `.env` file before making a repo public.
