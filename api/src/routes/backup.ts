import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { prisma } from "../lib/prisma.js";
import { repairSchemaAfterSqliteImport } from "../lib/postImportSchemaRepair.js";
import { getResolvedSqliteDatabasePath } from "../lib/sqliteDatabasePath.js";
import { logError } from "../lib/logger.js";

export const backupRouter = Router();

/** Application tables only — never drop `_prisma_migrations`. */
const TABLES = ["Person", "System", "Observation", "Relationship"] as const;

/** FK-safe drop order (Relationship → … → Person self-FK last). */
const DROP_ORDER: readonly (typeof TABLES)[number][] = [
  "Relationship",
  "Observation",
  "System",
  "Person",
];

/** Recreate/copy order: Person before rows that may reference Person.manager_id. */
const COPY_ORDER: readonly (typeof TABLES)[number][] = ["Person", "System", "Observation", "Relationship"];

const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
      cb(null, `ca-import-${Date.now()}-${safe || "upload.db"}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function sqlStringLiteral(p: string): string {
  return `'${p.replace(/'/g, "''")}'`;
}

/** Serialize export/import so Prisma and better-sqlite3 do not fight the same file. */
let backupChain: Promise<void> = Promise.resolve();

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = backupChain.then(fn, fn);
  backupChain = run.then(
    () => {},
    () => {},
  );
  return run;
}

function validateBackupTables(srcPath: string): void {
  const db = new Database(srcPath, { readonly: true, fileMustExist: true });
  try {
    for (const t of TABLES) {
      const row = db
        .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`)
        .get(t) as { ok: number } | undefined;
      if (!row) {
        throw new Error(`Backup is not a valid Command Atlas database (missing table: ${t})`);
      }
    }
  } finally {
    db.close();
  }
}

/**
 * Drop application tables (FK order), recreate DDL from the attached backup, then copy rows.
 * Keeps `_prisma_migrations` on the main database file so Prisma stays aligned with the schema version.
 */
function importFromBackupAttached(mainPath: string, srcPath: string): void {
  validateBackupTables(srcPath);

  const db = new Database(mainPath);
  try {
    db.pragma("foreign_keys = OFF");
    db.prepare(`ATTACH DATABASE ${sqlStringLiteral(path.resolve(srcPath))} AS src`).run();

    try {
      db.exec("BEGIN EXCLUSIVE");
      for (const t of DROP_ORDER) {
        db.exec(`DROP TABLE IF EXISTS main.${quoteIdent(t)}`);
      }
      for (const t of COPY_ORDER) {
        const row = db
          .prepare(`SELECT sql FROM src.sqlite_master WHERE type = 'table' AND name = ?`)
          .get(t) as { sql: string | null } | undefined;
        if (!row?.sql) {
          throw new Error(`Backup has no CREATE statement for table ${t}`);
        }
        db.exec(row.sql);
      }
      for (const t of COPY_ORDER) {
        db.exec(`INSERT INTO main.${quoteIdent(t)} SELECT * FROM src.${quoteIdent(t)}`);
      }
      db.exec("COMMIT");
    } catch (err) {
      try {
        db.exec("ROLLBACK");
      } catch {
        /* ignore */
      }
      throw err;
    } finally {
      try {
        db.exec("DETACH DATABASE src");
      } catch {
        /* ignore */
      }
    }
  } finally {
    db.close();
  }

  repairSchemaAfterSqliteImport(mainPath);
}

backupRouter.get("/download", (_req, res) => {
  void runExclusive(async () => {
    const mainPath = getResolvedSqliteDatabasePath();
    const tmp = path.join(os.tmpdir(), `ca-export-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    await prisma.$disconnect();
    try {
      const db = new Database(mainPath, { readonly: true, fileMustExist: true });
      try {
        await db.backup(tmp);
      } finally {
        db.close();
      }
      const buffer = await fs.readFile(tmp);
      await fs.unlink(tmp).catch(() => {});

      const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      const filename = `command-atlas-${ts}-export.db`;

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length.toString());
      res.status(200).send(buffer);
    } catch (error) {
      await fs.unlink(tmp).catch(() => {});
      logError("Database export failed", error);
      const message = error instanceof Error ? error.message : "Database export failed";
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    } finally {
      await prisma.$connect();
    }
  }).catch((error) => {
    logError("Database export exclusive failed", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Database export failed" });
    }
  });
});

backupRouter.post("/import", upload.single("file"), (req, res) => {
  void runExclusive(async () => {
    if (!req.file?.path) {
      res.status(400).json({ error: "Expected multipart field \"file\" with a .db SQLite backup" });
      return;
    }

    const uploadedPath = req.file.path;

    try {
      const mainPath = getResolvedSqliteDatabasePath();

      await prisma.$disconnect();
      try {
        importFromBackupAttached(mainPath, uploadedPath);
      } finally {
        await prisma.$connect();
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      logError("Database import failed", error);
      const message = error instanceof Error ? error.message : "Database import failed";
      res.status(400).json({ error: message });
    } finally {
      await fs.unlink(uploadedPath).catch(() => {});
    }
  }).catch((error) => {
    logError("Database import exclusive failed", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Database import failed" });
    }
  });
});

backupRouter.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "Upload exceeds maximum size (64 MB)" });
    return;
  }
  next(err);
});
