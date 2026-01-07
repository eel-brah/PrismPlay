-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxDurationMin" INTEGER,
    "maxPlayers" INTEGER,
    "visibility" TEXT NOT NULL,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdById" INTEGER,
    CONSTRAINT "Room_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Room" ("createdById", "endedAt", "id", "isDefault", "maxDurationMin", "maxPlayers", "name", "startedAt", "visibility") SELECT "createdById", "endedAt", "id", "isDefault", "maxDurationMin", "maxPlayers", "name", "startedAt", "visibility" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE INDEX "Room_isDefault_idx" ON "Room"("isDefault");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
