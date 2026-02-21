import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/prisma.js";
import { getPlayerStats } from "../../server/socket/pong.js";

export default async function pongRoute(server: FastifyInstance) {
  server.get<{ Params: { playerId: string } }>(
    "/matchs/history/:playerId",
    {
      preHandler: [server.auth],
    },
    async (request, reply) => {
      const playerID = parseInt(request.params.playerId, 10);

      if (isNaN(playerID)) {
        return reply.status(400).send({ error: "Invalid player ID" });
      }

      let matches = [];
      try {
        matches = await prisma.pongMatch.findMany({
          where: {
            OR: [{ leftPlayerId: playerID }, { rightPlayerId: playerID }],
          },
          include: {
            leftPlayer: { select: { id: true, username: true } },
            rightPlayer: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2021") {
            return reply.send({ history: [] });
          }
        }
        throw err;
      }

      const history = matches.map((match) => {
        const isLeft = match.leftPlayerId === playerID;
        const opponent = isLeft ? match.rightPlayer : match.leftPlayer;
        const playerScore = isLeft ? match.leftScore : match.rightScore;
        const opponentScore = isLeft ? match.rightScore : match.leftScore;
        const isWin = match.winnerId === playerID;

        return {
          id: match.id,
          opponentName: opponent.username,
          result: isWin ? "win" : "lose",
          score: `${playerScore} - ${opponentScore}`,
          date: match.createdAt,
        };
      });

      return reply.send({ history });
    },
  );

  server.get<{ Params: { playerId: string } }>(
    "/matchs/stats/:playerId",
    {
      preHandler: [server.auth],
    },
    async (request, reply) => {
      const playerId = parseInt(request.params.playerId, 10);

      if (isNaN(playerId)) {
        return reply.status(400).send({ error: "Invalid player ID" });
      }

      let wins = 0;
      let losses = 0;
      try {
        [wins, losses] = await Promise.all([
          prisma.pongMatch.count({ where: { winnerId: playerId } }),
          prisma.pongMatch.count({
            where: {
              OR: [{ leftPlayerId: playerId }, { rightPlayerId: playerId }],
              NOT: { winnerId: playerId },
            },
          }),
        ]);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2021") {
            return reply.send({
              wins: 0,
              losses: 0,
              totalGames: 0,
              winrate: 0,
            });
          }
        }
        throw err;
      }

      const totalGames = wins + losses;
      const winrate =
        totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      return reply.send({ wins, losses, totalGames, winrate });
    },
  );

  server.get(
    "/matchs/leaderboard",
    {
      preHandler: [server.auth],
    },
    async (_request, reply) => {
      try {
        const users = await prisma.user.findMany({
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        });

        const results = await Promise.all(
          users.map(async (user) => {
            const { wins, losses, winrate } = await getPlayerStats(user.id);
            const totalGames = wins + losses;

            if (totalGames === 0) return null;

            // Total points scored & conceded
            const matches = await prisma.pongMatch.findMany({
              where: {
                OR: [
                  { leftPlayerId: user.id },
                  { rightPlayerId: user.id },
                ],
              },
              select: {
                leftPlayerId: true,
                leftScore: true,
                rightScore: true,
                winnerId: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            });

            let totalPointsScored = 0;
            let totalPointsConceded = 0;
            let currentStreak = 0;
            let bestStreak = 0;
            let streakCounted = false;

            for (const m of matches) {
              const isLeft = m.leftPlayerId === user.id;
              totalPointsScored += isLeft ? m.leftScore : m.rightScore;
              totalPointsConceded += isLeft ? m.rightScore : m.leftScore;

              const isWin = m.winnerId === user.id;

              // Current streak
              if (!streakCounted) {
                if (isWin) {
                  currentStreak++;
                } else {
                  streakCounted = true;
                }
              }
            }

            // Best streak
            let tempStreak = 0;
            for (let i = matches.length - 1; i >= 0; i--) {
              if (matches[i].winnerId === user.id) {
                tempStreak++;
                if (tempStreak > bestStreak) bestStreak = tempStreak;
              } else {
                tempStreak = 0;
              }
            }

            // Score
            const score = Math.round(wins * 10 - losses * 5 + currentStreak * 2);

            return {
              userId: user.id,
              username: user.username,
              avatarUrl: user.avatarUrl,
              wins,
              losses,
              totalGames,
              winRate: winrate,
              totalPointsScored,
              totalPointsConceded,
              currentStreak,
              bestStreak,
              score,
            };
          }),
        );

        const leaderboard = results
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .sort((a, b) => b.score - a.score);

        return reply.send(leaderboard);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2021") {
            return reply.send([]);
          }
        }
        throw err;
      }
    },
  );
}
