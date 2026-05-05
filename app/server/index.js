// Custom server — Node.js + Next.js + Socket.IO with all game systems

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import {
  createRoom, joinRoom, leaveRoom, selectRole, setReady,
  canStartGame, startGame, getRoom, handleAction, getRoomForSocket,
  setAvatar, setBotsEnabled, addBotsForEmptyRoles, setGameType, setSalary, resetRoom,
} from './roomManager.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Room Management ──
    socket.on('room:create', ({ playerName }, cb) => {
      const room = createRoom(socket.id, playerName);
      socket.join(room.code);
      cb({ success: true, roomCode: room.code, room: sanitizeRoom(room) });
    });

    socket.on('room:join', ({ roomCode, playerName }, cb) => {
      const code = roomCode.toUpperCase();
      const result = joinRoom(code, socket.id, playerName);
      if (result.error) return cb({ success: false, error: result.error });
      socket.join(code);
      io.to(code).emit('room:update', sanitizeRoom(result.room));
      // Mid-game: jump them straight into the playing screen with a fresh
      // state push so the HUD/world appear immediately.
      if (result.midGame) {
        socket.emit('game:start', { roomCode: code });
        if (result.room.engine) result.room.engine.broadcastState();
      }
      cb({ success: true, roomCode: code, room: sanitizeRoom(result.room), midGame: !!result.midGame });
    });

    socket.on('room:selectRole', ({ roomCode, roleId }, cb) => {
      const result = selectRole(roomCode, socket.id, roleId);
      if (result.error) return cb({ success: false, error: result.error });
      io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
      cb({ success: true });
    });

    socket.on('room:setGameType', ({ roomCode, gameType, gameSubtype }, cb) => {
      const result = setGameType(roomCode, socket.id, gameType, gameSubtype);
      if (result.error) return cb && cb({ success: false, error: result.error });
      io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
      cb && cb({ success: true });
    });

    socket.on('game:setSalary', ({ roomCode, targetPlayerId, salary }, cb) => {
      const result = setSalary(roomCode, socket.id, targetPlayerId, salary);
      if (result.error) return cb && cb({ success: false, error: result.error });
      // Broadcast updated room (so non-game roster also reflects it) and bump engine state.
      const room = getRoom(roomCode);
      if (room?.engine) room.engine.broadcastState();
      cb && cb({ success: true });
    });

    socket.on('room:setBots', ({ roomCode, enabled }, cb) => {
      const result = setBotsEnabled(roomCode, socket.id, enabled);
      if (result.error) return cb && cb({ success: false, error: result.error });
      io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
      cb && cb({ success: true });
    });

    socket.on('room:setAvatar', ({ roomCode, avatar }, cb) => {
      const result = setAvatar(roomCode, socket.id, avatar);
      if (result.error) return cb && cb({ success: false, error: result.error });
      io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
      cb && cb({ success: true });
    });

    socket.on('room:ready', ({ roomCode, ready }, cb) => {
      const result = setReady(roomCode, socket.id, ready);
      if (result.error) return cb({ success: false, error: result.error });
      io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
      cb({ success: true });
    });

    socket.on('room:playAgain', ({ roomCode }, cb) => {
      const result = resetRoom(roomCode, socket.id);
      if (result.error) return cb && cb({ success: false, error: result.error });
      io.to(roomCode).emit('game:reset', { roomCode });
      io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
      cb && cb({ success: true });
    });

    socket.on('room:start', ({ roomCode }, cb) => {
      const room = getRoom(roomCode);
      if (!room) return cb({ success: false, error: 'Room not found' });
      if (room.host !== socket.id) return cb({ success: false, error: 'Only host can start' });
      if (!canStartGame(roomCode)) return cb({ success: false, error: 'Not all players ready with roles' });
      if (room.botsEnabled) {
        addBotsForEmptyRoles(roomCode);
        io.to(roomCode).emit('room:update', sanitizeRoom(room));
      }
      const result = startGame(roomCode, io);
      if (result.error) return cb({ success: false, error: result.error });
      io.to(roomCode).emit('game:start', { roomCode });
      cb({ success: true });
    });

    // ── Gameplay Actions ──
    socket.on('game:action', ({ roomCode, actionId }, cb) => {
      const result = handleAction(roomCode, socket.id, actionId);
      if (result.error) return cb({ success: false, error: result.error, cooldownRemaining: result.cooldownRemaining });
      cb({ success: true, cooldown: result.cooldown, hasRoleBonus: result.hasRoleBonus });
    });

    // ── Event Response ──
    socket.on('game:respondEvent', ({ roomCode, eventId }, cb) => {
      const room = getRoom(roomCode);
      if (!room?.engine) return cb({ success: false, error: 'No active game' });
      const result = room.engine.handleEventResponse(socket.id, eventId);
      if (result.error) return cb({ success: false, error: result.error });
      cb({ success: true });
    });

    // ── Upgrades ──
    socket.on('game:upgrade', ({ roomCode, upgradeId }, cb) => {
      const room = getRoom(roomCode);
      if (!room?.engine) return cb({ success: false, error: 'No active game' });
      const result = room.engine.handleUpgrade(socket.id, upgradeId);
      if (result.error) return cb({ success: false, error: result.error, needed: result.needed });
      cb({ success: true });
    });

    // ── Task Delegation ──
    socket.on('game:delegate', ({ roomCode, toPlayerId, actionId }, cb) => {
      const room = getRoom(roomCode);
      if (!room?.engine) return cb({ success: false, error: 'No active game' });
      const result = room.engine.handleDelegation(socket.id, toPlayerId, actionId);
      if (result.error) return cb({ success: false, error: result.error });
      cb({ success: true, delegationId: result.delegationId });
    });

    socket.on('game:delegationResponse', ({ roomCode, delegationId, accepted }, cb) => {
      const room = getRoom(roomCode);
      if (!room?.engine) return cb({ success: false, error: 'No active game' });
      const result = room.engine.handleDelegationResponse(socket.id, delegationId, accepted);
      if (result.error) return cb({ success: false, error: result.error });
      cb({ success: true });
    });

    // ── Player Movement ──
    socket.on('game:move', ({ roomCode, position }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      const player = room.players[socket.id];
      if (player) {
        player.position = position;
        // Broadcast movement to others
        socket.to(roomCode).emit('game:playerMoved', {
          playerId: socket.id, position,
        });
      }
    });

    // ── Chat Bubble ──
    socket.on('game:chatBubble', ({ roomCode, message }) => {
      io.to(roomCode).emit('game:chatBubble', {
        playerId: socket.id,
        playerName: getRoom(roomCode)?.players[socket.id]?.name || '?',
        message,
      });
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      const roomCode = getRoomForSocket(socket.id);
      if (roomCode) {
        const result = leaveRoom(roomCode, socket.id);
        if (result && !result.destroyed) {
          io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
          io.to(roomCode).emit('room:playerLeft', { playerId: socket.id });
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║    🚀 Startup Simulator is running!      ║
  ║    http://${hostname}:${port}                  ║
  ╚══════════════════════════════════════════╝
    `);
  });
});

function sanitizeRoom(room) {
  return {
    code: room.code, state: room.state, host: room.host,
    botsEnabled: !!room.botsEnabled,
    gameType: room.gameType || 'product',
    gameSubtype: room.gameSubtype || 'saas',
    players: Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [id, {
        id: p.id, name: p.name, role: p.role, ready: p.ready,
        avatar: p.avatar, isBot: !!p.isBot,
      }])
    ),
  };
}
