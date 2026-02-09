import { PrismaClient } from "@prisma/client";
import server from "../server/server";

const prisma = new PrismaClient();

server.addHook('onClose', async () => {
  await prisma.$disconnect();
});

export default prisma;
