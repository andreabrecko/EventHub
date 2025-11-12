// File: src/app.js
// Configura l'applicazione Express: middleware globali, rotte, risorse statiche,
// documentazione API e health check.

const express = require('express');
const app = express();
// Inizializzazione applicazione Express
const cors = require('cors');
const path = require('path');
const errorHandler = require('./utils/errorHandler');
const passport = require('passport');
const { configurePassport } = require('./config/passport');
const oauthRoutes = require('./routes/oauthRoutes');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./config/swagger');

// Attiva la connessione al DB importando il file (la pool si avvia)
const { pool } = require('./config/db'); 

// Importa l'aggregatore di rotte
const mainRouter = require('./routes/index');

// --- Middleware Globali ---
app.use(express.json()); // Per parsare i body JSON nelle richieste POST/PUT
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*'
}));
app.use(passport.initialize());
configurePassport();

// Servire il frontend statico (eventhub-client) dal backend
const clientPath = path.join(__dirname, '..', '..', 'eventhub-client');
app.use('/', express.static(clientPath));

// Servire staticamente i file caricati (foto eventi)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Montaggio Rotte ---
app.use('/api', mainRouter); // Tutte le rotte inizieranno con /api
app.use('/api/auth', oauthRoutes);
// Documentazione API (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
    } catch (err) {
        console.error('Errore inizializzazione EventPhotos:', err);
    }
})();

// Middleware di gestione errori (deve essere montato dopo le rotte)
app.use(errorHandler);

module.exports = app;