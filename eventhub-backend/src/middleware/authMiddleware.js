// File: src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Middleware: Protegge l'endpoint verificando il JWT nell'header Authorization.
 * Aggiunge l'oggetto utente decodificato (id, role) a req.user.
 */
exports.protect = async (req, res, next) => {
    let token;

    // 1. Estrai il token dall'header 'Authorization: Bearer <token>'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // 401 Unauthorized
        return res.status(401).json({ error: 'Accesso negato. Token non fornito.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        // Enforce blocked users across all protected endpoints
        try {
            const userRes = await pool.query('SELECT is_blocked FROM Users WHERE id = $1', [decoded.id]);
            const isBlocked = userRes.rows?.[0]?.is_blocked === true;
            if (isBlocked) {
                return res.status(403).json({ error: 'Account bloccato. Contatta il supporto.' });
            }
        } catch (_) {
            // If DB check fails, proceed without blocking to avoid false positives
        }
        next();
    } catch (error) {
        // console.error('Error in authMiddleware:', error);
        return res.status(401).json({ error: 'Token non valido o scaduto.' });
    }
};

/**
 * Middleware: Verifica che l'utente loggato abbia un ruolo specifico (es. 'admin').
 * Richiede che 'protect' sia stato eseguito prima.
 */
exports.restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            // 403 Forbidden
            return res.status(403).json({ error: 'Accesso negato. Privilegi insufficienti.' });
        }
        next();
    };
};