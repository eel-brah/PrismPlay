/*
  Warnings:

  - Added the required column `name` to the `PlayerHistory` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayerHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "name" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "maxMass" REAL NOT NULL,
    "kills" INTEGER NOT NULL,
    "rank" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerHistory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlayerHistory_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PlayerHistory" ("createdAt", "durationMs", "guestId", "id", "isWinner", "kills", "maxMass", "rank", "roomId", "userId") SELECT "createdAt", "durationMs", "guestId", "id", "isWinner", "kills", "maxMass", "rank", "roomId", "userId" FROM "PlayerHistory";
DROP TABLE "PlayerHistory";
ALTER TABLE "new_PlayerHistory" RENAME TO "PlayerHistory";
CREATE INDEX "PlayerHistory_roomId_idx" ON "PlayerHistory"("roomId");
CREATE INDEX "PlayerHistory_userId_idx" ON "PlayerHistory"("userId");
CREATE INDEX "PlayerHistory_guestId_idx" ON "PlayerHistory"("guestId");
CREATE TABLE "new_Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxDurationMin" INTEGER,
    "maxPlayers" INTEGER,
    "visibility" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdById" INTEGER,
    CONSTRAINT "Room_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Room" ("createdById", "endedAt", "id", "isDefault", "maxDurationMin", "maxPlayers", "name", "startedAt", "visibility") SELECT "createdById", "endedAt", "id", "isDefault", "maxDurationMin", "maxPlayers", "name", coalesce("startedAt", CURRENT_TIMESTAMP) AS "startedAt", "visibility" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE INDEX "Room_isDefault_idx" ON "Room"("isDefault");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
