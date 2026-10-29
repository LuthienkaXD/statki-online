export const BOARD_SIZE = 10;
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

export const REQUIRED_FLEET = [
  { id: 'b4_1', name: 'Czteromasztowiec', size: 4, count: 1 },
  { id: 'c3_1', name: 'Trójmasztowiec', size: 3, count: 2 },
  { id: 'd2_1', name: 'Dwumasztowiec', size: 2, count: 3 },
  { id: 's1_1', name: 'Jednomasztowiec', size: 1, count: 4 },
];

export function isValidCoord(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function canPlaceShip(grid, r, c, size, isVertical, excludeShipId = null) {
  for (let i = 0; i < size; i++) {
    const currR = isVertical ? r + i : r;
    const currC = isVertical ? c : c + i;

    if (!isValidCoord(currR, currC)) return false;

    // Check 8-neighborhood for any other ship
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const checkR = currR + dr;
        const checkC = currC + dc;
        if (isValidCoord(checkR, checkC)) {
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

export function generateRandomFleet() {
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  const ships = [];
  let counter = 1;

  for (const def of REQUIRED_FLEET) {
    for (let c = 0; c < def.count; c++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 1000) {
        attempts++;
        const isVertical = Math.random() < 0.5;
        const maxR = isVertical ? BOARD_SIZE - def.size : BOARD_SIZE - 1;
        const maxC = isVertical ? BOARD_SIZE - 1 : BOARD_SIZE - def.size;

        const r = Math.floor(Math.random() * (maxR + 1));
        const col = Math.floor(Math.random() * (maxC + 1));

        if (canPlaceShip(grid, r, col, def.size, isVertical)) {
          const shipId = `ship_${def.size}_${counter++}`;
          const cells = [];

          for (let i = 0; i < def.size; i++) {
            const cellR = isVertical ? r + i : r;
            const cellC = isVertical ? col : col + i;
            grid[cellR][cellC] = shipId;
            cells.push({ r: cellR, c: cellC, hit: false });
          }

          ships.push({
            id: shipId,
            name: def.name,
            size: def.size,
            isVertical,
            cells,
            sunk: false
          });

          placed = true;
        }
      }

      if (!placed) {
        return generateRandomFleet();
      }
    }
  }

  return ships;
}

export function buildGridFromShips(ships) {
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  ships.forEach(ship => {
    ship.cells.forEach(cell => {
      if (isValidCoord(cell.r, cell.c)) {
        grid[cell.r][cell.c] = ship.id;
      }
    });
  });
  return grid;
}
