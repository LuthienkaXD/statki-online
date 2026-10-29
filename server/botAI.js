const { BOARD_SIZE, isValidCoord } = require('./gameLogic');

class BotAI {
  constructor() {
    this.hitsStack = []; // Cells hit that belong to unsunk ships
    this.targetDirection = null; // 'H' or 'V' if known
  }

  notifySunk() {
    this.hitsStack = [];
    this.targetDirection = null;
  }

  notifyHit(r, c) {
    this.hitsStack.push({ r, c });
  }

  getNextShot(enemyShotsGrid) {
    // 1. If we have active hits on an unsunk ship -> Target Mode
    if (this.hitsStack.length > 0) {
      if (this.hitsStack.length >= 2) {
        // We have at least 2 hits on the same ship -> determine orientation
        const [first, ...rest] = this.hitsStack;
        const last = rest[rest.length - 1];

        const isHorizontal = first.r === last.r;
        const candidates = [];

        if (isHorizontal) {
          const row = first.r;
          const cols = this.hitsStack.map(h => h.c).sort((a, b) => a - b);
          const minCol = cols[0];
          const maxCol = cols[cols.length - 1];

          if (isValidCoord(row, minCol - 1) && enemyShotsGrid[row][minCol - 1] === null) {
            candidates.push({ r: row, c: minCol - 1 });
          }
          if (isValidCoord(row, maxCol + 1) && enemyShotsGrid[row][maxCol + 1] === null) {
            candidates.push({ r: row, c: maxCol + 1 });
          }
        } else {
          const col = first.c;
          const rows = this.hitsStack.map(h => h.r).sort((a, b) => a - b);
          const minRow = rows[0];
          const maxRow = rows[rows.length - 1];

          if (isValidCoord(minRow - 1, col) && enemyShotsGrid[minRow - 1][col] === null) {
            candidates.push({ r: minRow - 1, c: col });
          }
          if (isValidCoord(maxRow + 1, col) && enemyShotsGrid[maxRow + 1][col] === null) {
            candidates.push({ r: maxRow + 1, c: col });
          }
        }

        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }

      // If only 1 hit or orientation blocked: try 4 orthogonal neighbors of each hit in stack
      for (const hit of this.hitsStack) {
        const neighbors = [
          { r: hit.r - 1, c: hit.c },
          { r: hit.r + 1, c: hit.c },
          { r: hit.r, c: hit.c - 1 },
          { r: hit.r, c: hit.c + 1 },
        ];

        const validNeighbors = neighbors.filter(
          n => isValidCoord(n.r, n.c) && enemyShotsGrid[n.r][n.c] === null
        );

        if (validNeighbors.length > 0) {
          return validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        }
      }
    }

    // 2. Hunt Mode: Checkerboard pattern (r + c) % 2 === 0
    const parityCells = [];
    const otherCells = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (enemyShotsGrid[r][c] === null) {
          if ((r + c) % 2 === 0) {
            parityCells.push({ r, c });
          } else {
            otherCells.push({ r, c });
          }
        }
      }
    }

    if (parityCells.length > 0) {
      return parityCells[Math.floor(Math.random() * parityCells.length)];
    }

    if (otherCells.length > 0) {
      return otherCells[Math.floor(Math.random() * otherCells.length)];
    }

    return null;
  }
}

module.exports = { BotAI };
