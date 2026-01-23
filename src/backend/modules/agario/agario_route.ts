import type { FastifyInstance } from "fastify";
import {
    listPlayerHistoryDb,
    getRoomHistoryDb,
    listRoomsHistoryDb,
    // getRoomMetaDb,
    getRoomLeaderboard
} from './agario_service.ts'


export async function agario_routes(server: FastifyInstance){
    server.get("/history/players", { preHandler: [server.auth]}, async (req) => {
        const q = req.query;
      //TODO: userId must exist
      if (!q.userId) {
        throw new Error("userId is required");
      }
        return listPlayerHistoryDb(
            Number(q.userId),
            q.take,
            q.skip
        );
    });
    server.get("/history/rooms/:roomId", {preHandler: [server.auth]}, async (req, res) => {
        const {roomId} = req.params as any;
        const room = await getRoomHistoryDb(Number(roomId));
        if (!room) 
            return res.code(404).send({message: "Room Not Found"});
        return room;
    });
    server.get("/history/rooms", {preHandler: [server.auth]}, async (req, res) => {
        const q = req.query as any;
        return listRoomsHistoryDb({
            take: q.take,
            skip: q.skip,
            onlyEnded: q.onlyEnded
        });
    });
    server.get("/history/rooms/:roomId/leaderboard", {preHandler: [server.auth]}, async (req, reply) => {
        const params = req.params as { roomId: string };
        const roomId = Number(params.roomId);

        if (!Number.isFinite(roomId))
            return reply.code(400).send({ error: "Invalid roomId" });

        const room = await getRoomHistoryDb(roomId);

        if (!room)
            return reply.code(404).send({ error: "Room not found" });

        const leaderboard = await getRoomLeaderboard(roomId);

        return reply.send({
        room,
        leaderboard,
        });
  });
}
