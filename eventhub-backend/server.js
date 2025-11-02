// File: server.js

// Carica subito le variabili d'ambiente dal file .env
require('dotenv').config();

const app = require('./src/app'); 
const http = require('http'); // Modulo standard per creare un server HTTP
const { Server } = require('socket.io'); // Importa la classe Server di Socket.IO

// Importa i gestori di utility per Socket.IO
const socketManager = require('./src/utils/socketManager'); 
const socketHandler = require('./src/utils/socketHandler'); 

const PORT = process.env.PORT || 3000;

// --- 1. SETUP SERVER ---

// Crea un server HTTP dal tuo server Express (necessario per Socket.IO)
const server = http.createServer(app);

// Collega Socket.IO al server HTTP
const io = new Server(server, {
    cors: {
        // Consente connessioni da qualsiasi origine (utile in sviluppo)
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// --- 2. GESTIONE SOCKET.IO ---

// Imposta l'istanza IO nel manager.
// Questo permette ai controller (es. eventController per le notifiche) di accedere a 'io'.
socketManager.setIoInstance(io); 

// Avvia la logica di gestione delle connessioni Socket.IO (Chat, Join Room, ecc.)
socketHandler(io); 

// --- 3. AVVIO ASCOLTO ---

// Avvia il server HTTP (che gestisce sia Express che Socket.IO)
server.listen(PORT, () => {
    console.log(`Server EventHub in esecuzione sulla porta ${PORT}`);
    console.log(`API REST in ascolto su http://localhost:${PORT}/api`);
    console.log(`Socket.IO (Real-Time) attivo sulla porta ${PORT}`);
});