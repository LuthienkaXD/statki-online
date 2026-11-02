const {
  BOARD_SIZE,
  generateRandomFleet,
  validateFleet,
  generateRandomMines,
  processShot
} = require('./gameLogic');
const { BotAI } = require('./botAI');
const { recordMatch } = require('./db');

class GameRoom {
  constructor(roomId, isBotGame = false, options = {}) {
    this.id = roomId;
    this.isBotGame = isBotGame;
    this.createdAt = Date.now();
    this.boardSize = Number(options.boardSize) || 10;
    this.options = {
      mines: Boolean(options.mines),
      minesCount: Number(options.minesCount) || 2,
      reconPlane: Boolean(options.reconPlane),
      sonar: Boolean(options.sonar),
      flagshipSalvo: Boolean(options.flagshipSalvo)
    };

    this.status = 'waiting'; // 'waiting', 'placement', 'rps', 'playing', 'finished'
    this.turn = 'p1';
    this.turnsCount = 0;
    this.winner = null;
    this.chat = [];

    // Rock Paper Scissors minigame state
    this.rps = {
      p1Choice: null,
      p2Choice: null,
      winner: null,
      history: []
    };

    this.players = {
      p1: null,
      p2: null
    };

    if (isBotGame) {
      this.botAI = new BotAI(this.boardSize);
      const botShips = generateRandomFleet(this.boardSize);
      const botMines = this.options.mines ? generateRandomMines(botShips, this.boardSize, this.options.minesCount) : [];

      this.players.p2 = {
        key: 'p2',
        id: 'bot',
        socketId: 'bot',
        name: 'Komputer (Kapitan Morgan)',
        userId: null,
        isBot: true,
        ready: true,
        color: 'crimson',
        ships: botShips,
        mines: botMines,
        shotsGrid: Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(null)),
        stats: { hits: 0, shots: 0 },
        reconUsed: false,
        sonarUsed: false,
        salvoUsed: false,
        salvoRemainingShots: 0,
        bonusTurns: 0
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
      mines: [],
      shotsGrid: Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(null)),
      stats: { hits: 0, shots: 0 },
      reconUsed: false,
      sonarUsed: false,
      salvoUsed: false,
      salvoRemainingShots: 0,
      bonusTurns: 0
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
      if (this.players.p1.userId && user?.id === this.players.p1.userId) {
        this.players.p1.socketId = socketId;
        return 'p1';
      }
      if (this.players.p2.userId && user?.id === this.players.p2.userId) {
        this.players.p2.socketId = socketId;
        return 'p2';
      }
      return null;
    }
  }

  getPlayerKeyBySocket(socketId) {
    if (this.players.p1 && this.players.p1.socketId === socketId) return 'p1';
    if (this.players.p2 && this.players.p2.socketId === socketId) return 'p2';
    return null;
  }

  setPlayerShips(playerKey, ships, color = 'blue', customMines = null) {
    const validation = validateFleet(ships, this.boardSize);
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

    if (this.options.mines) {
      // Validate custom mines if provided by player
      const maxMines = this.options.minesCount || 2;
      let validMines = [];
      if (Array.isArray(customMines) && customMines.length <= maxMines) {
        const occupied = new Set();
        player.ships.forEach(s => s.cells.forEach(c => occupied.add(`${c.r},${c.c}`)));
        
        const filtered = customMines.filter(m => 
          m && typeof m.r === 'number' && typeof m.c === 'number' &&
          m.r >= 0 && m.r < this.boardSize && m.c >= 0 && m.c < this.boardSize &&
          !occupied.has(`${m.r},${m.c}`)
        );
        validMines = filtered;
      }

      // If user placed fewer mines than maxMines, fill the rest randomly
      if (validMines.length < maxMines) {
        const remainingNeeded = maxMines - validMines.length;
        const additional = generateRandomMines(player.ships, this.boardSize, remainingNeeded, validMines);
        player.mines = [...validMines, ...additional];
      } else {
        player.mines = validMines;
      }
    } else {
      player.mines = [];
    }

    player.ready = true;

    // Transition to Rock Paper Scissors
    if (this.players.p1?.ready && this.players.p2?.ready) {
      this.status = 'rps';
      this.rps = {
        p1Choice: null,
        p2Choice: this.isBotGame ? ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)] : null,
        winner: null,
        resultText: null
      };
      this.addChatMessage(null, 'Czas na pojedynek Kamień, Papier, Nożyce o prawo pierwszego wystrzału!');
    }

    return { valid: true };
  }

  handleRpsChoice(playerKey, choice, onTransition) {
    if (this.status !== 'rps') return { error: 'Nie faza RPS' };
    if (!['rock', 'paper', 'scissors'].includes(choice)) return { error: 'Zły wybór' };

    if (playerKey === 'p1') this.rps.p1Choice = choice;
    if (playerKey === 'p2') this.rps.p2Choice = choice;

    if (this.rps.p1Choice && this.rps.p2Choice) {
      const c1 = this.rps.p1Choice;
      const c2 = this.rps.p2Choice;

      if (c1 === c2) {
        const choiceName = c1 === 'rock' ? 'Kamień' : c1 === 'paper' ? 'Papier' : 'Nożyce';
        this.rps.isTie = true;
        this.rps.resultText = `Remis! Oboje wybrali ${choiceName}. Kliknij "Zagraj dogrywkę", aby spróbować ponownie!`;
        this.addChatMessage(null, this.rps.resultText);
        return { tie: true, resultText: this.rps.resultText };
      }

      this.rps.isTie = false;

      const p1Wins =
        (c1 === 'rock' && c2 === 'scissors') ||
        (c1 === 'paper' && c2 === 'rock') ||
        (c1 === 'scissors' && c2 === 'paper');

      const winnerKey = p1Wins ? 'p1' : 'p2';
      const winnerName = this.players[winnerKey].name;

      this.rps.winner = winnerKey;
      this.rps.resultText = `${winnerName} wygrywa Kamień-Papier-Nożyce i rozpoczyna bitwę!`;
      this.turn = winnerKey;
      this.addChatMessage(null, this.rps.resultText);

      setTimeout(() => {
        if (this.status === 'rps') {
          this.status = 'playing';
          if (typeof onTransition === 'function') {
            onTransition();
          }
        }
      }, 1800);

      return { winnerKey, resultText: this.rps.resultText };
    }

    return { waiting: true };
  }

  // Reset RPS choices for manual tie-breaker / retry
  resetRpsTie() {
    if (this.status !== 'rps') return;
    this.rps.p1Choice = null;
    this.rps.p2Choice = this.isBotGame ? ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)] : null;
    this.rps.isTie = false;
    this.rps.resultText = null;
    this.addChatMessage(null, 'Rozpoczynamy dogrywkę Kamień-Papier-Nożyce!');
  }

  // Feature 1: Reconnaissance plane
  useReconPlane(playerKey, centerR, centerC) {
    if (!this.options.reconPlane) return { error: 'Samolot zwiadowczy wyłączony' };
    const player = this.players[playerKey];
    if (player.reconUsed) return { error: 'Zwiad był już wykorzystany' };
    if (this.turn !== playerKey) return { error: 'To nie Twoja tura' };

    player.reconUsed = true;
    const enemyKey = playerKey === 'p1' ? 'p2' : 'p1';
    const enemy = this.players[enemyKey];

    let foundShip = false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = centerR + dr;
        const nc = centerC + dc;
        if (enemy.ships.some(s => s.cells.some(c => c.r === nr && c.c === nc))) {
          foundShip = true;
        }
      }
    }

    this.addChatMessage(
      null,
      `🛩️ ${player.name} wykonał zwiad lotniczy w sektorze wokół (${centerR + 1}, ${centerC + 1}) - ${foundShip ? 'WYKRYTO WROGI OKRĘT!' : 'Czyste wody.'}`
    );
    return { success: true, foundShip };
  }

  // Feature 2: Sonar Impulse (Scan entire row or col for sound echoes)
  useSonar(playerKey, type, index) {
    if (!this.options.sonar) return { error: 'Sonar wyłączony' };
    const player = this.players[playerKey];
    if (player.sonarUsed) return { error: 'Sonar był już wykorzystany' };
    if (this.turn !== playerKey) return { error: 'To nie Twoja tura' };

    player.sonarUsed = true;
    const enemyKey = playerKey === 'p1' ? 'p2' : 'p1';
    const enemy = this.players[enemyKey];

    let detected = false;
    if (type === 'row') {
      detected = enemy.ships.some(s => s.cells.some(c => c.r === index));
    } else {
      detected = enemy.ships.some(s => s.cells.some(c => c.c === index));
    }

    const lineLabel = type === 'row' ? `Wiersz ${index + 1}` : `Kolumna ${index + 1}`;
    this.addChatMessage(
      null,
      `📡 ${player.name} wysłał impuls Sonaru [${lineLabel}] ➔ ${detected ? 'ECHO ODEBRANE! (Wykryto okręt w linii)' : 'BRAK ECHA (Linia jest czysta)'}`
    );

    return { success: true, detected, type, index };
  }

  // Feature 3: Flagship Salvo (Double Shot when flagship is intact)
  activateFlagshipSalvo(playerKey) {
    if (!this.options.flagshipSalvo) return { error: 'Salwa flagowca wyłączona' };
    const player = this.players[playerKey];
    if (player.salvoUsed) return { error: 'Salwa flagowca była już wykorzystana' };
    if (this.turn !== playerKey) return { error: 'To nie Twoja tura' };

    // Find biggest ship (flagship)
    const flagship = [...player.ships].sort((a, b) => b.size - a.size)[0];
    const isDamaged = flagship.cells.some(c => c.hit);
    if (isDamaged) {
      return { error: 'Twój Okręt Flagowy został uszkodzony! Nie możesz odpalić salwy flagowej.' };
    }

    player.salvoUsed = true;
    player.salvoRemainingShots = 2; // 2 shots in this turn!

    this.addChatMessage(null, `⚡ ${player.name} odbezpiecza PODWÓJNĄ SALWĘ FLAGOWĄ! (Oddaje 2 potężne strzały w tej turze)`);
    return { success: true, remainingShots: player.salvoRemainingShots };
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

    const shotResult = processShot(target.ships, target.shotsGrid, r, c, this.boardSize, target.mines);
    if (shotResult.error) {
      return shotResult;
    }

    shooter.stats.shots++;
    if (shotResult.hit) {
      shooter.stats.hits++;
    }

    this.turnsCount++;

    // Salvo handling
    let inSalvo = false;
    if (shooter.salvoRemainingShots > 0) {
      shooter.salvoRemainingShots--;
      inSalvo = shooter.salvoRemainingShots > 0;
    }

    if (shotResult.isMine) {
      this.addChatMessage(null, `💥 BOOM! ${shooter.name} wpłynął na MINĘ MORSKĄ! ${target.name} otrzymuje 2 ruchy!`);
      shooter.salvoRemainingShots = 0;
      shooter.bonusTurns = 0;
      target.bonusTurns = 1; // 1 standard turn + 1 bonus turn = 2 turns guaranteed!
      this.turn = targetKey;
    } else if (shotResult.hit) {
      if (shotResult.allSunk) {
        this.status = 'finished';
        this.winner = playerKey;

        recordMatch({
          player1: { userId: this.players.p1.userId, name: this.players.p1.name, hits: this.players.p1.stats.hits, shots: this.players.p1.stats.shots },
          player2: { userId: this.players.p2.userId, name: this.players.p2.name, hits: this.players.p2.stats.hits, shots: this.players.p2.stats.shots },
          winner: { userId: shooter.userId, name: shooter.name },
          turns: this.turnsCount
        });
      }
      // Hit keeps turn naturally
    } else {
      // Miss: check if shooter still has bonus turn (e.g. from enemy hitting mine)
      if (shooter.bonusTurns > 0) {
        shooter.bonusTurns--;
        this.addChatMessage(null, `🎯 Dodatkowy ruch za minę: ${shooter.name} wykonuje swój drugi ruch!`);
        // Stay on shooter's turn
      } else if (!inSalvo) {
        this.turn = targetKey;
      } else {
        this.addChatMessage(null, `⚡ Salwa flagowa: ${shooter.name} oddaje drugi strzał!`);
      }
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

  stepBot() {
    if (!this.isBotGame || this.status !== 'playing' || this.turn !== 'p2') {
      return null;
    }

    const enemyGrid = this.players.p1.shotsGrid;
    const shotCoord = this.botAI.getNextShot(enemyGrid);
    if (!shotCoord) return null;

    const result = this.makeShot('p2', shotCoord.r, shotCoord.c);
    if (result.success && result.shotResult) {
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

  getClientState(forPlayerKey) {
    const me = forPlayerKey ? this.players[forPlayerKey] : null;
    const enemyKey = forPlayerKey === 'p1' ? 'p2' : 'p1';
    const enemy = this.players[enemyKey];

    // Check if my flagship is damaged
    let myFlagshipDamaged = false;
    if (me?.ships && me.ships.length > 0) {
      const flagship = [...me.ships].sort((a, b) => b.size - a.size)[0];
      myFlagshipDamaged = flagship ? flagship.cells.some(c => c.hit) : false;
    }

    return {
      roomId: this.id,
      boardSize: this.boardSize,
      options: this.options,
      status: this.status,
      turn: this.turn,
      turnsCount: this.turnsCount,
      winner: this.winner,
      isBotGame: this.isBotGame,
      rps: {
        myChoice: forPlayerKey === 'p1' ? this.rps.p1Choice : this.rps.p2Choice,
        enemyChosen: Boolean(forPlayerKey === 'p1' ? this.rps.p2Choice : this.rps.p1Choice),
        winner: this.rps.winner,
        isTie: Boolean(this.rps.isTie),
        resultText: this.rps.resultText
      },
      me: me ? {
        key: me.key,
        name: me.name,
        ready: me.ready,
        color: me.color || 'blue',
        ships: me.ships,
        mines: me.mines,
        shotsGrid: me.shotsGrid,
        stats: me.stats,
        reconUsed: me.reconUsed,
        sonarUsed: me.sonarUsed,
        salvoUsed: me.salvoUsed,
        salvoRemainingShots: me.salvoRemainingShots,
        bonusTurns: me.bonusTurns,
        flagshipDamaged: myFlagshipDamaged
      } : null,
      enemy: enemy ? {
        key: enemy.key,
        name: enemy.name,
        ready: enemy.ready,
        color: enemy.color || 'slate',
        sunkShips: (enemy.ships || []).filter(s => s.sunk),
        allShips: this.status === 'finished' ? enemy.ships : undefined,
        allMines: this.status === 'finished' ? enemy.mines : undefined,
        shotsGrid: enemy.shotsGrid,
        stats: { hits: enemy.stats.hits, shots: enemy.stats.shots },
        totalShipsRemaining: (enemy.ships || []).filter(s => !s.sunk).length,
        reconUsed: enemy.reconUsed,
        sonarUsed: enemy.sonarUsed,
        salvoUsed: enemy.salvoUsed
      } : null,
      chat: this.chat
    };
  }
}

module.exports = { GameRoom };
