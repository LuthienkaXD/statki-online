const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GameRoom } = require('./gameRoom');
const {
  initDb,
  getUserByUsername,
  createUser,
  getUserById,
  getDailyLeaderboard,
  getAllTimeLeaderboard,
  getBotLeaderboard,
  getRecentMatches,
  getAllUsers,
  updateUserRole,
  toggleUserBan,
  resetUserStats,
  deleteUser,
  getChatPresets,
  addChatPreset,
  deleteChatPreset,
  getSystemSettings,
  updateSystemSetting,
  getAdminStats
} = require('./db');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  authMiddleware,
  adminMiddleware
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
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Nazwa użytkownika musi mieć min. 3 znaki.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Hasło musi mieć min. 4 znaki.' });
    }

    const existing = await getUserByUsername(username.trim());
    if (existing) {
      return res.status(400).json({ error: 'Użytkownik o takiej nazwie już istnieje.' });
    }

    const user = await createUser(username.trim(), hashPassword(password));
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, wins: user.wins, losses: user.losses, botWins: user.bot_wins || 0, botLosses: user.bot_losses || 0 } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Błąd serwera podczas rejestracji.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Podaj login i hasło.' });
    }

    const user = await getUserByUsername(username.trim());
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(400).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        wins: user.wins,
        losses: user.losses,
        botWins: user.bot_wins || 0,
        botLosses: user.bot_losses || 0,
        hits: user.hits,
        shots: user.shots
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Błąd serwera podczas logowania.' });
  }
});

// Current user profile
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const recent = await getRecentMatches(req.user.id, 10);
    res.json({ user: req.user, recentMatches: recent });
  } catch (err) {
    console.error('Error fetching me profile:', err);
    res.status(500).json({ error: 'Błąd pobierania profilu.' });
  }
});

// Match history
app.get('/api/history', authMiddleware, async (req, res) => {
  try {
    const history = await getRecentMatches(req.user.id, 30);
    res.json({ history });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Błąd pobierania historii gier.' });
  }
});

// Daily leaderboard
app.get('/api/leaderboard/daily', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const leaderboard = await getDailyLeaderboard(date);
    res.json({ date, leaderboard });
  } catch (err) {
    console.error('Error fetching daily leaderboard:', err);
    res.status(500).json({ error: 'Błąd pobierania rankingu.' });
  }
});

// All-time leaderboard
app.get('/api/leaderboard/all-time', async (req, res) => {
  try {
    const leaderboard = await getAllTimeLeaderboard();
    res.json({ leaderboard });
  } catch (err) {
    console.error('Error fetching all-time leaderboard:', err);
    res.status(500).json({ error: 'Błąd pobierania rankingu ogólnego.' });
  }
});

// Bot battles summary leaderboard
app.get('/api/leaderboard/bot', async (req, res) => {
  try {
    const leaderboard = await getBotLeaderboard();
    res.json({ leaderboard });
  } catch (err) {
    console.error('Error fetching bot leaderboard:', err);
    res.status(500).json({ error: 'Błąd pobierania statystyk gier z botem.' });
  }
});

// Public chat presets dictionary
app.get('/api/chat/presets', async (req, res) => {
  try {
    const presets = await getChatPresets();
    const settings = await getSystemSettings();
    res.json({
      presets: presets.map(p => p.text),
      freeTextAllowed: settings.chat_free_text_allowed !== 'false'
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd słownika wiadomości' });
  }
});

// Public announcement / system settings & available modifiers
app.get('/api/system/public', async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json({
      announcement: settings.announcement || '',
      maintenanceMode: settings.maintenance_mode === 'true',
      modifiersConfig: {
        mines: settings.mod_mines_enabled !== 'false',
        reconPlane: settings.mod_recon_enabled !== 'false',
        sonar: settings.mod_sonar_enabled !== 'false',
        flagshipSalvo: settings.mod_salvo_enabled !== 'false'
      }
    });
  } catch (err) {
    res.json({
      announcement: '',
      maintenanceMode: false,
      modifiersConfig: { mines: true, reconPlane: true, sonar: true, flagshipSalvo: true }
    });
  }
});

// ---------------- Admin Routes (Protected by adminMiddleware) ----------------

app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json({ stats, activeRoomsCount: activeRooms.size });
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania statystyk admina.' });
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania użytkowników.' });
  }
});

app.patch('/api/admin/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Nieprawidłowa rola.' });
    }
    const updated = await updateUserRole(req.params.id, role);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zmiany roli.' });
  }
});

app.patch('/api/admin/users/:id/ban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isBanned } = req.body;
    const updated = await toggleUserBan(req.params.id, isBanned);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Błąd blokady użytkownika.' });
  }
});

app.post('/api/admin/users/:id/reset-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updated = await resetUserStats(req.params.id);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Błąd resetowania statystyk.' });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania użytkownika.' });
  }
});

// Chat Presets Admin
app.get('/api/admin/chat-presets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const presets = await getChatPresets();
    res.json({ presets });
  } catch (err) {
    res.status(500).json({ error: 'Błąd słownika czatu.' });
  }
});

app.post('/api/admin/chat-presets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Treść wiadomości nie może być pusta.' });
    }
    const created = await addChatPreset(text.trim());
    res.json({ preset: created });
  } catch (err) {
    res.status(500).json({ error: 'Błąd dodawania wiadomości do słownika.' });
  }
});

app.delete('/api/admin/chat-presets/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await deleteChatPreset(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania ze słownika.' });
  }
});

// System Settings Admin
app.get('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Błąd ustawień.' });
  }
});

app.post('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Brak klucza.' });
    await updateSystemSetting(key, value);
    res.json({ success: true, key, value });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zapisu ustawienia.' });
  }
});

function getOpenRooms() {
  const openRooms = [];
  for (const [id, room] of activeRooms.entries()) {
    if (!room.isBotGame && room.status === 'waiting' && room.players.p1 && !room.players.p2) {
      openRooms.push({
        id: room.id,
        hostName: room.players.p1.name,
        boardSize: room.boardSize || 10,
        options: room.options,
        createdAt: room.createdAt
      });
    }
  }
  return openRooms;
}

function broadcastOpenRooms() {
  io.emit('open_rooms_update', getOpenRooms());
}

// Get list of open joinable rooms
app.get('/api/rooms', (req, res) => {
  res.json({ rooms: getOpenRooms() });
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

  // Create Room
  socket.on('create_room', async ({ isBot = false, user = null, boardSize = 10, options = {} }) => {
    let roomId = generateRoomId();
    while (activeRooms.has(roomId)) {
      roomId = generateRoomId();
    }

    // Fetch system max mines setting if enabled
    let maxMines = 2;
    try {
      const settings = await getSystemSettings();
      if (settings && settings.max_mines) maxMines = Number(settings.max_mines) || 2;
    } catch (e) {}

    const gameOptions = {
      ...options,
      boardSize: Number(boardSize) || 10,
      minesCount: maxMines
    };

    const room = new GameRoom(roomId, isBot, gameOptions);
    playerKey = room.join(socket.id, user);
    currentRoomId = roomId;
    activeRooms.set(roomId, room);
    socket.join(roomId);

    socket.emit('room_created', { roomId, playerKey, state: room.getClientState(playerKey) });
    broadcastRoomState(room);
    broadcastOpenRooms();
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
      socket.emit('join_error', { message: 'Pokój jest już pełny.' });
      return;
    }

    currentRoomId = cleanId;
    socket.join(cleanId);

    socket.emit('room_joined', { roomId: cleanId, playerKey, state: room.getClientState(playerKey) });
    broadcastRoomState(room);
    broadcastOpenRooms();
  });

  // Place Ships & Set Ready
  socket.on('set_ships', ({ ships, color, mines }) => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    const res = room.setPlayerShips(playerKey, ships, color, mines);
    if (!res.valid) {
      socket.emit('placement_error', { message: res.reason });
      return;
    }

    broadcastRoomState(room);
  });

  // Rock Paper Scissors choice
  socket.on('rps_choice', ({ choice }) => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    room.handleRpsChoice(playerKey, choice, () => {
      // Callback fired after transition delay to playing
      broadcastRoomState(room);

      // If bot goes first in battle
      if (room.isBotGame && room.status === 'playing' && room.turn === 'p2') {
        setTimeout(() => {
          if (room.status === 'playing' && room.turn === 'p2') {
            const botResult = room.stepBot();
            if (botResult && botResult.success) {
              broadcastRoomState(room);
            }
          }
        }, 1000);
      }
    });

    broadcastRoomState(room);
  });

  // Rock Paper Scissors rematch on tie
  socket.on('rps_rematch', () => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    room.resetRpsTie();
    broadcastRoomState(room);
  });

  // Reconnaissance plane special move
  socket.on('use_recon', ({ r, c }) => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    const res = room.useReconPlane(playerKey, r, c);
    socket.emit('recon_result', res);
    broadcastRoomState(room);
  });

  // Sonar impulse
  socket.on('use_sonar', ({ type, index }) => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    const res = room.useSonar(playerKey, type, index);
    socket.emit('sonar_result', res);
    broadcastRoomState(room);
  });

  // Flagship salvo activate
  socket.on('activate_salvo', () => {
    if (!currentRoomId) return;
    const room = activeRooms.get(currentRoomId);
    if (!room) return;

    const res = room.activateFlagshipSalvo(playerKey);
    socket.emit('salvo_result', res);
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

            // If bot hit a ship OR bot has bonus turn from mine, bot continues shooting
            if (!botResult.shotResult.allSunk && room.turn === 'p2') {
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
        const { generateRandomFleet, generateRandomMines } = require('./gameLogic');
        room.players.p2.ready = true;
        room.players.p2.ships = generateRandomFleet(room.boardSize);
        room.players.p2.mines = room.options.mines ? generateRandomMines(room.players.p2.ships, room.boardSize, room.options.minesCount) : [];
        room.players.p2.shotsGrid = Array.from({ length: room.boardSize }, () => Array(room.boardSize).fill(null));
        room.players.p2.stats = { hits: 0, shots: 0 };
        const { BotAI } = require('./botAI');
        room.botAI = new BotAI(room.boardSize);
      } else {
        room.players.p2.ready = false;
        room.players.p2.ships = null;
        room.players.p2.mines = [];
        room.players.p2.shotsGrid = Array.from({ length: room.boardSize }, () => Array(room.boardSize).fill(null));
        room.players.p2.stats = { hits: 0, shots: 0 };
      }
    }

    room.addChatMessage(null, 'Nowa bitwa! Rozstawcie swoje statki.');
    broadcastRoomState(room);
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
          // If host left waiting room, clean it up
          activeRooms.delete(currentRoomId);
          broadcastOpenRooms();
        }
      }
    }
  });
});

// Single Page App fallback for React Router / room URLs
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

server.listen(PORT, async () => {
  try {
    await initDb();
  } catch (err) {
    console.error('Failed to initialize database tables:', err);
  }
  console.log(`Battleship Server running on http://localhost:${PORT}`);
});
