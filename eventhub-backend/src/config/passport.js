const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcrypt');
const { pool } = require('./db');

// Helper: find or create user from OAuth profile
async function findOrCreateOAuthUser({ provider, profile }) {
  const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
  const username = profile.username || (profile.displayName || (email ? email.split('@')[0] : `user_${Date.now()}`));
  if (!email) {
    throw new Error(`OAuth ${provider}: email non disponibile`);
  }

  // Cerca utente per email
  const existing = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
  if (existing.rows.length) {
    return existing.rows[0];
  }

  // Crea un utente con password casuale
  const randomPass = `oauth_${provider}_${Math.random().toString(36).slice(2)}`;
  const password_hash = await bcrypt.hash(randomPass, 10);

  const insert = await pool.query(
    `INSERT INTO Users (username, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, email, role, created_at`,
    [username, email, password_hash, 'user']
  );
  return insert.rows[0];
}

function configurePassport() {
  // Google OAuth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({ provider: 'google', profile });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }));
  }

  // GitHub OAuth
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CALLBACK_URL) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({ provider: 'github', profile });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }));
  }

  // No session serialization (usiamo JWT)
}

module.exports = { configurePassport };