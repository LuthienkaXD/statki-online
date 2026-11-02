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

const DEFAULT_CHAT_PRESETS = [
  'Cześć!',
  'Powodzenia!',
  'Dobre trafienie!',
  'Pudło! 😜',
  'Zatopiłeś mój okręt!',
  'Gramy rewanż?',
  'Dzięki za grę!',
  'Niezły strzał!'
];

// Initialize tables and run migrations
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
        shots INT NOT NULL DEFAULT 0,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        is_banned BOOLEAN NOT NULL DEFAULT false
      );

      -- Add columns if missing in existing table
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_banned') THEN
          ALTER TABLE users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;

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

      CREATE TABLE IF NOT EXISTS chat_presets (
        id SERIAL PRIMARY KEY,
        text VARCHAR(150) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date_day);
      CREATE INDEX IF NOT EXISTS idx_users_wins ON users(wins DESC);
    `);

    // Ensure default admin user "Dominika" exists with role admin
    const checkDominika = await pgPool.query('SELECT id, role FROM users WHERE LOWER(username) = LOWER($1)', ['Dominika']);
    if (checkDominika.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const defaultHash = bcrypt.hashSync('Dominika123!', 10);
      await pgPool.query(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')",
        ['Dominika', defaultHash]
      );
      console.log('Created default admin user: Dominika (password: Dominika123!)');
    } else if (checkDominika.rows[0].role !== 'admin') {
      await pgPool.query("UPDATE users SET role = 'admin' WHERE LOWER(username) = LOWER($1)", ['Dominika']);
      console.log('Promoted user Dominika to admin.');
    }

    // Seed default chat presets if empty
    const presetsCheck = await pgPool.query('SELECT COUNT(*)::int as cnt FROM chat_presets');
    if (presetsCheck.rows[0].cnt === 0) {
      for (const text of DEFAULT_CHAT_PRESETS) {
        await pgPool.query('INSERT INTO chat_presets (text) VALUES ($1) ON CONFLICT DO NOTHING', [text]);
      }
    }

    // Default settings
    await pgPool.query(`
      INSERT INTO system_settings (key, value, description)
      VALUES 
        ('maintenance_mode', 'false', 'Prace techniczne - blokada tworzenia nowych gier'),
        ('announcement', 'Witaj w grze Statki Online! Miłej zabawy!', 'Globalny komunikat wyświetlany w lobby'),
        ('chat_free_text_allowed', 'true', 'Czy gracze mogą pisać dowolny tekst poza szybkimi wiadomościami ze słownika'),
        ('max_mines', '2', 'Maksymalna liczba min na gracza'),
        ('mod_mines_enabled', 'true', 'Włącz modyfikator: Miny Morskie'),
        ('mod_recon_enabled', 'true', 'Włącz modyfikator: Zwiad Lotniczy'),
        ('mod_sonar_enabled', 'true', 'Włącz modyfikator: Sonar Impulsowy'),
        ('mod_salvo_enabled', 'true', 'Włącz modyfikator: Salwa Flagowca')
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log('Supabase tables & Admin setup verified.');
  } else {
    // SQLite Fallback
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
        shots INTEGER NOT NULL DEFAULT 0,
        role TEXT NOT NULL DEFAULT 'user',
        is_banned INTEGER NOT NULL DEFAULT 0
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

      CREATE TABLE IF NOT EXISTS chat_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date_day);
      CREATE INDEX IF NOT EXISTS idx_users_wins ON users(wins DESC);
    `);

    // Ensure Dominika exists in SQLite
    const stmtCheck = sqliteDb.prepare('SELECT id, role FROM users WHERE username = ? COLLATE NOCASE');
    const existing = stmtCheck.get('Dominika');
    if (!existing) {
      const bcrypt = require('bcryptjs');
      const defaultHash = bcrypt.hashSync('Dominika123!', 10);
      sqliteDb.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')").run('Dominika', defaultHash);
    } else if (existing.role !== 'admin') {
      sqliteDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
    }

    const cnt = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM chat_presets').get().cnt;
    if (cnt === 0) {
      const ins = sqliteDb.prepare('INSERT OR IGNORE INTO chat_presets (text) VALUES (?)');
      for (const t of DEFAULT_CHAT_PRESETS) ins.run(t);
    }

    sqliteDb.prepare(`
      INSERT OR IGNORE INTO system_settings (key, value, description)
      VALUES 
        ('maintenance_mode', 'false', 'Prace techniczne'),
        ('announcement', 'Witaj w grze Statki Online!', 'Globalny komunikat'),
        ('chat_free_text_allowed', 'true', 'Dozwolony wolny tekst w czacie')
    `).run();
  }
}

async function getUserByUsername(username) {
  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return res.rows[0] || null;
  }
  const stmt = sqliteDb.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
  return stmt.get(username) || null;
}

async function getUserById(id) {
  if (isPostgres) {
    const res = await pgPool.query(
      'SELECT id, username, role, is_banned, created_at, wins, losses, hits, shots FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }
  const stmt = sqliteDb.prepare(
    'SELECT id, username, role, is_banned, created_at, wins, losses, hits, shots FROM users WHERE id = ?'
  );
  return stmt.get(id) || null;
}

async function createUser(username, passwordHash, role = 'user') {
  // If user Dominika registers, always give admin role
  const actualRole = username.toLowerCase() === 'dominika' ? 'admin' : role;

  if (isPostgres) {
    const res = await pgPool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, is_banned, created_at, wins, losses, hits, shots',
      [username, passwordHash, actualRole]
    );
    return res.rows[0];
  }
  const stmt = sqliteDb.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  const info = stmt.run(username, passwordHash, actualRole);
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

// ---------------- Admin Functions ----------------

async function getAllUsers() {
  if (isPostgres) {
    const res = await pgPool.query(`
      SELECT id, username, role, is_banned, created_at, wins, losses, hits, shots
      FROM users
      ORDER BY id ASC
    `);
    return res.rows;
  }
  return sqliteDb.prepare('SELECT id, username, role, is_banned, created_at, wins, losses, hits, shots FROM users ORDER BY id ASC').all();
}

async function updateUserRole(userId, newRole) {
  if (isPostgres) {
    await pgPool.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, userId]);
    return getUserById(userId);
  }
  sqliteDb.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);
  return getUserById(userId);
}

async function toggleUserBan(userId, isBanned) {
  if (isPostgres) {
    await pgPool.query('UPDATE users SET is_banned = $1 WHERE id = $2', [Boolean(isBanned), userId]);
    return getUserById(userId);
  }
  sqliteDb.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(isBanned ? 1 : 0, userId);
  return getUserById(userId);
}

async function resetUserStats(userId) {
  if (isPostgres) {
    await pgPool.query('UPDATE users SET wins = 0, losses = 0, hits = 0, shots = 0 WHERE id = $1', [userId]);
    return getUserById(userId);
  }
  sqliteDb.prepare('UPDATE users SET wins = 0, losses = 0, hits = 0, shots = 0 WHERE id = ?').run(userId);
  return getUserById(userId);
}

async function deleteUser(userId) {
  if (isPostgres) {
    await pgPool.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }
  sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return true;
}

// Chat Presets (Dictionary)
async function getChatPresets() {
  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM chat_presets ORDER BY id ASC');
    return res.rows;
  }
  return sqliteDb.prepare('SELECT * FROM chat_presets ORDER BY id ASC').all();
}

async function addChatPreset(text) {
  if (isPostgres) {
    const res = await pgPool.query('INSERT INTO chat_presets (text) VALUES ($1) RETURNING *', [text]);
    return res.rows[0];
  }
  const info = sqliteDb.prepare('INSERT INTO chat_presets (text) VALUES (?)').run(text);
  return { id: Number(info.lastInsertRowid), text };
}

async function deleteChatPreset(id) {
  if (isPostgres) {
    await pgPool.query('DELETE FROM chat_presets WHERE id = $1', [id]);
    return true;
  }
  sqliteDb.prepare('DELETE FROM chat_presets WHERE id = ?').run(id);
  return true;
}

// System Settings
async function getSystemSettings() {
  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM system_settings');
    const settings = {};
    res.rows.forEach(r => { settings[r.key] = r.value; });
    return settings;
  }
  const rows = sqliteDb.prepare('SELECT * FROM system_settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

async function updateSystemSetting(key, value) {
  if (isPostgres) {
    await pgPool.query('UPDATE system_settings SET value = $1 WHERE key = $2', [String(value), key]);
    return true;
  }
  sqliteDb.prepare('UPDATE system_settings SET value = ? WHERE key = ?').run(String(value), key);
  return true;
}

async function getAdminStats() {
  if (isPostgres) {
    const usersCount = (await pgPool.query('SELECT COUNT(*)::int as cnt FROM users')).rows[0].cnt;
    const matchesCount = (await pgPool.query('SELECT COUNT(*)::int as cnt FROM matches')).rows[0].cnt;
    const presetsCount = (await pgPool.query('SELECT COUNT(*)::int as cnt FROM chat_presets')).rows[0].cnt;
    return { usersCount, matchesCount, presetsCount };
  }
  const usersCount = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  const matchesCount = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM matches').get().cnt;
  const presetsCount = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM chat_presets').get().cnt;
  return { usersCount, matchesCount, presetsCount };
}

module.exports = {
  initDb,
  getUserByUsername,
  getUserById,
  createUser,
  recordMatch,
  getDailyLeaderboard,
  getAllTimeLeaderboard,
  getRecentMatches,
  // Admin exports
  getAllUsers,
  updateUserRole,
  toggleUserBan,
  resetUserStats,
  deleteUser,
  getChatPresets,
  addChatPreset,
  deleteChatPreset,
  getSystemSettings,
  updateSystemSetting,
  getAdminStats
};
