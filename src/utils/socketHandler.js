// File: src/utils/socketHandler.js

const db = require('../config/db');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Nuova connessione Socket.IO: ${socket.id}`);

        // Gestione ingresso nella chat di un evento (Chat interna)
        socket.on('joinEventChat', ({ eventId, userId }) => {
            const roomName = `event_${eventId}`;
            socket.join(roomName);
            
            console.log(`Utente ${userId} ha aderito alla chat ${roomName}`);
            
            // Opzionale: inviare la cronologia chat all'utente appena connesso
        });

        // Gestione invio messaggio nella chat
        socket.on('chatMessage', async ({ eventId, userId, message }) => {
            const roomName = `event_${eventId}`;
            
            if (!message || message.trim() === '') return;

            try {
                // 1. Salva il messaggio nel DB (Tabella ChatMessages)
                const query = 'INSERT INTO ChatMessages (event_id, sender_id, message_text) VALUES ($1, $2, $3) RETURNING sent_at';
                const result = await db.query(query, [eventId, userId, message]);
                
                // 2. Prepara e invia il messaggio in tempo reale
                const messageData = { 
                    senderId: userId, 
                    message: message, 
                    timestamp: result.rows[0].sent_at,
                    // QUI: Aggiungeresti anche username per visualizzazione frontend
                };
                
                // Invia a tutti nella stanza (incluso il mittente)
                io.to(roomName).emit('newMessage', messageData); 
                
            } catch (err) {
                console.error('Errore nel salvataggio/invio messaggio chat:', err);
            }
        });

        // Gestione disconnessione
        socket.on('disconnect', () => {
            // Logica per rimuovere l'utente dalle stanze
        });
    });

    return io; 
};