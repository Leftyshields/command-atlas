import path from "node:path";

/**
 * Resolves the SQLite database file path from `DATABASE_URL` the same way Prisma does:
 * relative `file:` paths are resolved from the directory containing `schema.prisma` (`prisma/`).
 */
export function getResolvedSqliteDatabasePath(): string {
  const url = process.env.DATABASE_URL ?? "";
  const m = url.match(/^file:(.+)$/);
  if (!m) {
    throw new Error("DATABASE_URL must be a SQLite file URL (file:...)");
  }
  const raw = m[1];
  if (path.isAbsolute(raw)) {
    return raw;
  }
  return path.resolve(process.cwd(), "prisma", raw);
}
