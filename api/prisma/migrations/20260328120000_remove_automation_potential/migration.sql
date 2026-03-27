-- RedefineTables: drop automation_potential from Observation
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Observation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "observation" TEXT NOT NULL,
    "why_it_matters" TEXT,
    "context" TEXT,
    "observation_type" TEXT,
    "toil_type" TEXT,
    "friction_score" INTEGER,
    "captured_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Observation" ("captured_at", "context", "created_at", "friction_score", "id", "observation", "observation_type", "title", "toil_type", "updated_at", "why_it_matters")
SELECT "captured_at", "context", "created_at", "friction_score", "id", "observation", "observation_type", "title", "toil_type", "updated_at", "why_it_matters" FROM "Observation";
DROP TABLE "Observation";
ALTER TABLE "new_Observation" RENAME TO "Observation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
