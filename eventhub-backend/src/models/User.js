// File: src/models/User.js
// Modello User: operazioni su utenti e utilità per autenticazione/verifica.

const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

async function create({ username, email, password_hash }) {
  const q = `
    INSERT INTO Users (username, email, password_hash)
    VALUES ($1,$2,$3)
    RETURNING id, username, email, role, created_at
  `;
  const r = await pool.query(q, [username, email, password_hash]);
  return r.rows[0];
}

async function findByEmail(email) {
  const r = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
  return r.rows[0] || null;
}

async function findById(id) {
  const r = await pool.query('SELECT * FROM Users WHERE id = $1', [id]);
  return r.rows[0] || null;
}

async function verifyPassword(user, password) {
  if (!user || !user.password_hash) return false;
  return bcrypt.compare(String(password), String(user.password_hash));
}

async function toggleLoginNotifications(userId, enabled) {
  await pool.query('UPDATE Users SET login_notify_enabled = $1 WHERE id = $2', [enabled, userId]);
  return { enabled };
}

async function setVerificationToken(userId, token, expires) {
  await pool.query('UPDATE Users SET verification_token=$1, verification_token_expires=$2 WHERE id=$3', [token, expires, userId]);
  return { token, expires };
}

async function markEmailVerified(userId) {
  await pool.query('UPDATE Users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1', [userId]);
  return { email_verified: true };
}

async function setPasswordReset(userId, token, expires) {
  await pool.query('UPDATE Users SET password_reset_token=$1, password_reset_expires=$2 WHERE id=$3', [token, expires, userId]);
  return { token, expires };
}

async function updatePassword(userId, password_hash) {
  await pool.query('UPDATE Users SET password_hash=$1, password_reset_token=NULL, password_reset_expires=NULL WHERE id=$2', [password_hash, userId]);
  return { updated: true };
}

async function isBlocked(userId) {
  const r = await pool.query('SELECT is_blocked FROM Users WHERE id = $1', [userId]);
  return r.rows[0]?.is_blocked === true;
}

async function getAll() {
  const q = `
    SELECT id, username, email, role, is_blocked, created_at
    FROM Users
    ORDER BY created_at DESC
  `;
  const r = await pool.query(q);
  return r.rows;
}

module.exports = {
  create,
  findByEmail,
  findById,
  verifyPassword,
  toggleLoginNotifications,
  setVerificationToken,
  markEmailVerified,
  setPasswordReset,
  updatePassword,
  isBlocked,
  getAll,
};