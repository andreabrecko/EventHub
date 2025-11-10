// File: src/controllers/adminController.js

const { pool } = require('../config/db');
const socketManager = require('../utils/socketManager');

// --- D.1 Gestione Eventi (Approva/Rifiuta) ---
exports.approveEvent = async (req, res) => {
    const { id: eventId } = req.params;
    const { isApproved } = req.body; // true o false

    if (typeof isApproved !== 'boolean') {
        return res.status(400).json({ error: 'Fornire un valore booleano per isApproved.' });
    }

    try {
        const query = `
            UPDATE Events
            SET is_approved = $1
            WHERE id = $2
            RETURNING id, title, is_approved;
        `;
        const result = await pool.query(query, [isApproved, eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato.' });
        }

        const action = isApproved ? 'approvato' : 'rifiutato';
        // Notifica gli admin (e potenzialmente il creatore) dell'aggiornamento
        const io = socketManager.getIoInstance();
        if (io) {
            io.to('admins').emit('admin:eventUpdated', { event: result.rows[0] });
        }
        res.status(200).json({
            message: `Evento '${result.rows[0].title}' è stato ${action} con successo.`,
            event: result.rows[0]
        });

    } catch (err) {
        console.error("Errore approvazione evento:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- D.2 Gestione Utenti (Blocca/Sblocca) ---
exports.blockUser = async (req, res) => {
    const { id: userId } = req.params;
    const { isBlocked } = req.body; // true o false

    if (typeof isBlocked !== 'boolean') {
        return res.status(400).json({ error: 'Fornire un valore booleano per isBlocked.' });
    }
    
    // Non permettiamo all'admin di bloccare sé stesso o altri admin per prevenzione
    const callingUserId = req.user.id;
    if (callingUserId == userId) {
         return res.status(403).json({ error: 'Non puoi bloccare il tuo stesso account.' });
    }

    try {
        // Nota: Assumiamo che ci sia una colonna `is_blocked` nella tabella Users
        const query = `
            UPDATE Users
            SET is_blocked = $1
            WHERE id = $2 AND role != 'admin' -- Prevenzione: non bloccare gli admin
            RETURNING id, username, role, is_blocked;
        `;
        const result = await pool.query(query, [isBlocked, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato o Utente è un Admin.' });
        }

        const action = isBlocked ? 'bloccato' : 'sbloccato';
        res.status(200).json({
            message: `Utente '${result.rows[0].username}' è stato ${action} con successo.`,
            user: result.rows[0]
        });

    } catch (err) {
        console.error("Errore blocco utente:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- D.3 Ottenere Eventi in attesa di approvazione ---
exports.getPendingEvents = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*, 
                u.username as creator_username,
                COALESCE(p.photos, '[]') AS photos
            FROM Events e
            JOIN Users u ON e.user_id = u.id
            LEFT JOIN LATERAL (
                SELECT json_agg(ep.file_path) AS photos
                FROM EventPhotos ep
                WHERE ep.event_id = e.id
            ) p ON TRUE
            WHERE e.is_approved = FALSE
            ORDER BY e.created_at ASC;
        `;
        const result = await pool.query(query);

        res.status(200).json({
            count: result.rows.length,
            events: result.rows
        });
    } catch (err) {
        console.error("Errore recupero eventi in attesa:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- D.4 Cancellazione Evento da Admin ---
exports.deleteEventAdmin = async (req, res) => {
    const { id: eventId } = req.params;

    try {
        const deleteQuery = 'DELETE FROM Events WHERE id = $1 RETURNING id, title';
        const result = await pool.query(deleteQuery, [eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato.' });
        }

        const io = socketManager.getIoInstance();
        if (io) {
            io.to('admins').emit('admin:eventDeleted', { id: eventId });
        }
        res.status(200).json({ message: `Evento '${result.rows[0].title}' eliminato con successo dall'amministratore.` });

    } catch (err) {
        console.error("Errore cancellazione evento da admin:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- D.5 Ottenere tutti gli utenti ---
exports.getAllUsers = async (req, res) => {
    try {
        const query = `
            SELECT id, username, email, role, is_blocked, created_at
            FROM Users
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query);

        res.status(200).json({
            count: result.rows.length,
            users: result.rows
        });
    } catch (err) {
        console.error("Errore recupero utenti:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};