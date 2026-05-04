// Custom server — Node.js + Next.js + Socket.IO

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  selectRole,
  setReady,
  canStartGame,
  startGame,
  getRoom,
  handleAction,
  getRoomForSocket,
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

    // Create a new room
    socket.on('room:create', ({ playerName }, callback) => {
      const room = createRoom(socket.id, playerName);
      socket.join(room.code);
      console.log(`[Room] Created room ${room.code} by ${playerName}`);
      callback({ success: true, roomCode: room.code, room: sanitizeRoom(room) });
    });

    // Join an existing room
    socket.on('room:join', ({ roomCode, playerName }, callback) => {
      const result = joinRoom(roomCode.toUpperCase(), socket.id, playerName);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }
      socket.join(roomCode.toUpperCase());
      console.log(`[Room] ${playerName} joined room ${roomCode}`);

      // Notify everyone in the room
      io.to(roomCode.toUpperCase()).emit('room:update', sanitizeRoom(result.room));
      callback({ success: true, roomCode: roomCode.toUpperCase(), room: sanitizeRoom(result.room) });
    });

    // Select a role
    socket.on('room:selectRole', ({ roomCode, roleId }, callback) => {
      const result = selectRole(roomCode, socket.id, roleId);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }
      io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
      callback({ success: true });
    });

    // Toggle ready
    socket.on('room:ready', ({ roomCode, ready }, callback) => {
      const result = setReady(roomCode, socket.id, ready);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }
      io.to(roomCode).emit('room:update', sanitizeRoom(result.room));
      callback({ success: true });
    });

    // Start the game
    socket.on('room:start', ({ roomCode }, callback) => {
      const room = getRoom(roomCode);
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }
      if (room.host !== socket.id) {
        callback({ success: false, error: 'Only host can start' });
        return;
      }
      if (!canStartGame(roomCode)) {
        callback({ success: false, error: 'Not all players are ready with roles' });
        return;
      }

      const result = startGame(roomCode, io);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }

      io.to(roomCode).emit('game:start', { roomCode });
      callback({ success: true });
    });

    // Handle player action during gameplay
    socket.on('game:action', ({ roomCode, actionId }, callback) => {
      const result = handleAction(roomCode, socket.id, actionId);
      if (result.error) {
        callback({ success: false, error: result.error, cooldownRemaining: result.cooldownRemaining });
        return;
      }
      callback({ success: true, cooldown: result.cooldown });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
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
    code: room.code,
    state: room.state,
    host: room.host,
    players: Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [id, {
        id: p.id,
        name: p.name,
        role: p.role,
        ready: p.ready,
      }])
    ),
  };
}
