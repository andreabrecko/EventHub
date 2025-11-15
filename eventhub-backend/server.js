// File: server.js
// Punto di ingresso dell'applicazione: avvia Express, Socket.IO e il server HTTP,
// inizializza lo schema e le categorie e gestisce gli errori di processo.

// Carica subito le variabili d'ambiente dal file .env
require('dotenv').config();

const express = require('express');
const app = require('./src/app'); // Importa l'app configurata da src/app.js
const http = require('http'); // Modulo standard per creare un server HTTP
const { Server } = require('socket.io');
const socketManager = require('./src/utils/socketManager');

const PORT = process.env.PORT || 3000;

// --- 1. SETUP SERVER ---

// Crea un server HTTP dal tuo server Express
const server = http.createServer(app);
// Inizializza Socket.IO e condividi l'istanza globalmente
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});
socketManager.setIoInstance(io);
// Se disponibile, collega i listener di socket
try {
    const attachSockets = require('./src/utils/socketHandler');
    attachSockets(io);
} catch (e) {
    console.warn('Socket handler non caricato:', e?.message || e);
}

// Nota: l'endpoint di health è definito in src/app.js

// --- 3. AVVIO ASCOLTO ---

// Avvia il server HTTP
// server.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server EventHub (Simplified) in esecuzione sulla porta ${PORT}`);
// });

// Gestione delle promesse non gestite (Unhandled Promise Rejections)
process.on('unhandledRejection', (err, promise) => {
    console.error(`Errore: ${err.message}`);
    // Chiudi il server e esci dal processo
    server.close(() => process.exit(1));
});

// Gestione delle eccezioni non catturate (Uncaught Exceptions)
process.on('uncaughtException', (err, origin) => {
    console.error(`Errore non catturato: ${err.message}`);
    console.error(`Origine: ${origin}`);
    // Chiudi il server e esci dal processo
    server.close(() => process.exit(1));
});

const { connectDBWithRetry, startKeepAlivePing, pool } = require('./src/config/db');
const { initSchema } = require('./src/config/initSchema');
const { seedCategories } = require('./src/controllers/eventController');
const { validateEmailEnv, verifySMTP } = require('./src/services/emailService');

// Funzione per aggiornare il ruolo di un utente a 'admin' e la sua password
const updateAdminRole = async (email, newPasswordHash) => {
    try {
        const result = await pool.query(
            'UPDATE users SET role = $1, password_hash = $2 WHERE email = $3 RETURNING *;',
            ['admin', newPasswordHash, email]
        );
        // Aggiornamento admin eseguito se l'utente esiste
    } catch (error) {
        console.error(`Errore nell'aggiornamento del ruolo e della password per ${email}:`, error);
    }
};

const startServer = async () => {
    let dbConnected = await connectDBWithRetry({ retries: 5, delayMs: 2000 });
    if (!dbConnected) {
        console.error('Avvio senza DB: impossibile connettersi, il server continuerà a servire risorse statiche e API non-DB.');
        // Tentativi di riconnessione periodici in background
        const reconnector = setInterval(async () => {
            const ok = await connectDBWithRetry({ retries: 1, delayMs: 3000 });
            if (ok) {
                console.log('✅ Riconnessione al DB riuscita. Inizializzo schema e seed...');
                clearInterval(reconnector);
                try { await initSchema(); } catch (err) { console.error('Inizializzazione schema saltata per errore DB:', err?.message || err); }
                try { await seedCategories(); } catch (err) { console.error('Seed categorie saltato per errore DB:', err?.message || err); }
            }
        }, 15000);
        reconnector.unref();
    }

    if (dbConnected) {
        try {
            await initSchema(); // Garantisce la presenza delle tabelle richieste
        } catch (err) {
            console.error('Inizializzazione schema saltata per errore DB:', err?.message || err);
        }
        try {
            await seedCategories(); // Popola le categorie di default se assenti
        } catch (err) {
            console.error('Seed delle categorie saltato per errore DB:', err?.message || err);
        }
    }

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server EventHub (Simplified) in esecuzione sulla porta ${PORT}`);
    });

    if (dbConnected) {
        // Update admin role and password hash if admin@test.com exists
        const newPasswordHash = '$2b$10$ATS/MbYYfvKO525VmkvpsuHq1hOU/76MEOj5AVzRgeUgvRZF2eJPO'; // Hash for 'Password123'
        try {
            await updateAdminRole('admin@test.com', newPasswordHash);
        } catch (err) {
            console.error('Aggiornamento ruolo admin saltato per errore DB:', err?.message || err);
        }
    }

    // Attiva keepalive ping per mantenere la connessione e aggiornare lo stato
    startKeepAlivePing(30000);

    try {
        const v = validateEmailEnv();
        console.log(`Email ENV: ${v.message}`);
        const s = await verifySMTP();
        console.log(`Email Transport: ${s.message}`);
    } catch (e) {
        console.warn('Verifica email non riuscita:', e?.message || e);
    }
};

startServer();