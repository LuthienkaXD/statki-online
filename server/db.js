const { Pool } = require('pg');
const path = require('node:path');
require('dotenv').config();

let pgPool = null;
let sqliteDb = null;
const isPostgres = Boolean(process.env.DATABASE_URL);

if (isPostgres) {
  const url = new URL(process.env.DATABASE_URL);
  pgPool = new Pool({
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: Number(url.port) || 5432,
    database: url.pathname.replace(/^\//, '') || 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('Using PostgreSQL / Supabase database.');
} else {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, '..', 'battleship.sqlite');
  sqliteDb = new DatabaseSync(dbPath);
  console.log('Using local SQLite fallback.');
}

// Initialize tables
async function initDb() {
  if (isPostgres) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        wins INT NOT NULL DEFAULT 0,
        losses INT NOT NULL DEFAULT 0,
        hits INT NOT NULL DEFAULT 0,
        shots INT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        player1_id INT REFERENCES users(id) ON DELETE SET NULL,
        player1_name VARCHAR(100) NOT NULL,
        player2_id INT REFERENCES users(id) ON DELETE SET NULL,
        player2_name VARCHAR(100) NOT NULL,
        winner_id INT REFERENCES users(id) ON DELETE SET NULL,
        winner_name VARCHAR(100) NOT NULL,
        date_day VARCHAR(10) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        turns_count INT NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date_day);
      CREATE INDEX IF NOT EXISTS idx_users_wins ON users(wins DESC);
    `);
    console.log('Supabase / PostgreSQL tables verified.');
  } else {
    sqliteDb.exec(`
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
  }
}

async function getUserByUsername(username) {
  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return res.rows[0] || null;
  }
  const stmt = sqliteDb.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) || null;
}

async function getUserById(id) {
  if (isPostgres) {
    const res = await pgPool.query('SELECT id, username, created_at, wins, losses, hits, shots FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  const stmt = sqliteDb.prepare('SELECT id, username, created_at, wins, losses, hits, shots FROM users WHERE id = ?');
  return stmt.get(id) || null;
}

async function createUser(username, passwordHash) {
  if (isPostgres) {
    const res = await pgPool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at, wins, losses, hits, shots',
      [username, passwordHash]
    );
    return res.rows[0];
  }
  const stmt = sqliteDb.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  const info = stmt.run(username, passwordHash);
  return getUserById(Number(info.lastInsertRowid));
}

async function recordMatch({ player1, player2, winner, turns = 0 }) {
  const today = new Date().toISOString().slice(0, 10);
  const p1Id = player1.userId || null;
  const p1Name = player1.name || 'Gość';
  const p2Id = player2.userId || null;
  const p2Name = player2.name || 'Gość';
  const winnerId = winner.userId || null;
  const winnerName = winner.name || 'Gość';

  if (isPostgres) {
    await pgPool.query(`
      INSERT INTO matches (player1_id, player1_name, player2_id, player2_name, winner_id, winner_name, date_day, turns_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [p1Id, p1Name, p2Id, p2Name, winnerId, winnerName, today, turns]);

    if (p1Id) {
      const isWinner = winnerId === p1Id;
      await pgPool.query(`
        UPDATE users
        SET wins = wins + $1, losses = losses + $2, hits = hits + $3, shots = shots + $4
        WHERE id = $5
      `, [isWinner ? 1 : 0, isWinner ? 0 : 1, player1.hits || 0, player1.shots || 0, p1Id]);
    }

    if (p2Id) {
      const isWinner = winnerId === p2Id;
      await pgPool.query(`
        UPDATE users
        SET wins = wins + $1, losses = losses + $2, hits = hits + $3, shots = shots + $4
        WHERE id = $5
      `, [isWinner ? 1 : 0, isWinner ? 0 : 1, player2.hits || 0, player2.shots || 0, p2Id]);
    }
    return;
  }

  // SQLite fallback
  const insertMatch = sqliteDb.prepare(`
    INSERT INTO matches (player1_id, player1_name, player2_id, player2_name, winner_id, winner_name, date_day, turns_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMatch.run(p1Id, p1Name, p2Id, p2Name, winnerId, winnerName, today, turns);

  if (p1Id) {
    const isWinner = winnerId === p1Id;
    const upd1 = sqliteDb.prepare(`
      UPDATE users
      SET wins = wins + ?, losses = losses + ?, hits = hits + ?, shots = shots + ?
      WHERE id = ?
    `);
    upd1.run(isWinner ? 1 : 0, isWinner ? 0 : 1, player1.hits || 0, player1.shots || 0, p1Id);
  }

  if (p2Id) {
    const isWinner = winnerId === p2Id;
    const upd2 = sqliteDb.prepare(`
      UPDATE users
      SET wins = wins + ?, losses = losses + ?, hits = hits + ?, shots = shots + ?
      WHERE id = ?
    `);
    upd2.run(isWinner ? 1 : 0, isWinner ? 0 : 1, player2.hits || 0, player2.shots || 0, p2Id);
  }
}

async function getDailyLeaderboard(targetDate) {
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);

  if (isPostgres) {
    const query = `
      SELECT 
        winner_name AS username,
        winner_id AS "userId",
        COUNT(*)::int AS wins_today,
        (
          SELECT COUNT(*)::int FROM matches m2 
          WHERE m2.date_day = $1 
          AND (
            (m2.winner_id IS NOT NULL AND (m2.player1_id = m.winner_id OR m2.player2_id = m.winner_id))
            OR (m2.winner_id IS NULL AND (m2.player1_name = m.winner_name OR m2.player2_name = m.winner_name))
          )
        ) AS games_today
      FROM matches m
      WHERE date_day = $2
      GROUP BY winner_id, winner_name
      ORDER BY wins_today DESC
      LIMIT 50
    `;
    const res = await pgPool.query(query, [dateStr, dateStr]);
    return res.rows.map((r, idx) => ({
      rank: idx + 1,
      username: r.username,
      userId: r.userId,
      wins: Number(r.wins_today),
      games: Number(r.games_today),
      winRate: r.games_today > 0 ? Math.round((Number(r.wins_today) / Number(r.games_today)) * 100) : 100
    }));
  }

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
  const stmt = sqliteDb.prepare(query);
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

async function getAllTimeLeaderboard() {
  if (isPostgres) {
    const res = await pgPool.query(`
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
    return res.rows.map((r, idx) => ({
      rank: idx + 1,
      ...r
    }));
  }

  const stmt = sqliteDb.prepare(`
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

async function getRecentMatches(userId = null, limit = 10) {
  if (isPostgres) {
    if (userId) {
      const res = await pgPool.query(`
        SELECT * FROM matches 
        WHERE player1_id = $1 OR player2_id = $2
        ORDER BY id DESC LIMIT $3
      `, [userId, userId, limit]);
      return res.rows;
    }
    const res = await pgPool.query('SELECT * FROM matches ORDER BY id DESC LIMIT $1', [limit]);
    return res.rows;
  }

  if (userId) {
    const stmt = sqliteDb.prepare(`
      SELECT * FROM matches 
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY id DESC LIMIT ?
    `);
    return stmt.all(userId, userId, limit);
  }
  const stmt = sqliteDb.prepare(`SELECT * FROM matches ORDER BY id DESC LIMIT ?`);
  return stmt.all(limit);
}

module.exports = {
  initDb,
  getUserByUsername,
  getUserById,
  createUser,
  recordMatch,
  getDailyLeaderboard,
  getAllTimeLeaderboard,
  getRecentMatches
};
