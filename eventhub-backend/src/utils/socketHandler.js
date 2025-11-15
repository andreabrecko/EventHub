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
        socket.on('joinEventChat', async ({ eventId }) => {
            const roomName = `event_${eventId}`;
            const user = socket.user; // impostato dal middleware handshake se token valido
            if (!user || !user.id) {
                return socket.emit('chatError', { message: 'Autenticazione richiesta per la chat.' });
            }

            try {
                // Verifica che l'utente non sia bloccato
                const uRes = await pool.query('SELECT email_verified, is_blocked FROM Users WHERE id = $1', [user.id]);
                const uRow = uRes.rows?.[0] || {};
                if (uRow.is_blocked === true) {
                    return socket.emit('chatError', { message: 'Account bloccato. Accesso alla chat negato.' });
                }
                if (uRow.email_verified !== true) {
                    return socket.emit('chatError', { message: 'Email non verificata. Verifica per usare la chat.' });
                }

                // Verifica se è creatore dell'evento o iscritto
                const ownerColRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'");
                const cols = ownerColRes.rows.map(r => String(r.column_name).toLowerCase());
                const ownerCol = cols.includes('user_id') ? 'user_id' : (cols.includes('creator_id') ? 'creator_id' : 'user_id');
                const ownRes = await pool.query(`SELECT ${ownerCol} AS owner_id FROM Events WHERE id = $1`, [eventId]);
                const isOwner = ownRes.rows?.[0]?.owner_id === user.id;
                let isRegistered = false;
                if (!isOwner) {
                    const regRes = await pool.query('SELECT 1 FROM Registrations WHERE user_id = $1 AND event_id = $2', [user.id, eventId]);
                    isRegistered = regRes.rows.length > 0;
                }
                if (!isOwner && !isRegistered) {
                    return socket.emit('chatError', { message: 'Accesso negato: la chat è riservata ai partecipanti.' });
                }

                socket.join(roomName);
                console.log(`Utente ${user.id} ha aderito alla chat ${roomName}`);

                // Invia cronologia chat
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
            } catch (err) {
                console.error('Errore joinEventChat:', err?.message || err);
                socket.emit('chatError', { message: 'Errore durante l’ingresso in chat.' });
            }
        });

        // Gestione invio messaggio nella chat
        socket.on('chatMessage', async ({ eventId, message }) => {
            const roomName = `event_${eventId}`;
            const user = socket.user;
            if (!message || message.trim() === '') return;

            if (!user || !user.id) {
                return socket.emit('chatError', { message: 'Autenticazione richiesta per inviare messaggi.' });
            }

            try {
                // Verifica blocco e email verificata
                const uRes = await pool.query('SELECT email_verified, is_blocked FROM Users WHERE id = $1', [user.id]);
                const uRow = uRes.rows?.[0] || {};
                if (uRow.is_blocked === true) {
                    return socket.emit('chatError', { message: 'Account bloccato. Invio messaggi negato.' });
                }
                if (uRow.email_verified !== true) {
                    return socket.emit('chatError', { message: 'Email non verificata. Non puoi inviare messaggi.' });
                }

                // Verifica autorizzazione (owner o iscritto)
                const ownerColRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'");
                const cols = ownerColRes.rows.map(r => String(r.column_name).toLowerCase());
                const ownerCol = cols.includes('user_id') ? 'user_id' : (cols.includes('creator_id') ? 'creator_id' : 'user_id');
                const ownRes = await pool.query(`SELECT ${ownerCol} AS owner_id FROM Events WHERE id = $1`, [eventId]);
                const isOwner = ownRes.rows?.[0]?.owner_id === user.id;
                let isRegistered = false;
                if (!isOwner) {
                    const regRes = await pool.query('SELECT 1 FROM Registrations WHERE user_id = $1 AND event_id = $2', [user.id, eventId]);
                    isRegistered = regRes.rows.length > 0;
                }
                if (!isOwner && !isRegistered) {
                    return socket.emit('chatError', { message: 'Non autorizzato: la chat è riservata ai partecipanti.' });
                }

                // Salva il messaggio nel DB
                const query = 'INSERT INTO ChatMessages (event_id, sender_id, message_text) VALUES ($1, $2, $3) RETURNING sent_at';
                const result = await pool.query(query, [eventId, user.id, message]);

                // Recupera username
                let username = '';
                try {
                    const userRes = await pool.query('SELECT username FROM Users WHERE id = $1', [user.id]);
                    username = userRes.rows?.[0]?.username || '';
                } catch (_) {}

                // Invia messaggio in stanza
                const messageData = {
                    eventId,
                    senderId: user.id,
                    username,
                    message,
                    timestamp: result.rows[0].sent_at,
                };
                io.to(roomName).emit('newMessage', messageData);
            } catch (err) {
                console.error('Errore nel salvataggio/invio messaggio chat:', err);
                socket.emit('chatError', { message: 'Errore durante l’invio del messaggio.' });
            }
        });

        // Gestione disconnessione
        socket.on('disconnect', () => {
            // Logica per rimuovere l'utente dalle stanze
        });
    });

    return io; 
};