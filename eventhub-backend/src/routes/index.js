// File: src/routes/index.js

const express = require('express');
const router = express.Router();

// Middleware di logging per tutte le richieste
router.use((req, res, next) => {
    console.log(`Richiesta ricevuta: ${req.method} ${req.originalUrl}`);
    next();
});

const userRoutes = require('./userRoutes');
const eventRoutes = require('./eventRoutes');
const adminRoutes = require('./adminRoutes'); // <--- AGGIUNTA

// --- Montaggio Rotte ---
router.use('/users', userRoutes); 
router.use('/events', eventRoutes); 
router.use('/admin', adminRoutes); // <--- AGGIUNTA

// Endpoint di test salute server
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'API running', service: 'EventHub' });
});

module.exports = router;