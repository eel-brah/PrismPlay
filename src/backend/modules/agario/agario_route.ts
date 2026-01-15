import type { FastifyInstance } from "fastify";
import {
    listPlayerHistoryDb,
    getRoomHistoryDb,
    listRoomsHistoryDb
} from './agario_service.ts'


export async function agario_routes(server: FastifyInstance){
    server.get("/history/players", { preHandler: [server.auth]}, async (req) => {
        const q = req.query;
        return listPlayerHistoryDb({
            userId :q.userId ? Number(q.userId) : undefined,
            guestId: q.guestId,
            take: q.take,
            skip: q.skip
        });
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
}