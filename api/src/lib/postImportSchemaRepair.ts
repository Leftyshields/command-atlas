import Database from "better-sqlite3";

/**
 * After importing an older SQLite backup, the live schema may lack `SiteLocation`
 * and/or `Person.location` while the Prisma client expects them. Repair in place.
 * Default `SiteLocation` rows match the neutral seed in
 * `20260410224810_seed_site_locations` (placeholder codes/labels only).
 */
export function repairSchemaAfterSqliteImport(mainPath: string): void {
  const db = new Database(mainPath);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS "SiteLocation" (
        "code" TEXT NOT NULL PRIMARY KEY,
        "label" TEXT NOT NULL,
        "sort_order" INTEGER NOT NULL DEFAULT 0
      );
    `);
    db.exec(`
      INSERT OR IGNORE INTO "SiteLocation" ("code", "label", "sort_order") VALUES
        ('LOC01', 'Location 1', 0),
        ('LOC02', 'Location 2', 1),
        ('LOC03', 'Location 3', 2),
        ('LOC04', 'Location 4', 3),
        ('LOC05', 'Location 5', 4);
    `);

    const cols = db.prepare(`PRAGMA table_info("Person")`).all() as { name: string }[];
    if (!cols.some((c) => c.name === "location")) {
      db.exec(`ALTER TABLE "Person" ADD COLUMN "location" TEXT`);
    }

    db.exec(`
      UPDATE "Person" SET "location" = NULL
      WHERE "location" IS NOT NULL
        AND "location" NOT IN (SELECT "code" FROM "SiteLocation");
    `);
  } finally {
    db.close();
  }
}
