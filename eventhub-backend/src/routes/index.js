// File: src/routes/index.js
// Aggregatore delle rotte principali dell'API. Centralizza:
// - montaggio di rotte utente, eventi e amministratore
// - logging di richieste in ambiente non production
// - endpoint di health per monitoraggio base

const express = require('express');
const router = express.Router();

// Middleware di logging per tutte le richieste (solo in non-produzione)
// Utile per osservare rapidamente il traffico durante lo sviluppo.
router.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Richiesta ricevuta: ${req.method} ${req.originalUrl}`);
    }
    next();
});

const userRoutes = require('./userRoutes');
const eventRoutes = require('./eventRoutes');
const adminRoutes = require('./adminRoutes'); // <--- AGGIUNTA

// --- Montaggio Rotte ---
// Tutti gli endpoint esposti da questi router saranno prefissati da /api nel file app.js
router.use('/users', userRoutes); 
router.use('/events', eventRoutes); 
router.use('/admin', adminRoutes); // <--- AGGIUNTA

// Endpoint di health per verificare disponibilità API
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'API running', service: 'EventHub' });
});

module.exports = router;