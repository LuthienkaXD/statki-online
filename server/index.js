const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { GameRoom } = require('./gameRoom');
const {
  getUserByUsername,
  createUser,
  getUserById,
  getDailyLeaderboard,
  getAllTimeLeaderboard,
  getRecentMatches
} = require('./db');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  authMiddleware
} = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory active game rooms
const activeRooms = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ---------------- REST API ----------------

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Nazwa użytkownika musi mieć min. 3 znaki.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Hasło musi mieć min. 4 znaki.' });
  }

  const existing = getUserByUsername(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'Użytkownik o takiej nazwie już istnieje.' });
  }

  const user = createUser(username.trim(), hashPassword(password));
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses } });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Podaj login i hasło.' });
  }

  const user = getUserByUsername(username.trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(400).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      wins: user.wins,
      losses: user.losses,
      hits: user.hits,
      shots: user.shots
    }
  });
});

// Current user profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const recent = getRecentMatches(req.user.id, 5);
  res.json({ user: req.user, recentMatches: recent });
});

// Daily leaderboard
app.get('/api/leaderboard/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const leaderboard = getDailyLeaderboard(date);
  res.json({ date, leaderboard });
});

// All-time leaderboard
app.get('/api/leaderboard/all-time', (req, res) => {
  const leaderboard = getAllTimeLeaderboard();
  res.json({ leaderboard });
});

// Check if room exists
app.get('/api/rooms/:id', (req, res) => {
  const room = activeRooms.get(req.params.id.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Pokój nie istnieje' });
  }
  res.json({
    id: room.id,
    status: room.status,
    isBotGame: room.isBotGame,
    p1Name: room.players.p1?.name,
    p2Name: room.players.p2?.name
  });
});

// Active multiplayer rooms list (max 2 players per room)
function getLobbyRooms() {
  const rooms = [];
  for (const [id, room] of activeRooms.entries()) {
    if (room.isBotGame) continue;
    const p1 = room.players.p1;
    const p2 = room.players.p2;
    const count = (p1 ? 1 : 0) + (p2 ? 1 : 0);
    if (count === 0) continue;

    rooms.push({
      id: room.id,
      hostName: p1 ? p1.name : 'Kapitan',
      playerCount: count,
      maxPlayers: 2,
      status: room.status,
      canJoin: count < 2 && (room.status === 'waiting' || room.status === 'placement'),
      createdAt: room.createdAt
    });
  }
  rooms.sort((a, b) => {
    if (a.canJoin && !b.canJoin) return -1;
    if (!a.canJoin && b.canJoin) return 1;
    return b.createdAt - a.createdAt;
  });
  return rooms;
}

function broadcastLobbyRooms() {
  io.emit('rooms_update', getLobbyRooms());
}

// GET /api/rooms - returns all active multiplayer rooms
app.get('/api/rooms', (req, res) => {
  res.json({ rooms: getLobbyRooms() });
});

// Serve frontend build when available
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ---------------- Socket.IO Multiplayer ----------------

function broadcastRoomState(room) {
  if (!room) return;

  if (room.players.p1 && room.players.p1.socketId) {
    io.to(room.players.p1.socketId).emit('room_update', room.getClientState('p1'));
  }
  if (room.players.p2 && room.players.p2.socketId && !room.players.p2.isBot) {
    io.to(room.players.p2.socketId).emit('room_update', room.getClientState('p2'));
  }
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerKey = null;

  // Request rooms list
  socket.on('request_rooms', () => {
    socket.emit('rooms_update', getLobbyRooms());
  });

  // Create Room
  socket.on('create_room', ({ isBot = false, user = null }) => {
    let roomId = generateRoomId();
    while (activeRooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room = new GameRoom(roomId, isBot);
    playerKey = room.join(socket.id, user);
    currentRoomId = roomId;
    activeRooms.set(roomId, room);
    socket.join(roomId);

    socket.emit('room_created', { roomId, playerKey, state: room.getClientState(playerKey) });
    broadcastRoomState(room);
    broadcastLobbyRooms();
  });

  // Join Room
  socket.on('join_room', ({ roomId, user = null }) => {
    const cleanId = String(roomId).trim().toUpperCase();
    const room = activeRooms.get(cleanId);

    if (!room) {
      socket.emit('join_error', { message: 'Pokój o podanym kodzie nie istnieje.' });
      return;
    }

    playerKey = room.join(socket.id, user);
    if (!playerKey) {
      socket.emit('join_error', { message: 'Pokój jest już pełny (maksymalnie 2 graczy).' });
      return;
    }

    currentRoomId = cleanId;
    socket.join(cleanId);

    socket.emit('room_joined', { roomId: cleanId, playerKey, state: room.getClientState(playerKey) });
    broadcastRoomState(room);
    broadcastLobbyRooms();
  });

  // Place Ships & Set Ready
  socket.on('set_ships', ({ ships, color }) => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    const res = room.setPlayerShips(playerKey, ships, color);
    if (!res.valid) {
      socket.emit('placement_error', { message: res.reason });
      return;
    }

    broadcastRoomState(room);
  });

  // Fire Shot
  socket.on('fire_shot', ({ r, c }) => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    const result = room.makeShot(playerKey, r, c);
    if (result.error) {
      socket.emit('shot_error', { message: result.error });
      return;
    }

    broadcastRoomState(room);

    // If bot game and it's now bot's turn, execute bot shot with realistic delay
    if (room.isBotGame && room.status === 'playing' && room.turn === 'p2') {
      function runBotTurn() {
        if (room.status !== 'playing' || room.turn !== 'p2') return;

        setTimeout(() => {
          if (room.status !== 'playing' || room.turn !== 'p2') return;

          const botResult = room.stepBot();
          if (botResult && botResult.success) {
            broadcastRoomState(room);

            // If bot hit a ship, bot gets another turn! Continue bot shooting
            if (botResult.shotResult.hit && !botResult.shotResult.allSunk && room.turn === 'p2') {
              runBotTurn();
            }
          }
        }, 850);
      }

      runBotTurn();
    }
  });

  // Chat message
  socket.on('send_chat', ({ text }) => {
    if (!currentRoomId || !text) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    room.addChatMessage(playerKey, text);
    broadcastRoomState(room);
  });

  // Rematch / Restart
  socket.on('rematch_request', () => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    // Reset game state for rematch
    room.status = 'placement';
    room.turnsCount = 0;
    room.winner = null;

    if (room.players.p1) {
      room.players.p1.ready = false;
      room.players.p1.ships = null;
      room.players.p1.shotsGrid = Array.from({ length: 10 }, () => Array(10).fill(null));
      room.players.p1.stats = { hits: 0, shots: 0 };
    }

    if (room.players.p2) {
      if (room.isBotGame) {
        const { generateRandomFleet } = require('./gameLogic');
        room.players.p2.ready = true;
        room.players.p2.ships = generateRandomFleet();
        room.players.p2.shotsGrid = Array.from({ length: 10 }, () => Array(10).fill(null));
        room.players.p2.stats = { hits: 0, shots: 0 };
        const { BotAI } = require('./botAI');
        room.botAI = new BotAI();
      } else {
        room.players.p2.ready = false;
        room.players.p2.ships = null;
        room.players.p2.shotsGrid = Array.from({ length: 10 }, () => Array(10).fill(null));
        room.players.p2.stats = { hits: 0, shots: 0 };
      }
    }

    room.addChatMessage(null, 'Nowa bitwa! Rozstawcie swoje statki.');
    broadcastRoomState(room);
    broadcastLobbyRooms();
  });

  // Leave Room
  socket.on('leave_room', () => {
    if (currentRoomId) {
      socket.leave(currentRoomId);
      const room = activeRooms.get(currentRoomId);
      if (room) {
        if (room.status === 'waiting' || (room.status === 'placement' && !room.players.p2)) {
          activeRooms.delete(currentRoomId);
        } else if (playerKey) {
          room.players[playerKey] = null;
          if (!room.players.p1 && !room.players.p2) {
            activeRooms.delete(currentRoomId);
          }
        }
        broadcastLobbyRooms();
      }
      currentRoomId = null;
      playerKey = null;
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = activeRooms.get(currentRoomId);
      if (room) {
        if (room.status === 'playing') {
          // Surrender by disconnect
          const remainingKey = playerKey === 'p1' ? 'p2' : 'p1';
          const remainingPlayer = room.players[remainingKey];
          if (remainingPlayer && !remainingPlayer.isBot) {
            room.status = 'finished';
            room.winner = remainingKey;
            room.addChatMessage(null, `${room.players[playerKey]?.name || 'Gracz'} opuścił grę.`);
            broadcastRoomState(room);
          }
        } else if (room.status === 'waiting') {
          activeRooms.delete(currentRoomId);
        } else if (playerKey) {
          room.players[playerKey] = null;
          if (!room.players.p1 && !room.players.p2) {
            activeRooms.delete(currentRoomId);
          }
        }
        broadcastLobbyRooms();
      }
    }
  });
});

// Single Page App fallback for React Router / room URLs
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Battleship Server running on http://localhost:${PORT}`);
});
