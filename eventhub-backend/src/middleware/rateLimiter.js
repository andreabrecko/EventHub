// File: src/middleware/rateLimiter.js
// Semplice rate limiter in-memory per endpoint (per IP + path)

const store = new Map();

function rateLimiter(options = {}) {
    const windowMs = options.windowMs || (15 * 60 * 1000); // 15 minuti
    const max = options.max || 100; // max richieste nella finestra

    return (req, res, next) => {
        const key = `${req.ip}:${req.baseUrl}${req.path}`;
        const now = Date.now();
        const entry = store.get(key) || { count: 0, start: now };

        // resetta finestra se scaduta
        if (now - entry.start > windowMs) {
            entry.count = 0;
            entry.start = now;
        }

        entry.count += 1;
        store.set(key, entry);

        if (entry.count > max) {
            return res.status(429).json({ error: 'Troppi tentativi. Riprova più tardi.' });
        }

        next();
    };
}

module.exports = rateLimiter;