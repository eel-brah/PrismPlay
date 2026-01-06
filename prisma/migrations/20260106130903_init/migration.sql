-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxDurationMin" INTEGER,
    "maxPlayers" INTEGER,
    "visibility" BOOLEAN NOT NULL,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdById" INTEGER,
    CONSTRAINT "Room_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
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

-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "revokedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Room_isDefault_idx" ON "Room"("isDefault");

-- CreateIndex
CREATE INDEX "PlayerHistory_roomId_idx" ON "PlayerHistory"("roomId");

-- CreateIndex
CREATE INDEX "PlayerHistory_userId_idx" ON "PlayerHistory"("userId");

-- CreateIndex
CREATE INDEX "PlayerHistory_guestId_idx" ON "PlayerHistory"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_token_key" ON "RevokedToken"("token");
