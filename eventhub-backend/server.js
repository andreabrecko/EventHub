// File: server.js
console.log('Server.js started!');

// Carica subito le variabili d'ambiente dal file .env
require('dotenv').config();

const express = require('express');
const app = require('./src/app'); // Importa l'app configurata da src/app.js
const http = require('http'); // Modulo standard per creare un server HTTP

const PORT = process.env.PORT || 3000;

// --- 1. SETUP SERVER ---

// Crea un server HTTP dal tuo server Express
const server = http.createServer(app);

// Rotta di test semplice
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'API running', service: 'EventHub - Simplified' });
});

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

const { connectDB, pool } = require('./src/config/db');
const { seedCategories } = require('./src/controllers/eventController');

const startServer = async () => {
    await connectDB();
    await seedCategories(); // Call seedCategories after connecting to DB
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server EventHub (Simplified) in esecuzione sulla porta ${PORT}`);
    });
};

startServer();