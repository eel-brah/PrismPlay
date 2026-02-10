import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/prisma.js";

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
}
