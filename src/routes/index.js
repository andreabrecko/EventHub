// File: src/routes/index.js

const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');

// --- Montaggio Rotte ---
// Tutti gli endpoint saranno /api/users/...
router.use('/users', userRoutes); 

// Endpoint di test generale per verificare che il server sia attivo
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'API running', service: 'EventHub' });
});

module.exports = router;