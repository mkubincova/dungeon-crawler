import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/types.js";
import routes from "./routes.js";
import { registerSocketHandlers } from "./socket-handlers.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : "*",
  })
);
app.use(express.json());
app.use("/api", routes);

const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: "*" },
});

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Dungeon Crawler server running on http://localhost:${PORT}`);
});
