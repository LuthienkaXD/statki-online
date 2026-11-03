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

const DEFAULT_BOT_NAMES = [
  'Sławomir',
  'Piotr',
  'Tomasz',
  'Szybki Grzesiek'
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
        bot_wins INT NOT NULL DEFAULT 0,
        bot_losses INT NOT NULL DEFAULT 0,
        hits INT NOT NULL DEFAULT 0,
        shots INT NOT NULL DEFAULT 0,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        is_banned BOOLEAN NOT NULL DEFAULT false
      );

      -- Add columns if missing in existing table
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_banned') THEN
          ALTER TABLE users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'bot_wins') THEN
          ALTER TABLE users ADD COLUMN bot_wins INT NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'bot_losses') THEN
          ALTER TABLE users ADD COLUMN bot_losses INT NOT NULL DEFAULT 0;
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
        turns_count INT NOT NULL DEFAULT 0,
        is_bot BOOLEAN NOT NULL DEFAULT false
      );

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'is_bot') THEN
          ALTER TABLE matches ADD COLUMN is_bot BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS chat_presets (
        id SERIAL PRIMARY KEY,
        text VARCHAR(150) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bot_names (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS cell_hits_stats (
        cell_coord VARCHAR(10) PRIMARY KEY,
        hits_count INT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS first_sunk_stats (
        ship_size INT PRIMARY KEY,
        sunk_count INT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS hit_streak_stats (
        id INT PRIMARY KEY,
        streak_count INT NOT NULL DEFAULT 0,
        player_name VARCHAR(100) NOT NULL DEFAULT 'Brak'
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

    // Seed default bot names if empty
    const botNamesCheck = await pgPool.query('SELECT COUNT(*)::int as cnt FROM bot_names');
    if (botNamesCheck.rows[0].cnt === 0) {
      for (const name of DEFAULT_BOT_NAMES) {
        await pgPool.query('INSERT INTO bot_names (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
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
        bot_wins INTEGER NOT NULL DEFAULT 0,
        bot_losses INTEGER NOT NULL DEFAULT 0,
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
        is_bot INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(player1_id) REFERENCES users(id),
        FOREIGN KEY(player2_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS chat_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bot_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS cell_hits_stats (
        cell_coord TEXT PRIMARY KEY,
        hits_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS first_sunk_stats (
        ship_size INTEGER PRIMARY KEY,
        sunk_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS hit_streak_stats (
        id INTEGER PRIMARY KEY,
        streak_count INTEGER NOT NULL DEFAULT 0,
        player_name TEXT NOT NULL DEFAULT 'Brak'
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

    const botCnt = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM bot_names').get().cnt;
    if (botCnt === 0) {
      const insBot = sqliteDb.prepare('INSERT OR IGNORE INTO bot_names (name) VALUES (?)');
      for (const bn of DEFAULT_BOT_NAMES) insBot.run(bn);
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
      'SELECT id, username, role, is_banned, created_at, wins, losses, bot_wins, bot_losses, hits, shots FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }
  const stmt = sqliteDb.prepare(
    'SELECT id, username, role, is_banned, created_at, wins, losses, bot_wins, bot_losses, hits, shots FROM users WHERE id = ?'
  );
  return stmt.get(id) || null;
}

async function createUser(username, passwordHash, role = 'user') {
  // If user Dominika registers, always give admin role
  const actualRole = username.toLowerCase() === 'dominika' ? 'admin' : role;

  if (isPostgres) {
    const res = await pgPool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, is_banned, created_at, wins, losses, bot_wins, bot_losses, hits, shots',
      [username, passwordHash, actualRole]
    );
    return res.rows[0];
  }
  const stmt = sqliteDb.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  const info = stmt.run(username, passwordHash, actualRole);
  return getUserById(Number(info.lastInsertRowid));
}

async function recordMatch({ player1, player2, winner, turns = 0, isBot = false }) {
  const today = new Date().toISOString().slice(0, 10);
  const p1Id = player1.userId || null;
  const p1Name = player1.name || 'Gość';
  const p2Id = player2.userId || null;
  const p2Name = player2.name || 'Gość';
  const winnerId = winner.userId || null;
  const winnerName = winner.name || 'Gość';
  const matchIsBot = Boolean(isBot || p2Name.includes('Komputer') || p1Name.includes('Komputer'));

  if (isPostgres) {
    await pgPool.query(`
      INSERT INTO matches (player1_id, player1_name, player2_id, player2_name, winner_id, winner_name, date_day, turns_count, is_bot)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [p1Id, p1Name, p2Id, p2Name, winnerId, winnerName, today, turns, matchIsBot]);

    if (p1Id) {
      const isWinner = winnerId === p1Id;
      if (matchIsBot) {
        // Bot battle stats: recorded separately in bot_wins and bot_losses
        await pgPool.query(`
          UPDATE users
          SET bot_wins = bot_wins + $1, bot_losses = bot_losses + $2, hits = hits + $3, shots = shots + $4
          WHERE id = $5
        `, [isWinner ? 1 : 0, isWinner ? 0 : 1, player1.hits || 0, player1.shots || 0, p1Id]);
      } else {
        // PvP battle: updates general PvP wins and losses
        await pgPool.query(`
          UPDATE users
          SET wins = wins + $1, losses = losses + $2, hits = hits + $3, shots = shots + $4
          WHERE id = $5
        `, [isWinner ? 1 : 0, isWinner ? 0 : 1, player1.hits || 0, player1.shots || 0, p1Id]);
      }
    }

    if (p2Id) {
      const isWinner = winnerId === p2Id;
      if (matchIsBot) {
        await pgPool.query(`
          UPDATE users
          SET bot_wins = bot_wins + $1, bot_losses = bot_losses + $2, hits = hits + $3, shots = shots + $4
          WHERE id = $5
        `, [isWinner ? 1 : 0, isWinner ? 0 : 1, player2.hits || 0, player2.shots || 0, p2Id]);
      } else {
        await pgPool.query(`
          UPDATE users
          SET wins = wins + $1, losses = losses + $2, hits = hits + $3, shots = shots + $4
          WHERE id = $5
        `, [isWinner ? 1 : 0, isWinner ? 0 : 1, player2.hits || 0, player2.shots || 0, p2Id]);
      }
    }
    return;
  }

  // SQLite fallback
  const insertMatch = sqliteDb.prepare(`
    INSERT INTO matches (player1_id, player1_name, player2_id, player2_name, winner_id, winner_name, date_day, turns_count, is_bot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMatch.run(p1Id, p1Name, p2Id, p2Name, winnerId, winnerName, today, turns, matchIsBot ? 1 : 0);

  if (p1Id) {
    const isWinner = winnerId === p1Id;
    if (matchIsBot) {
      const upd1 = sqliteDb.prepare(`
        UPDATE users
        SET bot_wins = bot_wins + ?, bot_losses = bot_losses + ?, hits = hits + ?, shots = shots + ?
        WHERE id = ?
      `);
      upd1.run(isWinner ? 1 : 0, isWinner ? 0 : 1, player1.hits || 0, player1.shots || 0, p1Id);
    } else {
      const upd1 = sqliteDb.prepare(`
        UPDATE users
        SET wins = wins + ?, losses = losses + ?, hits = hits + ?, shots = shots + ?
        WHERE id = ?
      `);
      upd1.run(isWinner ? 1 : 0, isWinner ? 0 : 1, player1.hits || 0, player1.shots || 0, p1Id);
    }
  }

  if (p2Id) {
    const isWinner = winnerId === p2Id;
    if (matchIsBot) {
      const upd2 = sqliteDb.prepare(`
        UPDATE users
        SET bot_wins = bot_wins + ?, bot_losses = bot_losses + ?, hits = hits + ?, shots = shots + ?
        WHERE id = ?
      `);
      upd2.run(isWinner ? 1 : 0, isWinner ? 0 : 1, player2.hits || 0, player2.shots || 0, p2Id);
    } else {
      const upd2 = sqliteDb.prepare(`
        UPDATE users
        SET wins = wins + ?, losses = losses + ?, hits = hits + ?, shots = shots + ?
        WHERE id = ?
      `);
      upd2.run(isWinner ? 1 : 0, isWinner ? 0 : 1, player2.hits || 0, player2.shots || 0, p2Id);
    }
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
          AND m2.is_bot = false
          AND (
            (m2.winner_id IS NOT NULL AND (m2.player1_id = m.winner_id OR m2.player2_id = m.winner_id))
            OR (m2.winner_id IS NULL AND (m2.player1_name = m.winner_name OR m2.player2_name = m.winner_name))
          )
        ) AS games_today
      FROM matches m
      WHERE date_day = $2
      AND is_bot = false
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
        AND (m2.is_bot = 0 OR m2.is_bot IS FALSE)
        AND (
          (m2.winner_id IS NOT NULL AND (m2.player1_id = m.winner_id OR m2.player2_id = m.winner_id))
          OR (m2.winner_id IS NULL AND (m2.player1_name = m.winner_name OR m2.player2_name = m.winner_name))
        )
      ) AS games_today
    FROM matches m
    WHERE date_day = ?
    AND (is_bot = 0 OR is_bot IS FALSE)
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

async function getBotLeaderboard() {
  if (isPostgres) {
    const res = await pgPool.query(`
      SELECT id, username, bot_wins AS wins, bot_losses AS losses, (bot_wins + bot_losses) AS total_games,
        CASE 
          WHEN (bot_wins + bot_losses) > 0 THEN ROUND((bot_wins * 100.0) / (bot_wins + bot_losses), 1)
          ELSE 0
        END AS win_rate
      FROM users
      WHERE (bot_wins + bot_losses) > 0
      ORDER BY bot_wins DESC, win_rate DESC
      LIMIT 50
    `);
    return res.rows.map((r, idx) => ({
      rank: idx + 1,
      ...r
    }));
  }

  const stmt = sqliteDb.prepare(`
    SELECT id, username, bot_wins AS wins, bot_losses AS losses, (bot_wins + bot_losses) AS total_games,
      CASE 
        WHEN (bot_wins + bot_losses) > 0 THEN ROUND((bot_wins * 100.0) / (bot_wins + bot_losses), 1)
        ELSE 0
      END AS win_rate
    FROM users
    WHERE (bot_wins + bot_losses) > 0
    ORDER BY bot_wins DESC, win_rate DESC
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
      SELECT id, username, role, is_banned, created_at, wins, losses, bot_wins, bot_losses, hits, shots
      FROM users
      ORDER BY id ASC
    `);
    return res.rows;
  }
  return sqliteDb.prepare('SELECT id, username, role, is_banned, created_at, wins, losses, bot_wins, bot_losses, hits, shots FROM users ORDER BY id ASC').all();
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

// Bot Names
async function getBotNames() {
  if (isPostgres) {
    const res = await pgPool.query('SELECT * FROM bot_names ORDER BY id ASC');
    return res.rows;
  }
  return sqliteDb.prepare('SELECT * FROM bot_names ORDER BY id ASC').all();
}

async function addBotName(name) {
  if (isPostgres) {
    const res = await pgPool.query('INSERT INTO bot_names (name) VALUES ($1) RETURNING *', [name]);
    return res.rows[0];
  }
  const info = sqliteDb.prepare('INSERT INTO bot_names (name) VALUES (?)').run(name);
  return { id: Number(info.lastInsertRowid), name };
}

async function deleteBotName(id) {
  if (isPostgres) {
    await pgPool.query('DELETE FROM bot_names WHERE id = $1', [id]);
    return true;
  }
  sqliteDb.prepare('DELETE FROM bot_names WHERE id = ?').run(id);
  return true;
}

async function getRandomBotName() {
  const names = await getBotNames();
  if (names && names.length > 0) {
    const picked = names[Math.floor(Math.random() * names.length)];
    return `Komputer (${picked.name})`;
  }
  return 'Komputer (Sławomir)';
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

async function recordCellHit(coord) {
  if (!coord) return;
  const clean = String(coord).trim().toUpperCase();
  if (isPostgres) {
    await pgPool.query(`
      INSERT INTO cell_hits_stats (cell_coord, hits_count)
      VALUES ($1, 1)
      ON CONFLICT (cell_coord)
      DO UPDATE SET hits_count = cell_hits_stats.hits_count + 1
    `, [clean]);
    return;
  }
  sqliteDb.prepare(`
    INSERT INTO cell_hits_stats (cell_coord, hits_count)
    VALUES (?, 1)
    ON CONFLICT(cell_coord)
    DO UPDATE SET hits_count = hits_count + 1
  `).run(clean);
}

async function recordFirstSunkShip(shipSize) {
  const size = Number(shipSize);
  if (!size || isNaN(size) || size <= 0) return;
  if (isPostgres) {
    await pgPool.query(`
      INSERT INTO first_sunk_stats (ship_size, sunk_count)
      VALUES ($1, 1)
      ON CONFLICT (ship_size)
      DO UPDATE SET sunk_count = first_sunk_stats.sunk_count + 1
    `, [size]);
    return;
  }
  sqliteDb.prepare(`
    INSERT INTO first_sunk_stats (ship_size, sunk_count)
    VALUES (?, 1)
    ON CONFLICT(ship_size)
    DO UPDATE SET sunk_count = sunk_count + 1
  `).run(size);
}

async function recordHitStreak(playerName, streak) {
  const count = Number(streak);
  const name = String(playerName || 'Gracz').trim();
  if (!count || count <= 1) return;

  if (isPostgres) {
    const currentRes = await pgPool.query('SELECT streak_count, player_name FROM hit_streak_stats WHERE id = 1');
    if (currentRes.rows.length === 0) {
      await pgPool.query('INSERT INTO hit_streak_stats (id, streak_count, player_name) VALUES (1, $1, $2)', [count, name]);
    } else if (count > currentRes.rows[0].streak_count) {
      await pgPool.query('UPDATE hit_streak_stats SET streak_count = $1, player_name = $2 WHERE id = 1', [count, name]);
    }
    return;
  }

  const current = sqliteDb.prepare('SELECT streak_count, player_name FROM hit_streak_stats WHERE id = 1').get();
  if (!current) {
    sqliteDb.prepare('INSERT INTO hit_streak_stats (id, streak_count, player_name) VALUES (1, ?, ?)').run(count, name);
  } else if (count > current.streak_count) {
    sqliteDb.prepare('UPDATE hit_streak_stats SET streak_count = ?, player_name = ? WHERE id = 1').run(count, name);
  }
}

async function getBattlefieldInsights() {
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const all100Cells = [];
  for (let r = 1; r <= 10; r++) {
    for (let c = 0; c < 10; c++) {
      all100Cells.push(`${LETTERS[c]}${r}`);
    }
  }

  let rows = [];
  let firstSunkRows = [];

  if (isPostgres) {
    const hitsRes = await pgPool.query('SELECT cell_coord, hits_count FROM cell_hits_stats');
    rows = hitsRes.rows;
    const sunkRes = await pgPool.query('SELECT ship_size, sunk_count FROM first_sunk_stats ORDER BY sunk_count DESC');
    firstSunkRows = sunkRes.rows;
  } else {
    rows = sqliteDb.prepare('SELECT cell_coord, hits_count FROM cell_hits_stats').all();
    firstSunkRows = sqliteDb.prepare('SELECT ship_size, sunk_count FROM first_sunk_stats ORDER BY sunk_count DESC').all();
  }

  // Hit streak stats (najwięcej trafień pod rząd)
  let maxStreakData = { streak: 0, playerName: 'Brak' };
  try {
    if (isPostgres) {
      const streakRes = await pgPool.query('SELECT streak_count, player_name FROM hit_streak_stats WHERE id = 1');
      if (streakRes.rows.length > 0) {
        maxStreakData = {
          streak: Number(streakRes.rows[0].streak_count) || 0,
          playerName: streakRes.rows[0].player_name || 'Gracz'
        };
      }
    } else {
      const row = sqliteDb.prepare('SELECT streak_count, player_name FROM hit_streak_stats WHERE id = 1').get();
      if (row) {
        maxStreakData = {
          streak: Number(row.streak_count) || 0,
          playerName: row.player_name || 'Gracz'
        };
      }
    }
  } catch (e) {}

  const hitsMap = new Map();
  let totalHits = 0;
  for (const r of rows) {
    const count = Number(r.hits_count) || 0;
    hitsMap.set(r.cell_coord, count);
    totalHits += count;
  }

  // Find most hit cell
  let mostHitCell = null;
  let maxHits = -1;
  for (const [coord, count] of hitsMap.entries()) {
    if (count > maxHits) {
      maxHits = count;
      mostHitCell = coord;
    }
  }

  // Find least hit cell (across all 100 standard cells)
  let leastHitCell = null;
  let minHits = Infinity;
  for (const coord of all100Cells) {
    const count = hitsMap.get(coord) || 0;
    if (count < minHits) {
      minHits = count;
      leastHitCell = coord;
    }
  }
  if (minHits === Infinity) minHits = 0;

  // Most frequent first sunk ship
  let mostCommonFirstSunk = null;
  let firstSunkStats = {};
  let totalFirstSunk = 0;
  for (const row of firstSunkRows) {
    const sz = Number(row.ship_size);
    const cnt = Number(row.sunk_count) || 0;
    firstSunkStats[sz] = cnt;
    totalFirstSunk += cnt;
  }

  if (firstSunkRows.length > 0) {
    const top = firstSunkRows[0];
    const topSize = Number(top.ship_size);
    const shipNames = {
      1: 'Jednomasztowiec (1)',
      2: 'Dwumasztowiec (2)',
      3: 'Trójmasztowiec (3)',
      4: 'Czteromasztowiec (4)',
      5: 'Lotniskowiec (5)'
    };
    mostCommonFirstSunk = {
      size: topSize,
      name: shipNames[topSize] || `${topSize}-masztowiec`,
      count: Number(top.sunk_count),
      percent: totalFirstSunk > 0 ? Math.round((Number(top.sunk_count) / totalFirstSunk) * 100) : 0
    };
  }

  return {
    mostHit: mostHitCell ? { coord: mostHitCell, count: maxHits } : { coord: '—', count: 0 },
    leastHit: leastHitCell ? { coord: leastHitCell, count: minHits } : { coord: '—', count: 0 },
    firstSunk: mostCommonFirstSunk || { size: 0, name: 'Brak danych', count: 0, percent: 0 },
    maxStreak: maxStreakData,
    totalHitsRecorded: totalHits,
    totalBattlesAnalyzed: totalFirstSunk
  };
}

module.exports = {
  initDb,
  getUserByUsername,
  getUserById,
  createUser,
  recordMatch,
  getDailyLeaderboard,
  getAllTimeLeaderboard,
  getBotLeaderboard,
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
  getBotNames,
  addBotName,
  deleteBotName,
  getRandomBotName,
  getSystemSettings,
  updateSystemSetting,
  getAdminStats,
  recordCellHit,
  recordFirstSunkShip,
  recordHitStreak,
  getBattlefieldInsights
};
