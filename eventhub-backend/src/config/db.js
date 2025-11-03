// EventHub/eventhub-backend/src/config/db.js

const { Pool } = require('pg'); 

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false // Per sviluppo, accetta certificati autofirmati
    }
});

const connectDB = async () => {
    try {
        await pool.connect(); 
        
        console.log('✅ Connesso al database PostgreSQL.');
        
    } catch (err) {
        console.error('ERRORE: Connessione al database fallita!', err);
        process.exit(1); 
    }
};

module.exports = { connectDB, pool };