// File: src/controllers/verificationController.js

const { pool } = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// POST /api/users/verify-email → genera token e invia email di verifica
exports.requestEmailVerification = async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email è richiesta.' });
  try {
    const r = await pool.query('SELECT id, email_verified FROM Users WHERE email = $1', [email]);
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });
    if (user.email_verified === true) {
      return res.status(200).json({ message: 'Email già verificata.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query('UPDATE Users SET verification_token=$1, verification_token_expires=$2 WHERE id=$3', [token, expires, user.id]);
    try {
      const { sendVerificationEmail } = require('../services/emailService');
      await sendVerificationEmail({ to: email, token, pool, userId: user.id });
    } catch (e) {
      console.error('Errore invio email verifica:', e?.message || e);
    }
    return res.status(200).json({ message: 'Email di verifica inviata se l’utente esiste.' });
  } catch (err) {
    console.error('requestEmailVerification error:', err?.message || err);
    return res.status(500).json({ error: 'Errore interno server.' });
  }
};

// GET /api/users/verify-email?token=...
exports.verifyEmail = async (req, res) => {
  const { token } = req.query || {};
  if (!token) return res.status(400).json({ error: 'Token mancante.' });
  try {
    const r = await pool.query('SELECT id, email FROM Users WHERE verification_token = $1 AND (verification_token_expires IS NULL OR verification_token_expires > NOW())', [token]);
    const user = r.rows[0];
    if (!user) return res.status(400).json({ error: 'Token non valido o scaduto.' });
    await pool.query('UPDATE Users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1', [user.id]);
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const url = new URL(FRONTEND_URL);
      url.searchParams.set('emailVerified', '1');
      return res.redirect(url.toString());
    } catch (_) {
      return res.status(200).json({ message: 'Email verificata con successo.' });
    }
  } catch (err) {
    console.error('verifyEmail error:', err?.message || err);
    return res.status(500).json({ error: 'Errore interno server.' });
  }
};

// POST /api/users/password-reset/request → genera token reset e invia email
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email è richiesta.' });
  try {
    const r = await pool.query('SELECT id FROM Users WHERE email = $1', [email]);
    const user = r.rows[0];
    if (!user) {
      // Non rivelare se l’email non esiste
      return res.status(200).json({ message: 'Se l’email è corretta, invieremo le istruzioni.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await pool.query('UPDATE Users SET password_reset_token=$1, password_reset_expires=$2 WHERE id=$3', [token, expires, user.id]);
    try {
      const { sendPasswordResetEmail } = require('../services/emailService');
      await sendPasswordResetEmail({ to: email, token, pool, userId: user.id });
    } catch (e) {
      console.error('Errore invio email reset:', e?.message || e);
    }
    return res.status(200).json({ message: 'Istruzioni inviate se l’utente esiste.' });
  } catch (err) {
    console.error('requestPasswordReset error:', err?.message || err);
    return res.status(500).json({ error: 'Errore interno server.' });
  }
};

// POST /api/users/reset-password → conferma reset con token e nuova password
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'Token e nuova password sono richiesti.' });
  const strong = String(newPassword).length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
  if (!strong) return res.status(400).json({ error: 'Password troppo debole.' });
  try {
    const r = await pool.query('SELECT id FROM Users WHERE password_reset_token = $1 AND (password_reset_expires IS NULL OR password_reset_expires > NOW())', [token]);
    const user = r.rows[0];
    if (!user) return res.status(400).json({ error: 'Token non valido o scaduto.' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE Users SET password_hash=$1, password_reset_token=NULL, password_reset_expires=NULL WHERE id=$2', [hash, user.id]);
    return res.status(200).json({ message: 'Password aggiornata con successo.' });
  } catch (err) {
    console.error('resetPassword error:', err?.message || err);
    return res.status(500).json({ error: 'Errore interno server.' });
  }
};