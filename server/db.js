const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, '..', 'battleship.sqlite');
const db = new DatabaseSync(dbPath);

// Initialize tables
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    hits INTEGER NOT NULL DEFAULT 0,
    shots INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER,
    player1_name TEXT NOT NULL,
    player2_id INTEGER,
    player2_name TEXT NOT NULL,
    winner_id INTEGER,
    winner_name TEXT NOT NULL,
    date_day TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    turns_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(player1_id) REFERENCES users(id),
    FOREIGN KEY(player2_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date_day);
  CREATE INDEX IF NOT EXISTS idx_users_wins ON users(wins DESC);
`);

function getUserByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username);
}

function getUserById(id) {
  const stmt = db.prepare('SELECT id, username, created_at, wins, losses, hits, shots FROM users WHERE id = ?');
  return stmt.get(id);
}

function createUser(username, passwordHash) {
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  const info = stmt.run(username, passwordHash);
  return getUserById(Number(info.lastInsertRowid));
}

function recordMatch({ player1, player2, winner, turns = 0 }) {
  const today = new Date().toISOString().slice(0, 10);
  const p1Id = player1.userId || null;
  const p1Name = player1.name || 'Gość';
  const p2Id = player2.userId || null;
  const p2Name = player2.name || 'Gość';
  const winnerId = winner.userId || null;
  const winnerName = winner.name || 'Gość';

  const insertMatch = db.prepare(`
    INSERT INTO matches (player1_id, player1_name, player2_id, player2_name, winner_id, winner_name, date_day, turns_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMatch.run(p1Id, p1Name, p2Id, p2Name, winnerId, winnerName, today, turns);

  // Update user stats if registered
  if (p1Id) {
    const isWinner = winnerId === p1Id;
    const upd1 = db.prepare(`
      UPDATE users
      SET wins = wins + ?,
          losses = losses + ?,
          hits = hits + ?,
          shots = shots + ?
      WHERE id = ?
    `);
    upd1.run(isWinner ? 1 : 0, isWinner ? 0 : 1, player1.hits || 0, player1.shots || 0, p1Id);
  }

  if (p2Id) {
    const isWinner = winnerId === p2Id;
    const upd2 = db.prepare(`
      UPDATE users
      SET wins = wins + ?,
          losses = losses + ?,
          hits = hits + ?,
          shots = shots + ?
      WHERE id = ?
    `);
    upd2.run(isWinner ? 1 : 0, isWinner ? 0 : 1, player2.hits || 0, player2.shots || 0, p2Id);
  }
}

function getDailyLeaderboard(targetDate) {
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);

  // Aggregation of matches won today
  const query = `
    SELECT 
      winner_name AS username,
      winner_id AS userId,
      COUNT(*) AS wins_today,
      (
        SELECT COUNT(*) FROM matches m2 
        WHERE m2.date_day = ? 
        AND (
          (m2.winner_id IS NOT NULL AND (m2.player1_id = m.winner_id OR m2.player2_id = m.winner_id))
          OR (m2.winner_id IS NULL AND (m2.player1_name = m.winner_name OR m2.player2_name = m.winner_name))
        )
      ) AS games_today
    FROM matches m
    WHERE date_day = ?
    GROUP BY winner_id, winner_name
    ORDER BY wins_today DESC
    LIMIT 50
  `;

  const stmt = db.prepare(query);
  const rows = stmt.all(dateStr, dateStr);

  return rows.map((r, idx) => ({
    rank: idx + 1,
    username: r.username,
    userId: r.userId,
    wins: Number(r.wins_today),
    games: Number(r.games_today),
    winRate: r.games_today > 0 ? Math.round((Number(r.wins_today) / Number(r.games_today)) * 100) : 100
  }));
}

function getAllTimeLeaderboard() {
  const stmt = db.prepare(`
    SELECT id, username, wins, losses, (wins + losses) AS total_games,
      CASE 
        WHEN (wins + losses) > 0 THEN ROUND((wins * 100.0) / (wins + losses), 1)
        ELSE 0
      END AS win_rate,
      hits, shots
    FROM users
    WHERE (wins + losses) > 0
    ORDER BY wins DESC, win_rate DESC
    LIMIT 50
  `);
  return stmt.all().map((r, idx) => ({
    rank: idx + 1,
    ...r
  }));
}

function getRecentMatches(userId = null, limit = 10) {
  if (userId) {
    const stmt = db.prepare(`
      SELECT * FROM matches 
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY id DESC LIMIT ?
    `);
    return stmt.all(userId, userId, limit);
  }
  const stmt = db.prepare(`SELECT * FROM matches ORDER BY id DESC LIMIT ?`);
  return stmt.all(limit);
}

module.exports = {
  db,
  getUserByUsername,
  getUserById,
  createUser,
  recordMatch,
  getDailyLeaderboard,
  getAllTimeLeaderboard,
  getRecentMatches
};
