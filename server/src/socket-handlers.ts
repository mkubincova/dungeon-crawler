import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameState,
  DMContext,
} from "../../shared/types.js";
import {
  createLobby,
  joinLobby,
  setReady,
  canStart,
  getLobbyBySocketId,
  removePlayer,
} from "./lobby.js";
import {
  createGame,
  getGame,
  getActivePlayer,
  advanceTurn,
  applyEffects,
  movePlayer,
  checkObjectives,
  checkEndConditions,
} from "./game.js";
import { getRoom } from "./dungeon.js";
import { assignObjectives } from "./objectives.js";
import { calculateScores } from "./scoring.js";
import { MockDungeonMaster, type DungeonMaster } from "./ai.js";
import { LLMDungeonMaster } from "./llm-dm.js";
import { isLLMConfigured } from "./config.js";
import { sanitizeActions } from "./routes.js";

const dm: DungeonMaster = isLLMConfigured()
  ? new LLMDungeonMaster()
  : new MockDungeonMaster();
console.log(`DM mode: ${isLLMConfigured() ? "LLM" : "Mock"}`);

// gameId → turn timeout
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
// lobbyId → gameId
const gameIdByLobbyId = new Map<string, string>();

function clearTurnTimer(gameId: string): void {
  const t = turnTimers.get(gameId);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(gameId);
  }
}

/** Return a copy of state with other players' objectives nulled out */
function scrubState(state: GameState, forPlayerId?: string): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      objective: p.id === forPlayerId ? p.objective : null,
    })),
  };
}

function buildContext(
  state: GameState,
  playerId: string,
  note: string
): DMContext {
  const player = state.players.find((p) => p.id === playerId)!;
  const room = getRoom(state.theme, player.currentRoomId);
  const othersInRoom = state.players.filter(
    (p) => p.currentRoomId === player.currentRoomId && p.id !== playerId && p.status === "alive"
  );
  return {
    themeId: state.theme,
    roomId: room.id,
    roomTag: room.tag,
    roomName: room.name,
    roomDescription: room.description,
    playerName: player.name,
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    inventory: [...player.inventory],
    allPlayers: state.players.map((p) => ({
      name: p.name,
      hp: p.hp,
      maxHp: p.maxHp,
      currentRoomId: p.currentRoomId,
      status: p.status,
    })),
    playersInSameRoom: othersInRoom.map((p) => p.name),
    flags: { ...state.sharedFlags },
    visitedRooms: [...state.globalVisitedRooms],
    note,
  };
}

function scheduleTurnTimeout(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  gameId: string,
  roomCode: string
): void {
  clearTurnTimer(gameId);
  const timer = setTimeout(async () => {
    const state = getGame(gameId);
    if (!state || state.status !== "playing") return;

    const active = getActivePlayer(state);
    const skipNarration = `${active.name} hesitates too long... the moment passes.`;
    state.turnLog.push({
      playerId: active.id,
      playerName: active.name,
      roomId: active.currentRoomId,
      narration: skipNarration,
    });

    const nextPlayerId = advanceTurn(state);

    if (state.status !== "playing") {
      const scores = calculateScores(state);
      io.to(roomCode).emit("game:update", {
        gameState: scrubState(state),
        narration: skipNarration,
      });
      io.to(roomCode).emit("game:ended", { gameState: state, scores });
      return;
    }

    io.to(roomCode).emit("game:update", {
      gameState: scrubState(state),
      narration: skipNarration,
    });

    const nextPlayer = state.players.find((p) => p.id === nextPlayerId)!;
    const ctx = buildContext(state, nextPlayerId, "It's your turn.");
    const dmResponse = await dm.enterRoom(ctx);
    const actions = sanitizeActions(dmResponse.actions, nextPlayer.inventory);

    io.to(nextPlayer.socketId).emit("game:turn", {
      activePlayerId: nextPlayerId,
      deadline: state.turnDeadline,
      actions,
    });

    scheduleTurnTimeout(io, gameId, roomCode);
  }, 45000);
  turnTimers.set(gameId, timer);
}

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  io.on(
    "connection",
    (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      // ── Lobby Events ──

      socket.on("lobby:create", ({ playerName, theme }) => {
        try {
          const lobby = createLobby(socket.id, playerName, theme);
          const hostPlayer = lobby.players[0];
          void socket.join(lobby.roomCode);
          socket.emit("lobby:created", {
            lobby,
            playerId: hostPlayer.id,
          });
        } catch (err) {
          socket.emit("lobby:error", {
            message: err instanceof Error ? err.message : "Failed to create lobby",
          });
        }
      });

      socket.on("lobby:join", ({ roomCode, playerName }) => {
        try {
          const lobby = joinLobby(roomCode, socket.id, playerName);
          const joinedPlayer = lobby.players.find((p) => p.socketId === socket.id)!;
          void socket.join(lobby.roomCode);
          socket.emit("lobby:created", {
            lobby,
            playerId: joinedPlayer.id,
          });
          io.to(lobby.roomCode).emit("lobby:updated", { lobby });
        } catch (err) {
          socket.emit("lobby:error", {
            message: err instanceof Error ? err.message : "Failed to join lobby",
          });
        }
      });

      socket.on("lobby:ready", () => {
        const lobby = getLobbyBySocketId(socket.id);
        if (!lobby) return;
        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (!player) return;
        const updated = setReady(lobby.id, player.id, !player.ready);
        io.to(updated.roomCode).emit("lobby:updated", { lobby: updated });
      });

      socket.on("lobby:start", async () => {
        const lobby = getLobbyBySocketId(socket.id);
        if (!lobby) return;

        const hostPlayer = lobby.players.find((p) => p.socketId === socket.id);
        if (!hostPlayer || hostPlayer.id !== lobby.hostPlayerId) {
          socket.emit("lobby:error", { message: "Only the host can start the game" });
          return;
        }

        if (!canStart(lobby)) {
          socket.emit("lobby:error", { message: "Not all players are ready" });
          return;
        }

        lobby.status = "in-progress";
        const objectives = assignObjectives(lobby.players.length);
        const state = createGame(lobby, objectives);
        gameIdByLobbyId.set(lobby.id, state.id);

        // Get initial narration for first player
        const firstPlayer = getActivePlayer(state);
        const ctx = buildContext(state, firstPlayer.id, "The adventure begins.");
        const dmResponse = await dm.enterRoom(ctx);
        const initialNarration = dmResponse.narration;

        if (dmResponse.effects) {
          applyEffects(state, firstPlayer.id, dmResponse.effects);
        }

        state.turnLog.push({
          playerId: firstPlayer.id,
          playerName: firstPlayer.name,
          roomId: firstPlayer.currentRoomId,
          narration: initialNarration,
        });

        // Targeted game:started to each player (with their objective)
        for (const player of state.players) {
          io.to(player.socketId).emit("game:started", {
            gameState: scrubState(state, player.id),
            narration: initialNarration,
            playerId: player.id,
          });
        }

        const firstActions = sanitizeActions(dmResponse.actions, firstPlayer.inventory);
        io.to(firstPlayer.socketId).emit("game:turn", {
          activePlayerId: firstPlayer.id,
          deadline: state.turnDeadline,
          actions: firstActions,
        });

        scheduleTurnTimeout(io, state.id, lobby.roomCode);
      });

      // ── Game Events ──

      socket.on("game:action", async ({ actionId }) => {
        const lobby = getLobbyBySocketId(socket.id);
        if (!lobby) return;

        const gameId = gameIdByLobbyId.get(lobby.id);
        if (!gameId) return;

        const state = getGame(gameId);
        if (!state || state.status !== "playing") return;

        const activePlayer = getActivePlayer(state);
        if (activePlayer.socketId !== socket.id) return;

        clearTurnTimer(gameId);

        let narration: string;

        if (actionId.startsWith("move:")) {
          const targetRoomId = actionId.slice(5);
          const fromRoom = getRoom(state.theme, activePlayer.currentRoomId);
          if (!fromRoom.neighbors.includes(targetRoomId)) {
            socket.emit("lobby:error", { message: "Cannot move to that room" });
            scheduleTurnTimeout(io, gameId, lobby.roomCode);
            return;
          }

          movePlayer(state, activePlayer.id, targetRoomId);
          const ctx = buildContext(
            state,
            activePlayer.id,
            `${activePlayer.name} has just entered this room from ${fromRoom.name}.`
          );
          const dmResponse = await dm.enterRoom(ctx);
          narration = dmResponse.narration;
          if (dmResponse.effects) {
            applyEffects(state, activePlayer.id, dmResponse.effects);
          }
          state.turnLog.push({
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            roomId: activePlayer.currentRoomId,
            narration,
            chosenAction: actionId,
          });
        } else if (actionId === "use_healing_potion") {
          if (!activePlayer.inventory.includes("healing_potion")) {
            socket.emit("lobby:error", { message: "No healing potion in inventory" });
            scheduleTurnTimeout(io, gameId, lobby.roomCode);
            return;
          }
          applyEffects(state, activePlayer.id, {
            hpChange: 2,
            removeItems: ["healing_potion"],
          });
          narration = `${activePlayer.name} uses the healing potion. It takes the edge off. (+2 HP)`;
          state.turnLog.push({
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            roomId: activePlayer.currentRoomId,
            narration,
            chosenAction: actionId,
          });
        } else {
          const ctx = buildContext(state, activePlayer.id, `The player chose: "${actionId}".`);
          const dmResponse = await dm.handleAction(ctx, actionId);
          narration = dmResponse.narration;

          state.turnLog.push({
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            roomId: activePlayer.currentRoomId,
            narration,
            chosenAction: actionId,
          });

          if (dmResponse.effects) {
            applyEffects(state, activePlayer.id, dmResponse.effects);
          }

          if (dmResponse.effects?.moveToRoom) {
            const newCtx = buildContext(
              state,
              activePlayer.id,
              `${activePlayer.name} has just arrived from a nearby area.`
            );
            const entryResponse = await dm.enterRoom(newCtx);
            narration += "\n\n" + entryResponse.narration;
            state.turnLog.push({
              playerId: activePlayer.id,
              playerName: activePlayer.name,
              roomId: activePlayer.currentRoomId,
              narration: entryResponse.narration,
            });
            if (entryResponse.effects) {
              applyEffects(state, activePlayer.id, entryResponse.effects);
            }
          }
        }

        checkObjectives(state);
        checkEndConditions(state);

        if (state.status !== "playing") {
          const scores = calculateScores(state);
          io.to(lobby.roomCode).emit("game:update", {
            gameState: scrubState(state),
            narration,
          });
          io.to(lobby.roomCode).emit("game:ended", { gameState: state, scores });
          return;
        }

        const nextPlayerId = advanceTurn(state);

        io.to(lobby.roomCode).emit("game:update", {
          gameState: scrubState(state),
          narration,
        });

        const nextPlayer = state.players.find((p) => p.id === nextPlayerId)!;
        const nextCtx = buildContext(state, nextPlayerId, "It's your turn.");
        const nextDmResponse = await dm.enterRoom(nextCtx);
        const nextActions = sanitizeActions(
          nextDmResponse.actions,
          nextPlayer.inventory
        );

        io.to(nextPlayer.socketId).emit("game:turn", {
          activePlayerId: nextPlayerId,
          deadline: state.turnDeadline,
          actions: nextActions,
        });

        scheduleTurnTimeout(io, gameId, lobby.roomCode);
      });

      // ── Disconnect Handling ──

      socket.on("disconnect", () => {
        const lobby = getLobbyBySocketId(socket.id);
        if (!lobby) return;

        const gameId = gameIdByLobbyId.get(lobby.id);

        if (gameId) {
          // Mid-game disconnect: mark player dead
          const state = getGame(gameId);
          if (state && state.status === "playing") {
            const disconnectedPlayer = state.players.find(
              (p) => p.socketId === socket.id
            );
            if (disconnectedPlayer) {
              disconnectedPlayer.status = "dead";
              const wasActiveTurn = getActivePlayer(state).socketId === socket.id;

              io.to(lobby.roomCode).emit("game:player:eliminated", {
                playerId: disconnectedPlayer.id,
                playerName: disconnectedPlayer.name,
              });

              checkEndConditions(state);
              if (state.status !== "playing") {
                const scores = calculateScores(state);
                io.to(lobby.roomCode).emit("game:update", {
                  gameState: scrubState(state),
                  narration: `${disconnectedPlayer.name} has disconnected.`,
                });
                io.to(lobby.roomCode).emit("game:ended", {
                  gameState: state,
                  scores,
                });
                clearTurnTimer(gameId);
                return;
              }

              if (wasActiveTurn) {
                clearTurnTimer(gameId);
                const nextPlayerId = advanceTurn(state);
                io.to(lobby.roomCode).emit("game:update", {
                  gameState: scrubState(state),
                  narration: `${disconnectedPlayer.name} has disconnected.`,
                });

                const nextPlayer = state.players.find((p) => p.id === nextPlayerId)!;
                void (async () => {
                  const ctx = buildContext(state, nextPlayerId, "It's your turn.");
                  const dmResponse = await dm.enterRoom(ctx);
                  const actions = sanitizeActions(dmResponse.actions, nextPlayer.inventory);
                  io.to(nextPlayer.socketId).emit("game:turn", {
                    activePlayerId: nextPlayerId,
                    deadline: state.turnDeadline,
                    actions,
                  });
                  scheduleTurnTimeout(io, gameId, lobby.roomCode);
                })();
              }
            }
          }
        } else {
          // Lobby disconnect
          const updated = removePlayer(socket.id);
          if (updated) {
            io.to(updated.roomCode).emit("lobby:updated", { lobby: updated });
          }
        }
      });
    }
  );
}
