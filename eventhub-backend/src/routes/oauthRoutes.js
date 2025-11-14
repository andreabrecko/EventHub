const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Emissione token e redirect verso il frontend con query params
function issueTokenAndRedirect(req, res) {
  const user = req.user;
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
  const url = new URL(FRONTEND_URL);
  url.searchParams.set('token', token);
  url.searchParams.set('username', user.username || '');
  url.searchParams.set('role', user.role || 'user');
  return res.redirect(url.toString());
}

// Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/api/auth/failure' }), issueTokenAndRedirect);

// GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/api/auth/failure' }), issueTokenAndRedirect);

router.get('/failure', (req, res) => {
  res.status(401).json({ error: 'OAuth authentication failed' });
});

// Provider availability
router.get('/providers', (req, res) => {
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);
  const githubEnabled = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CALLBACK_URL);
  res.json({ google: googleEnabled, github: githubEnabled });
});

module.exports = router;
// File: src/routes/oauthRoutes.js
// Autenticazione OAuth (Google, GitHub) integrata con Passport.
// Dopo login successo, emette un JWT e reindirizza al frontend con parametri.