// File: src/app.js

const express = require('express');
const app = express();
console.log('app.js initialized'); // Aggiunto per il debug
const cors = require('cors');

// Attiva la connessione al DB importando il file (la pool si avvia)
const { connectDB } = require('./config/db'); 
connectDB();

// Importa l'aggregatore di rotte
const mainRouter = require('./routes/index');

// --- Middleware Globali ---
app.use(express.json()); // Per parsare i body JSON nelle richieste POST/PUT
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*'
}));

// --- Montaggio Rotte ---
app.use('/api', mainRouter); // Tutte le rotte inizieranno con /api

// Endpoint di test salute server
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'API running', service: 'EventHub - app.js direct' });
});

module.exports = app;