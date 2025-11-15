// File: src/controllers/userController.js

const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const saltRounds = 10; 
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const isStrongPassword = (password) => {
    const p = String(password || '');
    return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
};
const isUsernameAllowed = (username) => {
    const normalized = String(username || '').toLowerCase();
    const badWords = ['cazzo','merda','stronzo','puttana','vaffanculo'];
    if (normalized.length < 3 || normalized.length > 20) return false;
    if (!/^[a-z0-9_]+$/i.test(username)) return false;
    return !badWords.some(w => normalized.includes(w));
};

// --- Registrazione Utente (POST /api/users/register) ---
const crypto = require('crypto');
const { notifySignup, notifyLogin } = require('../services/notifyService');

// Registra un nuovo utente, valida input, cifra la password e opzionalmente invia email di verifica.
exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body; 

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Fornire tutti i campi.' });
    }

    if (!emailRegex.test(String(email))) {
        return res.status(400).json({ error: 'Email non valida.' });
    }
    if (!isUsernameAllowed(username)) {
        return res.status(400).json({ error: 'Username non consentito.' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({ error: 'Password troppo debole: minimo 8 caratteri con maiuscola, minuscola, numero e simbolo.' });
    }

    try {
        // Cifratura della password prima del salvataggio
        const password_hash = await bcrypt.hash(password, saltRounds);

        const query = `
            INSERT INTO Users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email, role; 
        `;
        const result = await pool.query(query, [username, email, password_hash]);
        const newUser = result.rows[0];

        await notifySignup({ userId: newUser.id, username: newUser.username, email: newUser.email });
        try {
            const { sendWelcomeEmail } = require('../services/emailService');
            await sendWelcomeEmail({ to: newUser.email, username: newUser.username, pool, userId: newUser.id });
        } catch (e) {
            console.error('Errore invio email benvenuto:', e?.message || e);
        }

        res.status(201).json({
            message: `Benvenuto ${newUser.username}! Registrazione completata.`,
            user: { id: newUser.id, username: newUser.username, role: newUser.role }
        });

    } catch (err) {
        if (err.code === '23505') { // UNIQUE constraint violation (username/email già in uso)
            return res.status(409).json({ error: 'Username o email già in uso.' });
        }
        console.error("Errore registrazione:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- Login Utente (POST /api/users/login) ---
// Autentica un utente con email/password e genera un JWT per l'accesso alle rotte protette.
exports.loginUser = async (req, res) => {
    const { email, password } = req.body; 

    if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({ error: 'Fornire email e password.' });
    }

    try {
        // 1. Cerca l'utente per email
        const userResult = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'Utente non registrato. Per favore procedi con la registrazione.' });
        }

        // 2. Confronta la password cifrata
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }

        // 3. Genera il JWT
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

        const ua = String(req.headers['user-agent'] || '');
        const ip = String(req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '');
        try {
            const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
            const cols = colsRes.rows.map(r => String(r.column_name).toLowerCase());
            const notifyEnabled = cols.includes('login_notify_enabled') ? user.login_notify_enabled !== false : true;
            if (notifyEnabled) {
                const { sendLoginNotificationEmail } = require('../services/emailService');
                Promise.resolve().then(() => sendLoginNotificationEmail({ to: user.email, ua, ip, when: Date.now(), pool, userId: user.id })).catch(e => console.error('Errore notifica login:', e));
            }
        } catch (e) {
            console.error('Errore controllo notifica login:', e);
        }

        await notifyLogin({ userId: user.id, username: user.username, email: user.email });
        res.status(200).json({
            message: 'Login effettuato con successo!',
            token: token,
            user: { id: user.id, username: user.username, role: user.role }
        });
        // Login OK

    } catch (err) {
        console.error("Errore login:", err);
        res.status(500).json({ error: 'Errore interno del server durante il login.' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const { id } = req.user;
        const r = await pool.query('SELECT id, username, email, role, login_notify_enabled, email_verified FROM Users WHERE id = $1', [id]);
        if (!r.rows[0]) return res.status(404).json({ error: 'Utente non trovato.' });
        return res.status(200).json({ user: r.rows[0] });
    } catch (err) {
        return res.status(500).json({ error: 'Errore interno del server.' });
    }
};

exports.toggleLoginNotifications = async (req, res) => {
    const { enabled } = req.body || {};
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Valore non valido.' });
    }
    try {
        const userId = req.user.id;
        await pool.query('UPDATE Users SET login_notify_enabled = $1 WHERE id = $2', [enabled, userId]);
        return res.status(200).json({ message: 'Impostazione aggiornata.', enabled });
    } catch (err) {
        console.error('Errore toggle notifiche:', err);
        return res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- Eventi creati dall'utente (GET /api/users/me/events)
exports.getMyEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const q = `
            SELECT e.*, COALESCE(p.photos, '[]'::json) AS photos
            FROM Events e
            LEFT JOIN LATERAL (
                SELECT json_agg(ep.file_path) AS photos
                FROM EventPhotos ep
                WHERE ep.event_id = e.id
            ) p ON TRUE
            WHERE e.user_id = $1
            ORDER BY e.created_at DESC;
        `;
        const r = await pool.query(q, [userId]);
        return res.status(200).json({ count: r.rows.length, events: r.rows });
    } catch (err) {
        console.error('Errore getMyEvents:', err?.message || err);
        return res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- Eventi a cui l'utente è registrato (GET /api/users/me/registrations)
exports.getMyRegistrations = async (req, res) => {
    try {
        const userId = req.user.id;
        const q = `
            SELECT e.*, COALESCE(p.photos, '[]'::json) AS photos, r.created_at AS registered_at
            FROM Registrations r
            JOIN Events e ON r.event_id = e.id
            LEFT JOIN LATERAL (
                SELECT json_agg(ep.file_path) AS photos
                FROM EventPhotos ep
                WHERE ep.event_id = e.id
            ) p ON TRUE
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC;
        `;
        const r = await pool.query(q, [userId]);
        return res.status(200).json({ count: r.rows.length, events: r.rows });
    } catch (err) {
        console.error('Errore getMyRegistrations:', err?.message || err);
        return res.status(500).json({ error: 'Errore interno del server.' });
    }
};