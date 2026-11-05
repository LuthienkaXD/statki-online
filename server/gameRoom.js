const {
  BOARD_SIZE,
  generateRandomFleet,
  validateFleet,
  generateRandomMines,
  processShot,
  getLetters
} = require('./gameLogic');
const { BotAI } = require('./botAI');
const { recordMatch, recordCellHit, recordFirstSunkShip, recordHitStreak } = require('./db');

class GameRoom {
  constructor(roomId, isBotGame = false, options = {}) {
    this.id = roomId;
    this.isBotGame = isBotGame;
    this.createdAt = Date.now();
    this.boardSize = Number(options.boardSize) || 10;
    this.options = {
      mines: Boolean(options.mines),
      minesCount: Number(options.minesCount) || 2,
      reconPlane: options.reconPlane !== undefined ? Boolean(options.reconPlane) : true,
      sonar: options.sonar !== undefined ? Boolean(options.sonar) : true,
      mineDetector: options.mineDetector !== undefined ? Boolean(options.mineDetector) : true,
      compass: options.compass !== undefined ? Boolean(options.compass) : true,
      flagshipSalvo: options.flagshipSalvo !== undefined ? Boolean(options.flagshipSalvo) : true
    };

    this.status = 'waiting'; // 'waiting', 'placement', 'rps', 'playing', 'finished'
    this.turn = 'p1';
    this.turnsCount = 0;
    this.winner = null;
    this.chat = [];
    this.firstSunkRecorded = false;

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
      const botName = options.botName || 'Komputer (Sławomir)';

      this.players.p2 = {
        key: 'p2',
        id: 'bot',
        socketId: 'bot',
        name: botName,
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
        mineDetectorUsed: false,
        compassUsed: false,
        salvoUsed: false,
        salvoRemainingShots: 0,
        bonusTurns: 0,
        currentHitStreak: 0
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
      mineDetectorUsed: false,
      compassUsed: false,
      salvoUsed: false,
      salvoRemainingShots: 0,
      bonusTurns: 0,
      currentHitStreak: 0
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

    // Sprawdzamy jedynie pola, które NIE zostały jeszcze odkryte (shot === null / undefined)
    // oraz ignorujemy statki, które są już zatopione (sunk === true).
    let foundShip = false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = centerR + dr;
        const nc = centerC + dc;
        if (nr < 0 || nr >= this.boardSize || nc < 0 || nc >= this.boardSize) continue;

        // Jeśli pole zostało już odkryte przez gracza, radar nie bierze go pod uwagę
        const alreadyShot = enemy.shotsGrid[nr]?.[nc] !== null && enemy.shotsGrid[nr]?.[nc] !== undefined;
        if (alreadyShot) continue;

        // Sprawdź czy na tym nieodkrytym polu znajduje się jakikolwiek NIEZATOPIONY statek
        const hasUndiscoveredShip = (enemy.ships || []).some(s => 
          !s.sunk && s.cells.some(c => c.r === nr && c.c === nc)
        );

        if (hasUndiscoveredShip) {
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

    // Sonar ma wykrywać jedynie na polach nieodkrytych (nie ruszone strzałem)
    // oraz całkowicie ignorować zatopione już statki.
    let detected = false;
    if (type === 'row') {
      const r = index;
      for (let c = 0; c < this.boardSize; c++) {
        const alreadyShot = enemy.shotsGrid[r]?.[c] !== null && enemy.shotsGrid[r]?.[c] !== undefined;
        if (alreadyShot) continue;

        const hasUndiscoveredShip = (enemy.ships || []).some(s =>
          !s.sunk && s.cells.some(cell => cell.r === r && cell.c === c)
        );
        if (hasUndiscoveredShip) {
          detected = true;
          break;
        }
      }
    } else {
      const c = index;
      for (let r = 0; r < this.boardSize; r++) {
        const alreadyShot = enemy.shotsGrid[r]?.[c] !== null && enemy.shotsGrid[r]?.[c] !== undefined;
        if (alreadyShot) continue;

        const hasUndiscoveredShip = (enemy.ships || []).some(s =>
          !s.sunk && s.cells.some(cell => cell.r === r && cell.c === c)
        );
        if (hasUndiscoveredShip) {
          detected = true;
          break;
        }
      }
    }

    const lineLabel = type === 'row' ? `Wiersz ${index + 1}` : `Kolumna ${index + 1}`;
    this.addChatMessage(
      null,
      `📡 ${player.name} wysłał impuls Sonaru [${lineLabel}] ➔ ${detected ? 'ECHO ODEBRANE! (Wykryto okręt w linii)' : 'BRAK ECHA (Linia jest czysta)'}`
    );

    return { success: true, detected, type, index };
  }

  // Feature: Trałowiec Akustyczny / Wykrywacz Min 2x2
  useMineDetector(playerKey, r, c) {
    if (!this.options.mines) return { error: 'Miny wyłączone' };
    const player = this.players[playerKey];
    if (player.mineDetectorUsed) return { error: 'Wykrywacz min był już wykorzystany' };
    if (this.turn !== playerKey) return { error: 'To nie Twoja tura' };

    player.mineDetectorUsed = true;
    const enemyKey = playerKey === 'p1' ? 'p2' : 'p1';
    const enemy = this.players[enemyKey];

    // Badamy obszar 2x2: (r, c), (r, c+1), (r+1, c), (r+1, c+1)
    let mineFound = false;
    for (let dr = 0; dr <= 1; dr++) {
      for (let dc = 0; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize) {
          // Ignorujemy zdetonowane miny (gdzie shotsGrid to 'mine')
          const alreadyDetonated = enemy.shotsGrid[nr]?.[nc] === 'mine';
          if (!alreadyDetonated) {
            const hasMine = (enemy.mines || []).some(m => m.r === nr && m.c === nc);
            if (hasMine) {
              mineFound = true;
            }
          }
        }
      }
    }

    const letters = getLetters(this.boardSize);
    const labelTL = `${letters[c] || 'A'}${r + 1}`;
    const labelBR = `${letters[Math.min(c + 1, this.boardSize - 1)] || 'B'}${Math.min(r + 2, this.boardSize)}`;
    this.addChatMessage(
      null,
      `🧲 ${player.name} uruchomił Trałowiec Akustyczny 2×2 w sektorze [${labelTL}-${labelBR}] ➔ ${mineFound ? '⚠️ ALARM! W SEKTORZE WYKRYTO MINĘ MORSKĄ!' : '✅ CZYSTO! Brak min w sektorze 2×2.'}`
    );

    return { success: true, mineFound, r, c };
  }

  // Feature: Kompas Nawigacyjny (Wskazuje kierunek do najbliższego nietrafionego statku)
  useCompass(playerKey, r, c) {
    if (!this.options.compass) return { error: 'Kompas wyłączony w opcjach pokoju' };
    const player = this.players[playerKey];
    if (player.compassUsed) return { error: 'Kompas był już wykorzystany' };
    if (this.turn !== playerKey) return { error: 'To nie Twoja tura' };

    player.compassUsed = true;
    const enemyKey = playerKey === 'p1' ? 'p2' : 'p1';
    const enemy = this.players[enemyKey];

    // Znajdź wszystkie komórki wrogich statków, które:
    // 1) nie należą do zatopionego statku (!ship.sunk)
    // 2) nie zostały jeszcze trafione (!cell.hit ani w shotsGrid)
    const aliveTargets = [];
    (enemy.ships || []).forEach(ship => {
      // Ignorujemy całkowicie zatopione statki
      const isSunk = ship.sunk || ship.cells.every(c => c.hit);
      if (!isSunk) {
        ship.cells.forEach(cell => {
          const isCellHit = cell.hit || enemy.shotsGrid[cell.r]?.[cell.c] === 'hit';
          if (!isCellHit) {
            aliveTargets.push(cell);
          }
        });
      }
    });

    if (aliveTargets.length === 0) {
      this.addChatMessage(null, `🧭 ${player.name} użył Busoli: Brak niezatopionych okrętów do namierzenia!`);
      return { success: true, direction: null };
    }

    // Szukamy najbliższej komórki wg odległości euklidesowej
    let nearestCell = null;
    let minDistanceSq = Infinity;

    for (const target of aliveTargets) {
      const dr = target.r - r;
      const dc = target.c - c;
      const distSq = dr * dr + dc * dc;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearestCell = target;
      }
    }

    const dr = nearestCell.r - r; // dodatnie = na południe (w dół), ujemne = na północ (w górę)
    const dc = nearestCell.c - c; // dodatnie = na wschód (w prawo), ujemne = na zachód (w lewo)

    let directionName = '';
    if (dr === 0 && dc === 0) {
      directionName = 'w tym samym punkcie (pod Tobą!)';
    } else {
      // Obliczanie kierunku na podstawie kąta / osi
      // angle w radianach: Math.atan2(dr, dc)
      // dc: oś X (wschód), dr: oś Y (południe w dół)
      const angle = Math.atan2(dr, dc) * (180 / Math.PI); // od -180 do 180
      // -90 to Północ (N)
      // 0 to Wschód (E)
      // 90 to Południe (S)
      // 180/-180 to Zachód (W)

      if (angle >= -22.5 && angle < 22.5) {
        directionName = 'Wschód ➔';
      } else if (angle >= 22.5 && angle < 67.5) {
        directionName = 'Południowy-Wschód ↘';
      } else if (angle >= 67.5 && angle < 112.5) {
        directionName = 'Południe ⬇';
      } else if (angle >= 112.5 && angle < 157.5) {
        directionName = 'Południowy-Zachód ↙';
      } else if (angle >= -67.5 && angle < -22.5) {
        directionName = 'Północny-Wschód ↗';
      } else if (angle >= -112.5 && angle < -67.5) {
        directionName = 'Północ ⬆';
      } else if (angle >= -157.5 && angle < -112.5) {
        directionName = 'Północny-Zachód ↖';
      } else {
        directionName = 'Zachód ⬅';
      }
    }

    const letters = getLetters(this.boardSize);
    const originLabel = `${letters[c] || 'A'}${r + 1}`;

    this.addChatMessage(
      null,
      `🧭 ${player.name} rzucił namiar Busolą z punktu [${originLabel}] ➔ Najbliższy wrogi okręt znajduje się na kierunku: ${directionName}!`
    );

    return { success: true, direction: directionName, r, c };
  }

  // Feature 3: Flagship Salvo (Double Shot when flagship is intact)
  activateFlagshipSalvo(playerKey) {
    if (!this.options.flagshipSalvo) return { error: 'Salwa flagowca wyłączona' };
    const player = this.players[playerKey];
    if (player.salvoUsed) return { error: 'Salwa flagowca była już wykorzystana' };
    if (this.turn !== playerKey) return { error: 'To nie Twoja tura' };

    // Find flagship:
    // Na planszach 13x13 i 15x15 okrętem flagowym jest okręt 5-masztowy (5x1).
    // Na planszy 10x10 okrętem flagowym jest okręt 4-masztowy (4x1).
    let flagship = null;
    if (player.ships && player.ships.length > 0) {
      if (this.boardSize >= 13) {
        flagship = player.ships.find(s => s.size === 5) || [...player.ships].sort((a, b) => b.size - a.size)[0];
      } else {
        flagship = [...player.ships].sort((a, b) => b.size - a.size)[0];
      }
    }

    const isDamaged = flagship ? flagship.cells.some(c => c.hit) : false;
    if (isDamaged) {
      const shipLabel = this.boardSize >= 13 ? 'Okręt Flagowy (5-masztowiec)' : 'Okręt Flagowy (4-masztowiec)';
      return { error: `Twój ${shipLabel} został uszkodzony! Nie możesz odpalić salwy flagowej.` };
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
      shooter.currentHitStreak = (shooter.currentHitStreak || 0) + 1;
      recordHitStreak(shooter.name, shooter.currentHitStreak).catch(e => console.error('Error recording hit streak:', e));

      const letters = getLetters(this.boardSize);
      const coordName = `${letters[c] || 'A'}${r + 1}`;
      recordCellHit(coordName).catch(e => console.error('Error recording hit stat:', e));
    } else {
      // Pudło lub mina przerywa serię trafień pod rząd
      shooter.currentHitStreak = 0;
    }

    if (shotResult.sunk && !this.firstSunkRecorded) {
      this.firstSunkRecorded = true;
      recordFirstSunkShip(shotResult.sunk.size).catch(e => console.error('Error recording first sunk stat:', e));
    }

    this.turnsCount++;

    // Salvo handling
    let inSalvo = false;
    if (shooter.salvoRemainingShots > 0) {
      shooter.salvoRemainingShots--;
      inSalvo = shooter.salvoRemainingShots > 0;
    }

    if (shotResult.isMine) {
      shooter.salvoRemainingShots = 0;
      shooter.bonusTurns = 0;
      // Trafienie miny daje przeciwnikowi +2 ruchy (1 tura + bonusTurns).
      // Jeśli przeciwnik trafił już minę wcześniej lub trafiono 2 miny pod rząd,
      // dodatkowe ruchy sumują się (+1 do bonusTurns za każdą minę):
      target.bonusTurns = (target.bonusTurns || 0) + 1;
      this.turn = targetKey;
      const totalTurns = 1 + target.bonusTurns;
      this.addChatMessage(null, `💥 BOOM! ${shooter.name} wpłynął na MINĘ MORSKĄ! ${target.name} otrzymuje dodatkowe ruchy (łącznie ruchów: ${totalTurns})!`);
    } else if (shotResult.hit) {
      if (shotResult.allSunk) {
        this.status = 'finished';
        this.winner = playerKey;

        recordMatch({
          player1: { userId: this.players.p1.userId, name: this.players.p1.name, hits: this.players.p1.stats.hits, shots: this.players.p1.stats.shots },
          player2: { userId: this.players.p2.userId, name: this.players.p2.name, hits: this.players.p2.stats.hits, shots: this.players.p2.stats.shots },
          winner: { userId: shooter.userId, name: shooter.name },
          turns: this.turnsCount,
          isBot: Boolean(this.isBotGame)
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

    // Check if my flagship is damaged:
    // 13x13 i 15x15: okręt 5-masztowy (5x1)
    // 10x10: okręt 4-masztowy (4x1)
    let myFlagshipDamaged = false;
    if (me?.ships && me.ships.length > 0) {
      let flagship = null;
      if (this.boardSize >= 13) {
        flagship = me.ships.find(s => s.size === 5) || [...me.ships].sort((a, b) => b.size - a.size)[0];
      } else {
        flagship = [...me.ships].sort((a, b) => b.size - a.size)[0];
      }
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
        mineDetectorUsed: me.mineDetectorUsed,
        compassUsed: me.compassUsed,
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
        mineDetectorUsed: enemy.mineDetectorUsed,
        compassUsed: enemy.compassUsed,
        salvoUsed: enemy.salvoUsed
      } : null,
      chat: this.chat
    };
  }
}

module.exports = { GameRoom };
