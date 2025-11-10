// EventHub/eventhub-backend/src/config/db.js

const { Pool } = require('pg'); 

// Abilita SSL solo in produzione o se esplicitamente richiesto via env
const useSSL = (process.env.DB_SSL === 'true') || (process.env.NODE_ENV === 'production');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
    ssl: useSSL ? { rejectUnauthorized: false } : false
});

let isConnected = false;
const connectDB = async () => {
    if (isConnected) {
        return; // Evita riconnessioni multiple
    }
    try {
        // Esegue una semplice query di health-check senza trattenere un client
        await pool.query('SELECT 1');
        isConnected = true;
        console.log('✅ Connesso al database PostgreSQL.');
    } catch (err) {
        console.error('ERRORE: Connessione al database fallita!', err.message);
        console.error('Verifica che PostgreSQL sia avviato e le variabili .env siano corrette.');
        process.exit(1); 
    }
};

module.exports = { connectDB, pool };