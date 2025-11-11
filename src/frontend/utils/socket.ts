import { io } from "socket.io-client";

export const socket = io("https://localhost:9443", {
  autoConnect: true,
  reconnection: true,
  transports: ["websocket"],
});

export default socket;
