const { pool } = require('../config/db');
const socketManager = require('../utils/socketManager');

async function logNotification({ userId, type, message, channel = 'socket', status = 'sent', meta }) {
  try {
    await pool.query(
      'INSERT INTO NotificationLogs (user_id, type, message, channel, status, meta) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId || null, type, message, channel, status, meta ? JSON.stringify(meta) : null]
    );
  } catch (_) {}
}

async function notify({ type, userId, username, email, locale = 'it' }) {
  const io = socketManager.getIoInstance();
  const dict = {
    it: {
      userSignup: (u) => `Benvenuto ${u}! La registrazione è andata a buon fine.`,
      userLogin: (u) => `Accesso effettuato. Bentornato, ${u}!`,
    },
    en: {
      userSignup: (u) => `Welcome ${u}! Registration successful.`,
      userLogin: (u) => `Logged in. Welcome back, ${u}!`,
    }
  };
  const t = dict[locale] || dict.it;
  const message = (type === 'userSignup') ? t.userSignup(username) : t.userLogin(username);

  if (io) {
    io.emit(type, { userId, username, email, message, ts: Date.now() });
  }
  await logNotification({ userId, type, message, channel: 'socket', status: 'sent', meta: { email } });
}

async function notifySignup({ userId, username, email, locale = 'it' }) {
  return notify({ type: 'userSignup', userId, username, email, locale });
}

async function notifyLogin({ userId, username, email, locale = 'it' }) {
  return notify({ type: 'userLogin', userId, username, email, locale });
}

module.exports = { notifySignup, notifyLogin, notify };