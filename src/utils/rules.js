// Dynamic Board Rules & Ship Placement Engine
// Sizes supported: 10x10, 13x13, 15x15

export const BOARD_SIZES = [10, 13, 15];

export const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

export function getLetters(size = 10) {
  return ALL_LETTERS.slice(0, size);
}

export function getNumbers(size = 10) {
  return Array.from({ length: size }, (_, i) => i + 1);
}

export const FLEET_COLORS = [
  { id: 'blue', name: 'Granat', hex: '#2563eb' },
  { id: 'emerald', name: 'Szmaragd', hex: '#059669' },
  { id: 'crimson', name: 'Czerwień', hex: '#e11d48' },
  { id: 'purple', name: 'Fiolet', hex: '#9333ea' },
  { id: 'amber', name: 'Złoto', hex: '#d97706' },
  { id: 'slate', name: 'Grafit', hex: '#334155' },
  { id: 'teal', name: 'Morski', hex: '#0d9488' },
  { id: 'pink', name: 'Róż', hex: '#db2777' },
  { id: 'indigo', name: 'Indygo', hex: '#4f46e5' }
];

export function darkenHex(hex, percent = 25) {
  let cleanHex = (hex || '#2563eb').replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  let num = parseInt(cleanHex, 16);
  if (isNaN(num)) num = 0x2563eb;
  let r = Math.max(0, Math.min(255, (num >> 16) - Math.round(255 * (percent / 100))));
  let g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - Math.round(255 * (percent / 100))));
  let b = Math.max(0, Math.min(255, (num & 0x0000FF) - Math.round(255 * (percent / 100))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getFleetStyle(colorValue) {
  let hex = '#2563eb';
  if (colorValue && colorValue.startsWith('#')) {
    hex = colorValue;
  } else {
    const found = FLEET_COLORS.find(c => c.id === colorValue);
    if (found) hex = found.hex;
  }
  const darkHex = darkenHex(hex, 25);
  return {
    hex,
    gradient: `linear-gradient(135deg, ${hex}, ${darkHex})`,
    style: {
      background: `linear-gradient(135deg, ${hex}, ${darkHex})`,
      borderColor: darkHex
    }
  };
}

export function getFleetColor(colorId) {
  return FLEET_COLORS.find(c => c.id === colorId) || FLEET_COLORS[0];
}

// Fleets definitions per board size
export function getRequiredFleet(boardSize = 10) {
  if (boardSize === 15) {
    return [
      { id: 'l_ship', name: 'Pancernik L (Kształt L 3x2)', size: 4, count: 1, shape: 'L' },
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
  // Default 10x10 standard classic
  return [
    { id: 'b4_1', name: 'Czteromasztowiec', size: 4, count: 1 },
    { id: 'c3_1', name: 'Trójmasztowiec', size: 3, count: 2 },
    { id: 'd2_1', name: 'Dwumasztowiec', size: 2, count: 3 },
    { id: 's1_1', name: 'Jednomasztowiec', size: 1, count: 4 },
  ];
}

export function isValidCoord(r, c, boardSize = 10) {
  return r >= 0 && r < boardSize && c >= 0 && c < boardSize;
}

// Get cells occupied by ship given origin (r, c), size, orientation and shape
export function getShipRelativeCells(size, isVertical, shape = 'line') {
  if (shape === 'L') {
    // L-shape in 3x2 bounding box: 3 cells in one arm, 1 extra perpendicular cell
    // Horizontal L: [0,0], [0,1], [0,2], [1,0]
    // Vertical L:   [0,0], [1,0], [2,0], [0,1]
    if (isVertical) {
      return [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }, { dr: 2, dc: 1 }];
    }
    return [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }, { dr: 1, dc: 0 }];
  }
  // Standard straight line
  const cells = [];
  for (let i = 0; i < size; i++) {
    cells.push({
      dr: isVertical ? i : 0,
      dc: isVertical ? 0 : i
    });
  }
  return cells;
}

export function canPlaceShip(grid, r, c, size, isVertical, shape = 'line', boardSize = 10, excludeShipId = null) {
  const relCells = getShipRelativeCells(size, isVertical, shape);

  for (const rc of relCells) {
    const currR = r + rc.dr;
    const currC = c + rc.dc;

    if (!isValidCoord(currR, currC, boardSize)) return false;

    // Check 8-neighborhood
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const checkR = currR + dr;
        const checkC = currC + dc;
        if (isValidCoord(checkR, checkC, boardSize)) {
          const occupant = grid[checkR][checkC];
          if (occupant && occupant !== excludeShipId) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

export function generateRandomFleet(boardSize = 10) {
  const fleetDef = getRequiredFleet(boardSize);
  const grid = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
  const ships = [];
  let counter = 1;

  for (const def of fleetDef) {
    for (let c = 0; c < def.count; c++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 2500) {
        attempts++;
        const isVertical = Math.random() < 0.5;
        const r = Math.floor(Math.random() * boardSize);
        const col = Math.floor(Math.random() * boardSize);

        if (canPlaceShip(grid, r, col, def.size, isVertical, def.shape || 'line', boardSize)) {
          const shipId = `ship_${def.size}_${def.shape || 'line'}_${counter++}`;
          const relCells = getShipRelativeCells(def.size, isVertical, def.shape || 'line');
          const cells = relCells.map(rc => {
            const cellR = r + rc.dr;
            const cellC = col + rc.dc;
            grid[cellR][cellC] = shipId;
            return { r: cellR, c: cellC, hit: false };
          });

          ships.push({
            id: shipId,
            name: def.name,
            size: def.size,
            shape: def.shape || 'line',
            isVertical,
            cells,
            sunk: false
          });

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

export function buildGridFromShips(ships, boardSize = 10) {
  const grid = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
  ships.forEach(ship => {
    ship.cells.forEach(cell => {
      if (isValidCoord(cell.r, cell.c, boardSize)) {
        grid[cell.r][cell.c] = ship.id;
      }
    });
  });
  return grid;
}

// Backward compatibility constants
export const BOARD_SIZE = 10;
export const LETTERS = getLetters(10);
export const NUMBERS = getNumbers(10);
export const REQUIRED_FLEET = getRequiredFleet(10);
