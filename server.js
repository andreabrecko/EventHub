// File: server.js

// Carica subito le variabili d'ambiente
require('dotenv').config();

const app = require('./src/app'); // Importa la configurazione di Express

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server EventHub in esecuzione sulla porta ${PORT}`);
});