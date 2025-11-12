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
const { sendVerificationEmail } = require('../services/emailService');

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

        const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        const cols = colsRes.rows.map(r => String(r.column_name).toLowerCase());
        const hasVerify = cols.includes('verification_token') && cols.includes('verification_token_expires');
        if (hasVerify) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await pool.query(
                'UPDATE Users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
                [token, expiresAt, newUser.id]
            );
            try {
                Promise.resolve()
                    .then(() => sendVerificationEmail({ to: newUser.email, token }))
                    .then(() => console.log('Email di verifica inviata a', newUser.email))
                    .catch(mailErr => console.error('Errore invio email di verifica:', mailErr));
            } catch (mailErr) {
                console.error('Errore invio email di verifica (sync):', mailErr);
            }
        }

        res.status(201).json({
            message: 'Registrazione completata! Se non ricevi l\'email, usa "Resend".',
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

// --- Verifica email (GET /api/users/verify-email?token=...) ---
exports.verifyEmail = async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ error: 'Token di verifica mancante.' });
    }
    try {
        const result = await pool.query(
            'SELECT id, verification_token_expires FROM Users WHERE verification_token = $1',
            [token]
        );
        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ error: 'Token non valido.' });
        }
        if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
            return res.status(400).json({ error: 'Token scaduto. Richiedi una nuova verifica.' });
        }
        await pool.query(
            'UPDATE Users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
            [user.id]
        );
        const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
        const url = new URL(frontend);
        url.searchParams.set('emailVerified', '1');
        return res.redirect(url.toString());
    } catch (err) {
        console.error('Errore verifica email:', err);
        res.status(500).json({ error: 'Errore interno durante la verifica email.' });
    }
};

// --- Reinvio email verifica (POST /api/users/resend-verification) ---
exports.resendVerificationEmail = async (req, res) => {
    const { email } = req.body;
    if (!email || !emailRegex.test(String(email))) {
        return res.status(400).json({ error: 'Email non valida o mancante.' });
    }
    try {
        const result = await pool.query('SELECT id, email_verified FROM Users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato.' });
        }
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email già verificata.' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await pool.query(
            'UPDATE Users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
            [token, expiresAt, user.id]
        );
        Promise.resolve()
            .then(() => sendVerificationEmail({ to: email, token }))
            .then(() => console.log('Email di verifica reinviata a', email))
            .catch(err => console.error('Errore reinvio email di verifica:', err));
        return res.status(200).json({ message: 'Email di verifica reinviata (se configurazione SMTP corretta).' });
    } catch (err) {
        console.error('Errore resend verification:', err);
        return res.status(500).json({ error: 'Errore interno durante il reinvio.' });
    }
};