// Server-side Game Logic with dynamic Board Sizes (10x10, 13x13, 15x15) and Mines/Modifiers

const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

function getLetters(size = 10) {
  return ALL_LETTERS.slice(0, size);
}

function isValidCoord(r, c, boardSize = 10) {
  return r >= 0 && r < boardSize && c >= 0 && c < boardSize;
}

function getRequiredFleet(boardSize = 10) {
  if (boardSize === 15) {
    return [
      { id: 'l_ship', name: 'Pancernik L (3x2)', size: 4, count: 1, shape: 'L' },
      { id: 'b5', name: 'Lotniskowiec', size: 5, count: 1 },
      { id: 'b4', name: 'Czteromasztowiec', size: 4, count: 2 },
      { id: 'c3', name: 'Trójmasztowiec', size: 3, count: 3 },
      { id: 'd2', name: 'Dwumasztowiec', size: 2, count: 4 },
      { id: 's1', name: 'Jednomasztowiec', size: 1, count: 4 },
    ];
  }
  if (boardSize === 13) {
    return [
      { id: 'b5', name: 'Lotniskowiec', size: 5, count: 1 },
      { id: 'b4', name: 'Czteromasztowiec', size: 4, count: 2 },
      { id: 'c3', name: 'Trójmasztowiec', size: 3, count: 3 },
      { id: 'd2', name: 'Dwumasztowiec', size: 2, count: 3 },
      { id: 's1', name: 'Jednomasztowiec', size: 1, count: 4 },
    ];
  }
  return [
    { id: 'b4', name: 'Czteromasztowiec', size: 4, count: 1 },
    { id: 'c3', name: 'Trójmasztowiec', size: 3, count: 2 },
    { id: 'd2', name: 'Dwumasztowiec', size: 2, count: 3 },
    { id: 's1', name: 'Jednomasztowiec', size: 1, count: 4 },
  ];
}

function getShipRelativeCells(size, isVertical, shape = 'line') {
  if (shape === 'L') {
    if (isVertical) {
      return [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }, { dr: 2, dc: 1 }];
    }
    return [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }, { dr: 1, dc: 0 }];
  }
  const cells = [];
  for (let i = 0; i < size; i++) {
    cells.push({
      dr: isVertical ? i : 0,
      dc: isVertical ? 0 : i
    });
  }
  return cells;
}

function canPlaceShip(grid, r, c, size, isVertical, shape = 'line', boardSize = 10) {
  const relCells = getShipRelativeCells(size, isVertical, shape);
  for (const rc of relCells) {
    const currR = r + rc.dr;
    const currC = c + rc.dc;
    if (!isValidCoord(currR, currC, boardSize)) return false;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const checkR = currR + dr;
        const checkC = currC + dc;
        if (isValidCoord(checkR, checkC, boardSize)) {
          if (grid[checkR][checkC] !== 0) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

function generateRandomFleet(boardSize = 10) {
  const fleetDef = getRequiredFleet(boardSize);
  const grid = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
  const ships = [];
  let shipIdCounter = 1;

  for (const shipDef of fleetDef) {
    for (let count = 0; count < shipDef.count; count++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 2500) {
        attempts++;
        const isVertical = Math.random() < 0.5;
        const r = Math.floor(Math.random() * boardSize);
        const c = Math.floor(Math.random() * boardSize);

        if (canPlaceShip(grid, r, c, shipDef.size, isVertical, shipDef.shape || 'line', boardSize)) {
          const relCells = getShipRelativeCells(shipDef.size, isVertical, shipDef.shape || 'line');
          const shipCells = relCells.map(rc => {
            const cellR = r + rc.dr;
            const cellC = c + rc.dc;
            grid[cellR][cellC] = shipIdCounter;
            return { r: cellR, c: cellC, hit: false };
          });

          ships.push({
            id: `ship_${shipIdCounter}`,
            name: shipDef.name,
            size: shipDef.size,
            shape: shipDef.shape || 'line',
            isVertical,
            cells: shipCells,
            sunk: false
          });

          shipIdCounter++;
          placed = true;
        }
      }

      if (!placed) {
        return generateRandomFleet(boardSize);
      }
    }
  }

  return ships;
}

function validateFleet(ships, boardSize = 10) {
  if (!Array.isArray(ships)) {
    return { valid: false, reason: 'Nieprawidłowa flota.' };
  }

  const grid = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
  for (let sIdx = 0; sIdx < ships.length; sIdx++) {
    const ship = ships[sIdx];
    const cells = ship.cells;
    if (!cells || cells.length === 0) return { valid: false, reason: 'Statek bez komórek.' };

    for (const cell of cells) {
      if (!isValidCoord(cell.r, cell.c, boardSize)) {
        return { valid: false, reason: 'Statek poza planszą.' };
      }
    }

    const shipId = sIdx + 1;
    for (const cell of cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cell.r + dr;
          const nc = cell.c + dc;
          if (isValidCoord(nr, nc, boardSize)) {
            const occupant = grid[nr][nc];
            if (occupant !== 0 && occupant !== shipId) {
              return { valid: false, reason: 'Statki nie mogą się ze sobą stykać ani bokami, ani rogami.' };
            }
          }
        }
      }
      grid[cell.r][cell.c] = shipId;
    }
  }

  return { valid: true };
}

// Generates random mines in free water cells
function generateRandomMines(ships, boardSize = 10, count = 2) {
  const occupied = new Set();
  ships.forEach(s => s.cells.forEach(c => occupied.add(`${c.r},${c.c}`)));

  const mines = [];
  let attempts = 0;
  while (mines.length < count && attempts < 500) {
    attempts++;
    const r = Math.floor(Math.random() * boardSize);
    const c = Math.floor(Math.random() * boardSize);
    const key = `${r},${c}`;
    if (!occupied.has(key) && !mines.some(m => m.r === r && m.c === c)) {
      mines.push({ r, c });
    }
  }
  return mines;
}

function processShot(ships, shotsGrid, r, c, boardSize = 10, mines = []) {
  if (!isValidCoord(r, c, boardSize)) {
    return { error: 'Nieprawidłowe współrzędne' };
  }

  if (shotsGrid[r][c] !== null && shotsGrid[r][c] !== undefined) {
    return { error: 'W to pole już oddano strzał' };
  }

  // Check if hit a mine
  const hitMine = mines && mines.find(m => m.r === r && m.c === c);
  if (hitMine) {
    shotsGrid[r][c] = 'mine';
    return {
      hit: false,
      isMine: true,
      sunk: null,
      allSunk: false,
      autoMarked: [],
      extraTurn: false
    };
  }

  // Find if any ship occupies (r, c)
  let hitShip = null;
  let hitCell = null;

  for (const ship of ships) {
    for (const cell of ship.cells) {
      if (cell.r === r && cell.c === c) {
        hitShip = ship;
        hitCell = cell;
        break;
      }
    }
    if (hitShip) break;
  }

  const autoMarked = [];

  if (!hitShip) {
    shotsGrid[r][c] = 'miss';
    return {
      hit: false,
      isMine: false,
      sunk: null,
      allSunk: false,
      autoMarked: [],
      extraTurn: false
    };
  }

  hitCell.hit = true;
  shotsGrid[r][c] = 'hit';

  const isSunk = hitShip.cells.every(c => c.hit);
  hitShip.sunk = isSunk;

  if (isSunk) {
    for (const cell of hitShip.cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cell.r + dr;
          const nc = cell.c + dc;
          if (isValidCoord(nr, nc, boardSize)) {
            if (shotsGrid[nr][nc] === null || shotsGrid[nr][nc] === undefined) {
              shotsGrid[nr][nc] = 'miss';
              autoMarked.push({ r: nr, c: nc });
            }
          }
        }
      }
    }
  } else {
    // Auto-mark diagonal corners as miss
    const diagonals = [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 }
    ];
    for (const d of diagonals) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (isValidCoord(nr, nc, boardSize)) {
        if (shotsGrid[nr][nc] === null || shotsGrid[nr][nc] === undefined) {
          shotsGrid[nr][nc] = 'miss';
          autoMarked.push({ r: nr, c: nc });
        }
      }
    }
  }

  const allSunk = ships.every(s => s.cells.every(c => c.hit));

  return {
    hit: true,
    isMine: false,
    sunk: isSunk ? hitShip : null,
    allSunk,
    autoMarked,
    extraTurn: true
  };
}

module.exports = {
  BOARD_SIZE: 10,
  getLetters,
  isValidCoord,
  getRequiredFleet,
  getShipRelativeCells,
  canPlaceShip,
  generateRandomFleet,
  validateFleet,
  generateRandomMines,
  processShot
};
