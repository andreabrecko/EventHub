// File: src/config/db.js

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // Necessario per i servizi cloud come Aiven
    ssl: { rejectUnauthorized: false } 
});

pool.on('connect', () => {
    console.log('PostgreSQL: Pool di connessione attiva per eventhub_db.');
});

pool.on('error', (err) => {
    console.error('Errore inatteso sulla pool di connessione DB:', err);
});

// Esporta il metodo di query per usarlo nei controller
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};