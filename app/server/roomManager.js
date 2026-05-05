// Room manager — handles room creation, player join/leave, lifecycle

import { GAME_CONFIG, ROLES, ROOM_STATES } from '../lib/gameConfig.js';
import { GameEngine } from './gameEngine.js';
import { randomAvatar, sanitizeAvatar } from '../lib/avatarConfig.js';

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
    botsEnabled: false,
    gameType: 'product',
    gameSubtype: 'saas',
  };

  room.players[hostSocketId] = {
    id: hostSocketId,
    name: hostName,
    role: null,
    ready: false,
    actionsUsed: 0,
    busyUntil: 0,
    busyAction: null,
    busyTotal: 0,
    avatar: randomAvatar(),
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(roomCode, socketId, playerName) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };

  // If the room is full, evict the first bot to make space. Real players
  // are never kicked — they still block a join.
  if (Object.keys(room.players).length >= GAME_CONFIG.MAX_PLAYERS) {
    const botEntry = Object.entries(room.players).find(([, p]) => p.isBot);
    if (!botEntry) return { error: 'Room is full' };
    delete room.players[botEntry[0]];
  }

  const midGame = room.state !== ROOM_STATES.LOBBY;

  // Mid-game joiners auto-pick a free role and start ready so they can act.
  let assignedRole = null;
  if (midGame) {
    const allRoles = Object.values(ROLES).map(r => r.id);
    const taken = new Set(Object.values(room.players).map(p => p.role).filter(Boolean));
    assignedRole = allRoles.find(r => !taken.has(r)) || null;
  }

  room.players[socketId] = {
    id: socketId,
    name: playerName,
    role: assignedRole,
    ready: midGame,
    actionsUsed: 0,
    busyUntil: 0,
    busyAction: null,
    busyTotal: 0,
    avatar: randomAvatar(),
  };

  // Give them a desk position immediately if joining mid-game so they don't
  // briefly render at (0,0) before the next broadcast.
  if (midGame) {
    const desks = [
      { x: 80, y: 220 }, { x: 200, y: 220 }, { x: 320, y: 220 },
      { x: 80, y: 280 }, { x: 200, y: 280 },
    ];
    const idx = Object.keys(room.players).indexOf(socketId);
    room.players[socketId].position = { ...(desks[idx] || desks[0]) };
  }

  return { room, midGame };
}

export function setAvatar(roomCode, socketId, avatar) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (!room.players[socketId]) return { error: 'Player not in room' };
  room.players[socketId].avatar = sanitizeAvatar(avatar);
  return { room };
}

export function setGameType(roomCode, socketId, gameType, gameSubtype) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.host !== socketId) return { error: 'Only host can set game type' };
  const types = ['product', 'service'];
  if (!types.includes(gameType)) return { error: 'Invalid game type' };
  room.gameType = gameType;
  if (gameSubtype) room.gameSubtype = gameSubtype;
  return { room };
}

export function setBotsEnabled(roomCode, socketId, enabled) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.host !== socketId) return { error: 'Only host can toggle bots' };
  room.botsEnabled = !!enabled;
  return { room };
}

const BOT_NAMES = {
  backend: ['Byte', 'Sudo', 'Cron'],
  frontend: ['Pixel', 'Hexa', 'Neo'],
  devops: ['Kube', 'Echo', 'Daemon'],
  pm: ['Sprint', 'Roadmap', 'OKR'],
  chaos: ['Glitch', 'Anarchy', 'Havoc'],
};

function pickBotName(role, taken) {
  const pool = BOT_NAMES[role] || ['Bot'];
  for (const n of pool) if (!taken.has(n)) return n;
  return `${pool[0]}-${Math.floor(Math.random() * 100)}`;
}

export function addBotsForEmptyRoles(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  const allRoles = Object.values(ROLES).map(r => r.id);
  const takenRoles = new Set(Object.values(room.players).map(p => p.role).filter(Boolean));
  const takenNames = new Set(Object.values(room.players).map(p => p.name));
  let added = 0;
  for (const role of allRoles) {
    if (takenRoles.has(role)) continue;
    if (Object.keys(room.players).length >= GAME_CONFIG.MAX_PLAYERS) break;
    const id = `bot-${role}-${Math.random().toString(36).slice(2, 8)}`;
    const name = pickBotName(role, takenNames);
    takenNames.add(name);
    room.players[id] = {
      id, name, role, ready: true,
      actionsUsed: 0, busyUntil: 0, busyAction: null, busyTotal: 0,
      avatar: randomAvatar(),
      isBot: true,
    };
    added++;
  }
  return { room, added };
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
  if (!room.players[socketId]) return { error: 'Player not in room' };

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
  if (!room.players[socketId]) return { error: 'Player not in room' };

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
