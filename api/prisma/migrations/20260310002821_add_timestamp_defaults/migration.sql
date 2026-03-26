-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Observation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "observation" TEXT NOT NULL,
    "why_it_matters" TEXT,
    "context" TEXT,
    "captured_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Observation" ("captured_at", "context", "created_at", "id", "observation", "title", "updated_at", "why_it_matters") SELECT "captured_at", "context", "created_at", "id", "observation", "title", "updated_at", "why_it_matters" FROM "Observation";
DROP TABLE "Observation";
ALTER TABLE "new_Observation" RENAME TO "Observation";
CREATE TABLE "new_Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "team" TEXT,
    "department" TEXT,
    "manager" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Person" ("created_at", "department", "id", "manager", "name", "notes", "team", "title", "updated_at") SELECT "created_at", "department", "id", "manager", "name", "notes", "team", "title", "updated_at" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
CREATE TABLE "new_Relationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_entity_type" TEXT NOT NULL,
    "source_entity_id" TEXT NOT NULL,
    "target_entity_type" TEXT NOT NULL,
    "target_entity_id" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Relationship" ("created_at", "id", "relationship_type", "source_entity_id", "source_entity_type", "target_entity_id", "target_entity_type") SELECT "created_at", "id", "relationship_type", "source_entity_id", "source_entity_type", "target_entity_id", "target_entity_type" FROM "Relationship";
DROP TABLE "Relationship";
ALTER TABLE "new_Relationship" RENAME TO "Relationship";
CREATE INDEX "Relationship_source_entity_type_source_entity_id_idx" ON "Relationship"("source_entity_type", "source_entity_id");
CREATE INDEX "Relationship_target_entity_type_target_entity_id_idx" ON "Relationship"("target_entity_type", "target_entity_id");
CREATE TABLE "new_System" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "owner_team" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_System" ("category", "created_at", "description", "id", "name", "notes", "owner_team", "updated_at") SELECT "category", "created_at", "description", "id", "name", "notes", "owner_team", "updated_at" FROM "System";
DROP TABLE "System";
ALTER TABLE "new_System" RENAME TO "System";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
