const { BOARD_SIZE, generateRandomFleet, validateFleet, processShot } = require('./gameLogic');
const { BotAI } = require('./botAI');
const { recordMatch } = require('./db');

class GameRoom {
  constructor(roomId, isBotGame = false) {
    this.id = roomId;
    this.isBotGame = isBotGame;
    this.createdAt = Date.now();
    this.status = 'waiting'; // 'waiting', 'placement', 'playing', 'finished'
    this.turn = 'p1'; // 'p1' or 'p2'
    this.turnsCount = 0;
    this.winner = null;
    this.chat = [];

    this.players = {
      p1: null,
      p2: null
    };

    if (isBotGame) {
      this.botAI = new BotAI();
      this.players.p2 = {
        key: 'p2',
        id: 'bot',
        socketId: 'bot',
        name: 'Komputer (Kapitan Morgan)',
        userId: null,
        isBot: true,
        ready: true,
        color: 'crimson',
        ships: generateRandomFleet(),
        shotsGrid: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)),
        stats: { hits: 0, shots: 0 }
      };
      this.status = 'placement';
    }
  }

  join(socketId, user) {
    const playerObj = {
      socketId,
      id: user?.id || socketId,
      name: user?.username || `Kapitan_${Math.floor(100 + Math.random() * 900)}`,
      userId: user?.id || null,
      isBot: false,
      ready: false,
      color: 'blue',
      ships: null,
      shotsGrid: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)),
      stats: { hits: 0, shots: 0 }
    };

    if (!this.players.p1) {
      this.players.p1 = { ...playerObj, key: 'p1' };
      if (!this.isBotGame) {
        this.status = 'waiting';
      }
      return 'p1';
    } else if (!this.players.p2) {
      this.players.p2 = { ...playerObj, key: 'p2' };
      this.status = 'placement';
      return 'p2';
    } else {
      // Reconnection check
      if (this.players.p1.userId && user?.id === this.players.p1.userId) {
        this.players.p1.socketId = socketId;
        return 'p1';
      }
      if (this.players.p2.userId && user?.id === this.players.p2.userId) {
        this.players.p2.socketId = socketId;
        return 'p2';
      }
      return null; // Room full
    }
  }

  getPlayerKeyBySocket(socketId) {
    if (this.players.p1 && this.players.p1.socketId === socketId) return 'p1';
    if (this.players.p2 && this.players.p2.socketId === socketId) return 'p2';
    return null;
  }

  setPlayerShips(playerKey, ships, color = 'blue') {
    const validation = validateFleet(ships);
    if (!validation.valid) {
      return validation;
    }

    const player = this.players[playerKey];
    if (!player) return { valid: false, reason: 'Gracz nie znaleziony' };

    player.color = color || 'blue';
    player.ships = ships.map(s => ({
      ...s,
      cells: s.cells.map(c => ({ ...c, hit: false })),
      sunk: false
    }));
    player.ready = true;

    // If both players ready -> start game!
    if (this.players.p1?.ready && this.players.p2?.ready) {
      this.status = 'playing';
      // Random first turn
      this.turn = Math.random() < 0.5 ? 'p1' : 'p2';
    }

    return { valid: true };
  }

  makeShot(playerKey, r, c) {
    if (this.status !== 'playing') {
      return { error: 'Gra nie jest jeszcze w trakcie bitwy' };
    }
    if (this.turn !== playerKey) {
      return { error: 'To nie jest Twoja tura' };
    }

    const shooter = this.players[playerKey];
    const targetKey = playerKey === 'p1' ? 'p2' : 'p1';
    const target = this.players[targetKey];

    const shotResult = processShot(target.ships, target.shotsGrid, r, c);
    if (shotResult.error) {
      return shotResult;
    }

    shooter.stats.shots++;
    if (shotResult.hit) {
      shooter.stats.hits++;
    }

    this.turnsCount++;

    if (shotResult.hit) {
      // Player hit -> keep turn!
      if (shotResult.allSunk) {
        this.status = 'finished';
        this.winner = playerKey;

        // Record match in SQLite DB
        recordMatch({
          player1: { userId: this.players.p1.userId, name: this.players.p1.name, hits: this.players.p1.stats.hits, shots: this.players.p1.stats.shots },
          player2: { userId: this.players.p2.userId, name: this.players.p2.name, hits: this.players.p2.stats.hits, shots: this.players.p2.stats.shots },
          winner: { userId: shooter.userId, name: shooter.name },
          turns: this.turnsCount
        });
      }
    } else {
      // Miss -> switch turn!
      this.turn = targetKey;
    }

    return {
      success: true,
      shotResult,
      turn: this.turn,
      targetKey,
      shooterKey: playerKey,
      winner: this.winner
    };
  }

  // Handle Bot shot automatically if it's bot's turn
  stepBot() {
    if (!this.isBotGame || this.status !== 'playing' || this.turn !== 'p2') {
      return null;
    }

    const enemyGrid = this.players.p1.shotsGrid;
    const shotCoord = this.botAI.getNextShot(enemyGrid);
    if (!shotCoord) return null;

    const result = this.makeShot('p2', shotCoord.r, shotCoord.c);
    if (result.success) {
      if (result.shotResult.hit) {
        this.botAI.notifyHit(shotCoord.r, shotCoord.c);
        if (result.shotResult.sunk) {
          this.botAI.notifySunk();
        }
      }
    }
    return { coord: shotCoord, ...result };
  }

  addChatMessage(senderKey, text) {
    const sender = this.players[senderKey];
    const msg = {
      sender: sender ? sender.name : 'System',
      senderKey,
      text: String(text).slice(0, 150),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.chat.push(msg);
    if (this.chat.length > 50) this.chat.shift();
    return msg;
  }

  // Sanitize state for client: never leak unrevealed enemy ships!
  getClientState(forPlayerKey) {
    const p1 = this.players.p1;
    const p2 = this.players.p2;

    const me = forPlayerKey ? this.players[forPlayerKey] : null;
    const enemyKey = forPlayerKey === 'p1' ? 'p2' : 'p1';
    const enemy = this.players[enemyKey];

    return {
      roomId: this.id,
      status: this.status,
      turn: this.turn,
      turnsCount: this.turnsCount,
      winner: this.winner,
      isBotGame: this.isBotGame,
      me: me ? {
        key: me.key,
        name: me.name,
        ready: me.ready,
        color: me.color || 'blue',
        ships: me.ships, // I see my own ships
        shotsGrid: me.shotsGrid, // Shots enemy fired at me
        stats: me.stats
      } : null,
      enemy: enemy ? {
        key: enemy.key,
        name: enemy.name,
        ready: enemy.ready,
        color: enemy.color || 'slate',
        // Only reveal enemy sunk ships, never unhit active ships!
        sunkShips: (enemy.ships || []).filter(s => s.sunk),
        shotsGrid: enemy.shotsGrid, // Shots I fired at enemy
        stats: { hits: enemy.stats.hits, shots: enemy.stats.shots },
        totalShipsRemaining: (enemy.ships || []).filter(s => !s.sunk).length
      } : null,
      chat: this.chat
    };
  }
}

module.exports = { GameRoom };
