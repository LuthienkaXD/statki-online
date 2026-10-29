// Standard Polish/Russian naval battle rules (as on battleship-game.org)
// Fleet: 1x4, 2x3, 3x2, 4x1. Total 10 ships, 20 cells.
// Ships must NOT touch each other, even diagonally.

const BOARD_SIZE = 10;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const REQUIRED_FLEET = [
  { type: 'czteromasztowiec', size: 4, count: 1 },
  { type: 'trojmasztowiec', size: 3, count: 2 },
  { type: 'dwumasztowiec', size: 2, count: 3 },
  { type: 'jednomasztowiec', size: 1, count: 4 },
];

function isValidCoord(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

// Check if a ship placement is valid against currently placed ships
// No overlap and no adjacent contact in 8 directions (including diagonals)
function canPlaceShip(grid, r, c, size, isVertical) {
  for (let i = 0; i < size; i++) {
    const currR = isVertical ? r + i : r;
    const currC = isVertical ? c : c + i;

    if (!isValidCoord(currR, currC)) return false;

    // Check all 8 surrounding cells + the cell itself
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const checkR = currR + dr;
        const checkC = currC + dc;
        if (isValidCoord(checkR, checkC)) {
          if (grid[checkR][checkC] !== 0) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

// Generate valid random placement of all 10 ships
function generateRandomFleet() {
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  const ships = [];
  let shipIdCounter = 1;

  for (const shipDef of REQUIRED_FLEET) {
    for (let count = 0; count < shipDef.count; count++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 1000) {
        attempts++;
        const isVertical = Math.random() < 0.5;
        const maxR = isVertical ? BOARD_SIZE - shipDef.size : BOARD_SIZE - 1;
        const maxC = isVertical ? BOARD_SIZE - 1 : BOARD_SIZE - shipDef.size;

        const r = Math.floor(Math.random() * (maxR + 1));
        const c = Math.floor(Math.random() * (maxC + 1));

        if (canPlaceShip(grid, r, c, shipDef.size, isVertical)) {
          const shipCells = [];
          for (let i = 0; i < shipDef.size; i++) {
            const cellR = isVertical ? r + i : r;
            const cellC = isVertical ? c : c + i;
            grid[cellR][cellC] = shipIdCounter;
            shipCells.push({ r: cellR, c: cellC, hit: false });
          }

          ships.push({
            id: `ship_${shipIdCounter}`,
            name: shipDef.type,
            size: shipDef.size,
            cells: shipCells,
            sunk: false
          });

          shipIdCounter++;
          placed = true;
        }
      }

      if (!placed) {
        // If deadlock reached, restart generation
        return generateRandomFleet();
      }
    }
  }

  return ships;
}

// Validate a user-provided fleet
function validateFleet(ships) {
  if (!Array.isArray(ships) || ships.length !== 10) {
    return { valid: false, reason: 'Flota musi zawierać dokładnie 10 statków.' };
  }

  // Count sizes
  const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));

  for (let sIdx = 0; sIdx < ships.length; sIdx++) {
    const ship = ships[sIdx];
    if (!ship.cells || ship.cells.length < 1 || ship.cells.length > 4) {
      return { valid: false, reason: `Nieprawidłowy rozmiar statku.` };
    }
    counts[ship.cells.length] = (counts[ship.cells.length] || 0) + 1;

    // Check cells shape: must be horizontal or vertical contiguous line
    const cells = ship.cells;
    for (const cell of cells) {
      if (!isValidCoord(cell.r, cell.c)) {
        return { valid: false, reason: `Statek poza planszą.` };
      }
    }

    // Check linearity
    if (cells.length > 1) {
      const allSameRow = cells.every(c => c.r === cells[0].r);
      const allSameCol = cells.every(c => c.c === cells[0].c);
      if (!allSameRow && !allSameCol) {
        return { valid: false, reason: 'Statki muszą być ustawione w linii prostej.' };
      }
      // Check contiguous
      if (allSameRow) {
        const cols = cells.map(c => c.c).sort((a, b) => a - b);
        for (let i = 0; i < cols.length - 1; i++) {
          if (cols[i + 1] !== cols[i] + 1) return { valid: false, reason: 'Maszty statku muszą być obok siebie.' };
        }
      } else {
        const rows = cells.map(c => c.r).sort((a, b) => a - b);
        for (let i = 0; i < rows.length - 1; i++) {
          if (rows[i + 1] !== rows[i] + 1) return { valid: false, reason: 'Maszty statku muszą być obok siebie.' };
        }
      }
    }

    // Check distance rule against other already placed ships
    const shipId = sIdx + 1;
    for (const cell of cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cell.r + dr;
          const nc = cell.c + dc;
          if (isValidCoord(nr, nc)) {
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

  if (counts[4] !== 1 || counts[3] !== 2 || counts[2] !== 3 || counts[1] !== 4) {
    return {
      valid: false,
      reason: 'Wymagane: 1x 4-masztowiec, 2x 3-masztowce, 3x 2-masztowce, 4x 1-masztowce.'
    };
  }

  return { valid: true };
}

// Process a shot fired at a player's board
// Returns:
// {
//   hit: boolean,
//   sunk: shipObject | null,
//   allSunk: boolean,
//   autoMarked: [{ r, c }], // empty cells automatically marked as miss (x / dot)
//   extraTurn: boolean
// }
function processShot(ships, shotsGrid, r, c) {
  if (!isValidCoord(r, c)) {
    return { error: 'Nieprawidłowe współrzędne' };
  }

  if (shotsGrid[r][c] !== null && shotsGrid[r][c] !== undefined) {
    return { error: 'W to pole już oddano strzał' };
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
    // MISS
    shotsGrid[r][c] = 'miss';
    return {
      hit: false,
      sunk: null,
      allSunk: false,
      autoMarked: [],
      extraTurn: false
    };
  }

  // HIT
  hitCell.hit = true;
  shotsGrid[r][c] = 'hit';

  // Check if this ship is completely sunk
  const isSunk = hitShip.cells.every(c => c.hit);
  hitShip.sunk = isSunk;

  if (isSunk) {
    // When ship is SUNK:
    // Mark ALL empty neighbors around EVERY cell of this ship as 'miss' (auto-marked)
    for (const cell of hitShip.cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cell.r + dr;
          const nc = cell.c + dc;
          if (isValidCoord(nr, nc)) {
            if (shotsGrid[nr][nc] === null || shotsGrid[nr][nc] === undefined) {
              shotsGrid[nr][nc] = 'miss';
              autoMarked.push({ r: nr, c: nc });
            }
          }
        }
      }
    }
  } else {
    // When ship is HIT but NOT yet sunk:
    // As in battleship-game.org and classic rules:
    // Because ships cannot touch diagonally, the 4 diagonal neighbors of this hit cell can NEVER have a ship!
    // Auto-mark diagonal corners as 'miss'
    const diagonals = [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 }
    ];
    for (const d of diagonals) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (isValidCoord(nr, nc)) {
        if (shotsGrid[nr][nc] === null || shotsGrid[nr][nc] === undefined) {
          shotsGrid[nr][nc] = 'miss';
          autoMarked.push({ r: nr, c: nc });
        }
      }
    }
  }

  // Check if ALL ships are sunk
  const allSunk = ships.every(s => s.sunk);

  return {
    hit: true,
    sunk: isSunk ? hitShip : null,
    allSunk,
    autoMarked,
    extraTurn: true // Player gets another turn on hit!
  };
}

module.exports = {
  BOARD_SIZE,
  LETTERS,
  REQUIRED_FLEET,
  isValidCoord,
  canPlaceShip,
  generateRandomFleet,
  validateFleet,
  processShot
};
