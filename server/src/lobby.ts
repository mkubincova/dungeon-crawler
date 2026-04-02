import { randomUUID } from "crypto";
import type { Lobby, LobbyPlayer } from "../../shared/types.js";

export const lobbies = new Map<string, Lobby>();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  do {
    code = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while ([...lobbies.values()].some((l) => l.roomCode === code));
  return code;
}

export function createLobby(
  hostSocketId: string,
  hostName: string,
  theme: string = "dungeon"
): Lobby {
  const hostId = randomUUID();
  const lobby: Lobby = {
    id: randomUUID(),
    roomCode: generateRoomCode(),
    hostPlayerId: hostId,
    theme,
    players: [{ id: hostId, socketId: hostSocketId, name: hostName, ready: false }],
    status: "waiting",
  };
  lobbies.set(lobby.id, lobby);
  return lobby;
}

export function joinLobby(
  roomCode: string,
  socketId: string,
  playerName: string
): Lobby {
  const lobby = [...lobbies.values()].find(
    (l) => l.roomCode === roomCode.toUpperCase()
  );
  if (!lobby) throw new Error("Lobby not found");
  if (lobby.status !== "waiting") throw new Error("Game already in progress");
  if (lobby.players.length >= 4) throw new Error("Lobby is full");

  // Handle duplicate names
  let name = playerName;
  const existingNames = lobby.players.map((p) => p.name);
  if (existingNames.includes(name)) {
    let suffix = 2;
    while (existingNames.includes(`${name} (${suffix})`)) suffix++;
    name = `${name} (${suffix})`;
  }

  const newPlayer: LobbyPlayer = {
    id: randomUUID(),
    socketId,
    name,
    ready: false,
  };
  lobby.players.push(newPlayer);
  return lobby;
}

export function setReady(
  lobbyId: string,
  playerId: string,
  ready: boolean
): Lobby {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) throw new Error("Lobby not found");
  const player = lobby.players.find((p) => p.id === playerId);
  if (player) player.ready = ready;
  return lobby;
}

export function canStart(lobby: Lobby): boolean {
  return (
    lobby.players.length >= 1 && lobby.players.every((p) => p.ready)
  );
}

export function getLobbyBySocketId(socketId: string): Lobby | undefined {
  return [...lobbies.values()].find((l) =>
    l.players.some((p) => p.socketId === socketId)
  );
}

export function removePlayer(socketId: string): Lobby | null {
  const lobby = getLobbyBySocketId(socketId);
  if (!lobby) return null;

  lobby.players = lobby.players.filter((p) => p.socketId !== socketId);

  if (lobby.players.length === 0) {
    lobbies.delete(lobby.id);
    return null;
  }

  // Promote next player to host if host left
  if (!lobby.players.some((p) => p.id === lobby.hostPlayerId)) {
    lobby.hostPlayerId = lobby.players[0].id;
  }

  return lobby;
}
