const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByUsername, createUser, getUserById } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'battleship_secret_key_2026_super_secure';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak autoryzacji' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
  }

  req.user = await getUserById(payload.id);
  if (!req.user) {
    return res.status(401).json({ error: 'Użytkownik nie istnieje' });
  }

  if (req.user.is_banned) {
    return res.status(403).json({ error: 'Twoje konto zostało zablokowane przez administratora.' });
  }

  next();
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Dostęp zabroniony. Wymagane uprawnienia administratora.' });
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authMiddleware,
  adminMiddleware
};
