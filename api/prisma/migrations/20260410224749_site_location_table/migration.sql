-- CreateTable
CREATE TABLE "SiteLocation" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "team" TEXT,
    "department" TEXT,
    "notes" TEXT,
    "location" TEXT,
    "manager_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Person_location_fkey" FOREIGN KEY ("location") REFERENCES "SiteLocation" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Person_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Person" ("created_at", "department", "id", "location", "manager_id", "name", "notes", "team", "title", "updated_at") SELECT "created_at", "department", "id", "location", "manager_id", "name", "notes", "team", "title", "updated_at" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
