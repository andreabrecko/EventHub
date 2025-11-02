// File: src/controllers/adminController.js

const db = require('../config/db');

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
        const result = await db.query(query, [isApproved, eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato.' });
        }

        const action = isApproved ? 'approvato' : 'rifiutato';
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
        const result = await db.query(query, [isBlocked, userId]);

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
            SELECT e.*, u.username as creator_username
            FROM Events e
            JOIN Users u ON e.user_id = u.id
            WHERE e.is_approved = FALSE
            ORDER BY e.created_at ASC;
        `;
        const result = await db.query(query);

        res.status(200).json({
            count: result.rows.length,
            events: result.rows
        });
    } catch (err) {
        console.error("Errore recupero eventi in attesa:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};