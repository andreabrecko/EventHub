// File: src/utils/socketHandler.js

const { pool } = require('../config/db');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Nuova connessione Socket.IO: ${socket.id}`);

        // Consenti ai client admin di unirsi alla stanza "admins" per notifiche
        socket.on('joinAdmin', () => {
            socket.join('admins');
            console.log(`Socket ${socket.id} ha aderito alla stanza admins`);
        });

        // Gestione ingresso nella chat di un evento (Chat interna)
        socket.on('joinEventChat', async ({ eventId, userId }) => {
            const roomName = `event_${eventId}`;
            socket.join(roomName);
            
            console.log(`Utente ${userId} ha aderito alla chat ${roomName}`);
            
            // Opzionale: inviare la cronologia chat all'utente appena connesso
            try {
                const historyRes = await pool.query(
                    `SELECT cm.sender_id AS senderId, u.username, cm.message_text AS message, cm.sent_at AS timestamp
                     FROM ChatMessages cm
                     JOIN Users u ON u.id = cm.sender_id
                     WHERE cm.event_id = $1
                     ORDER BY cm.sent_at ASC
                     LIMIT 50`,
                    [eventId]
                );
                socket.emit('chatHistory', historyRes.rows);
            } catch (err) {
                console.error('Errore nel recupero cronologia chat:', err);
            }
        });

        // Gestione invio messaggio nella chat
        socket.on('chatMessage', async ({ eventId, userId, message }) => {
            const roomName = `event_${eventId}`;
            
            if (!message || message.trim() === '') return;

            try {
                // 1. Salva il messaggio nel DB (Tabella ChatMessages)
                const query = 'INSERT INTO ChatMessages (event_id, sender_id, message_text) VALUES ($1, $2, $3) RETURNING sent_at';
                const result = await pool.query(query, [eventId, userId, message]);
                
                // 2. Recupera lo username del mittente per visualizzazione frontend
                let username = '';
                try {
                    const userRes = await pool.query('SELECT username FROM Users WHERE id = $1', [userId]);
                    username = userRes.rows?.[0]?.username || '';
                } catch (e) {
                    // Se fallisce, prosegui senza username
                }

                // 3. Prepara e invia il messaggio in tempo reale
                const messageData = { 
                    senderId: userId, 
                    username,
                    message: message, 
                    timestamp: result.rows[0].sent_at,
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