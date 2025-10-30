// File: src/app.js

const express = require('express');
const app = express();

// Attiva la connessione al DB importando il file (la pool si avvia)
require('./config/db'); 

// Importa l'aggregatore di rotte
const mainRouter = require('./routes/index');

// --- Middleware Globali ---
app.use(express.json()); // Per parsare i body JSON nelle richieste POST/PUT
app.use(express.urlencoded({ extended: true }));

// --- Montaggio Rotte ---
app.use('/api', mainRouter); // Tutte le rotte inizieranno con /api

module.exports = app;