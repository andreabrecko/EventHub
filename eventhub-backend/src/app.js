// File: src/app.js

const express = require('express');
const app = express();
console.log('app.js initialized'); // Aggiunto per il debug
const cors = require('cors');
const path = require('path');
const errorHandler = require('./utils/errorHandler');

// Attiva la connessione al DB importando il file (la pool si avvia)
const { connectDB, pool } = require('./config/db'); 
connectDB();

// Importa l'aggregatore di rotte
const mainRouter = require('./routes/index');

// --- Middleware Globali ---
app.use(express.json()); // Per parsare i body JSON nelle richieste POST/PUT
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*'
}));

// Servire staticamente i file caricati (foto eventi)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Montaggio Rotte ---
app.use('/api', mainRouter); // Tutte le rotte inizieranno con /api

// Endpoint di test salute server
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'API running', service: 'EventHub - app.js direct' });
});

// Inizializzazione: assicurarsi che la tabella EventPhotos esista
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS EventPhotos (
                id SERIAL PRIMARY KEY,
                event_id INTEGER REFERENCES Events(id) ON DELETE CASCADE,
                file_path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Tabella EventPhotos pronta.');
    } catch (err) {
        console.error('Errore inizializzazione EventPhotos:', err);
    }
})();

// Middleware di gestione errori (deve essere montato dopo le rotte)
app.use(errorHandler);

module.exports = app;