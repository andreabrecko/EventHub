// File: src/controllers/userController.js

const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const saltRounds = 10; 

// --- Registrazione Utente (POST /api/users/register) ---
exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body; 

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Fornire tutti i campi.' });
    }

    try {
        // Cifratura della password prima del salvataggio
        const password_hash = await bcrypt.hash(password, saltRounds);

        const query = `
            INSERT INTO Users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email, role; 
        `;
        
        const result = await db.query(query, [username, email, password_hash]);
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
    const { email, password } = req.body; 

    if (!email || !password) {
        return res.status(400).json({ error: 'Fornire email e password.' });
    }

    try {
        // 1. Cerca l'utente per email
        const userResult = await db.query('SELECT * FROM Users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }

        // 2. Confronta la password cifrata
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }

        // 3. Genera il JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // 4. Risposta
        res.status(200).json({
            message: 'Login effettuato con successo!',
            token: token,
            user: { id: user.id, username: user.username, role: user.role }
        });

    } catch (err) {
        console.error("Errore login:", err);
        res.status(500).json({ error: 'Errore interno del server durante il login.' });
    }
};