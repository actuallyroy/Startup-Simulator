// Room manager — handles room creation, player join/leave, lifecycle

import { GAME_CONFIG, ROLES, ROOM_STATES } from '../lib/gameConfig.js';
import { GameEngine } from './gameEngine.js';

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < GAME_CONFIG.ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(hostSocketId, hostName) {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room = {
    code,
    state: ROOM_STATES.LOBBY,
    host: hostSocketId,
    players: {},
    engine: null,
    createdAt: Date.now(),
  };

  room.players[hostSocketId] = {
    id: hostSocketId,
    name: hostName,
    role: null,
    ready: false,
    actionsUsed: 0,
    cooldowns: {},
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(roomCode, socketId, playerName) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.state !== ROOM_STATES.LOBBY) return { error: 'Game already in progress' };
  if (Object.keys(room.players).length >= GAME_CONFIG.MAX_PLAYERS) return { error: 'Room is full' };

  room.players[socketId] = {
    id: socketId,
    name: playerName,
    role: null,
    ready: false,
    actionsUsed: 0,
    cooldowns: {},
  };

  return { room };
}

export function leaveRoom(roomCode, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return;

  delete room.players[socketId];

  // If room is empty, destroy it
  if (Object.keys(room.players).length === 0) {
    if (room.engine) room.engine.stop();
    rooms.delete(roomCode);
    return { destroyed: true };
  }

  // If host left, assign new host
  if (room.host === socketId) {
    room.host = Object.keys(room.players)[0];
  }

  return { room };
}

export function selectRole(roomCode, socketId, roleId) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };

  // Check if role is already taken
  const roleTaken = Object.values(room.players).some(
    p => p.id !== socketId && p.role === roleId
  );
  if (roleTaken) return { error: 'Role already taken' };

  // Validate role exists
  const validRoles = Object.values(ROLES).map(r => r.id);
  if (!validRoles.includes(roleId)) return { error: 'Invalid role' };

  room.players[socketId].role = roleId;
  return { room };
}

export function setReady(roomCode, socketId, ready) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };

  room.players[socketId].ready = ready;
  return { room };
}

export function canStartGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return false;

  const players = Object.values(room.players);
  // Need at least 1 player, all must have roles and be ready
  return players.length >= 1 &&
    players.every(p => p.role && p.ready);
}

export function startGame(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };

  room.state = ROOM_STATES.PLAYING;

  // Create and start game engine
  room.engine = new GameEngine(room, io);
  room.engine.start();

  return { room };
}

export function getRoom(roomCode) {
  return rooms.get(roomCode);
}

export function handleAction(roomCode, socketId, actionId) {
  const room = rooms.get(roomCode);
  if (!room || !room.engine) return { error: 'No active game' };
  if (room.state !== ROOM_STATES.PLAYING) return { error: 'Game not in progress' };

  return room.engine.handlePlayerAction(socketId, actionId);
}

export function getRoomForSocket(socketId) {
  for (const [code, room] of rooms) {
    if (room.players[socketId]) {
      return code;
    }
  }
  return null;
}

export function endGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.state = ROOM_STATES.DONE;
  if (room.engine) {
    room.engine.stop();
  }
}
