-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chatId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatId", "content", "id", "senderId") SELECT "chatId", "content", "id", "senderId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE TABLE "new_PlayerHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_PlayerHistory" ("createdAt", "durationMs", "guestId", "id", "isWinner", "kills", "maxMass", "name", "rank", "roomId", "userId") SELECT "createdAt", "durationMs", "guestId", "id", "isWinner", "kills", "maxMass", "name", "rank", "roomId", "userId" FROM "PlayerHistory";
DROP TABLE "PlayerHistory";
ALTER TABLE "new_PlayerHistory" RENAME TO "PlayerHistory";
CREATE INDEX "PlayerHistory_roomId_idx" ON "PlayerHistory"("roomId");
CREATE INDEX "PlayerHistory_userId_idx" ON "PlayerHistory"("userId");
CREATE INDEX "PlayerHistory_guestId_idx" ON "PlayerHistory"("guestId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT DEFAULT '/uploads/avatars/dz.jpg',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "email", "id", "lastLogin", "passwordHash", "username") SELECT "avatarUrl", "createdAt", "email", "id", "lastLogin", "passwordHash", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
