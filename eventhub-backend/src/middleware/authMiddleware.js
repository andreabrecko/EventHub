// File: src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

/**
 * Middleware: Protegge l'endpoint verificando il JWT nell'header Authorization.
 * Aggiunge l'oggetto utente decodificato (id, role) a req.user.
 */
exports.protect = (req, res, next) => {
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
        // 2. Verifica e decodifica il token
        const token = req.headers.authorization.split(' ')[1];
        // console.log('Token received in authMiddleware:', token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log('Decoded token in authMiddleware:', decoded);
        req.user = decoded;
        // console.log('req.user set to:', req.user);
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