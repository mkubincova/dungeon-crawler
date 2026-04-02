import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/types.js";

const API_URL = (import.meta.env.VITE_API_URL as string) || "";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  API_URL,
  { autoConnect: false }
);
