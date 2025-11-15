// Simple in-memory rate limiter middleware.
// Keyed by IP + route path, blocks after `max` hits within `windowMs`.
// No external deps; suitable for small deployments. For horizontal scaling, use Redis.

const store = new Map();

function keyFor(req) {
  // Use IP and baseUrl+path to differentiate endpoints
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  return `${ip}:${req.baseUrl}${req.path}`;
}

function rateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  return function (req, res, next) {
    const key = keyFor(req);
    const now = Date.now();

    const entry = store.get(key) || [];
    // Drop timestamps older than window
    const fresh = entry.filter(ts => now - ts < windowMs);
    fresh.push(now);
    store.set(key, fresh);

    if (fresh.length > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: message, windowMs, max });
    }
    next();
  };
}

// Presets for common sensitive routes
const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Troppi tentativi di login. Riprova più tardi.' });
const emailLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Rate limit per operazioni email raggiunto. Riprova più tardi.' });

module.exports = rateLimiter;
module.exports.authLimiter = authLimiter;
module.exports.emailLimiter = emailLimiter;