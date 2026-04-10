import Database from "better-sqlite3";

/**
 * After importing an older SQLite backup, the live schema may lack `SiteLocation`
 * and/or `Person.location` while the Prisma client expects them. Repair in place.
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
        ('HT', 'Hawthorne', 0),
        ('CC', 'Cape Canaveral', 1),
        ('SE', 'Seattle', 2),
        ('BA', 'Bastrop', 3),
        ('ST', 'Starbase', 4);
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
