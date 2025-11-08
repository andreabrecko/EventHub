// File: src/controllers/userController.js

const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const saltRounds = 10; 
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const isUsernameAllowed = (username) => {
    const normalized = String(username || '').toLowerCase();
    const badWords = ['cazzo','merda','stronzo','puttana','vaffanculo'];
    if (normalized.length < 3 || normalized.length > 20) return false;
    if (!/^[a-z0-9_]+$/i.test(username)) return false;
    return !badWords.some(w => normalized.includes(w));
};

// --- Registrazione Utente (POST /api/users/register) ---
exports.registerUser = async (req, res) => {
    console.log('Richiesta di registrazione ricevuta:', req.body);
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

    try {
        console.log('Attempting to register user:', username, email);
        // Cifratura della password prima del salvataggio
        const password_hash = await bcrypt.hash(password, saltRounds);

        const query = `
            INSERT INTO Users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email, role; 
        `;
        
        const result = await pool.query(query, [username, email, password_hash]);
        const newUser = result.rows[0];

        res.status(201).json({
            message: 'Registrazione completata con successo!',
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
exports.loginUser = async (req, res) => {
    console.log('Login request received:', req.body.email);
    const { email, password } = req.body; 

    if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({ error: 'Fornire email e password.' });
    }

    try {
        // 1. Cerca l'utente per email
        const userResult = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        const user = userResult.rows[0];
        console.log('User found:', user ? user.email : 'none');

        if (!user) {
            console.log('User not found for email:', email);
            return res.status(404).json({ error: 'Utente non registrato. Per favore procedi con la registrazione.' });
        }

        // 2. Confronta la password cifrata
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log('Password match:', isMatch);

        if (!isMatch) {
            console.log('Password mismatch for user:', email);
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }

        // 3. Genera il JWT
        // Genera JWT
        console.log('Generating JWT for user:', user.email, 'with role:', user.role);
        console.log('JWT_SECRET in userController (signing):', process.env.JWT_SECRET);
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // console.log('JWT_SECRET used for signing:', process.env.JWT_SECRET);
        // console.log('Generated Token:', token);

        res.status(200).json({
            message: 'Login effettuato con successo!',
            token: token,
            user: { id: user.id, username: user.username, role: user.role }
        });
        console.log('Login successful for user:', user.email);

    } catch (err) {
        console.error("Errore login:", err);
        res.status(500).json({ error: 'Errore interno del server durante il login.' });
    }
};