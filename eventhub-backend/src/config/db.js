// EventHub/eventhub-backend/src/config/db.js

// 1. Commenta l'import di 'pg' se non è strettamente necessario altrove
// const { Pool } = require('pg'); 

// 2. Definisci pool come null o come un oggetto vuoto per evitare ReferenceError
const pool = null; 

const connectDB = async () => {
    try {
        // Commenta il codice che tenta la connessione
        // await pool.connect(); 
        
        console.log('✅ Avviso: Connessione al DB saltata (PostgreSQL non attivo).');
        console.log('Il backend NON si bloccherà, ma le query falliranno.');
        
    } catch (err) {
        // Commenta il codice di gestione dell'errore che ferma il processo
        // console.error('ERRORE: Connessione al database fallita!', err);
        // process.exit(1); 
    }
};

module.exports = { connectDB, pool };