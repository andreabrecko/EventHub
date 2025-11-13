// File: src/controllers/adminController.js

const { pool } = require('../config/db');
const socketManager = require('../utils/socketManager');
const bcrypt = require('bcrypt');

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
                COALESCE(p.photos, '[]'::json) AS photos
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

// --- D.6 Gestione Segnalazioni ---
exports.getReportedEvents = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT re.id AS report_id,
                   re.reason,
                   re.status,
                   re.created_at,
                   e.id AS event_id,
                   e.title,
                   e.description,
                   e.event_date,
                   e.location,
                   u.username AS reporter_username,
                   COALESCE(p.photos, '[]'::json) AS photos
            FROM ReportedEvents re
            JOIN Events e ON re.event_id = e.id
            JOIN Users u ON re.reporter_id = u.id
            LEFT JOIN LATERAL (
                SELECT json_agg(ep.file_path) AS photos
                FROM EventPhotos ep
                WHERE ep.event_id = e.id
            ) p ON TRUE
            ORDER BY re.created_at DESC;
        `);
        res.status(200).json({ count: result.rows.length, reports: result.rows });
    } catch (err) {
        console.error('Errore recupero segnalazioni:', err?.message || err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

exports.resolveReport = async (req, res) => {
    const { id: reportId } = req.params;
    const { action } = req.body || {}; // 'remove' | 'keep'
    if (!['remove','keep'].includes(String(action))) {
        return res.status(400).json({ error: 'Azione non valida. Usa remove o keep.' });
    }
    try {
        const rep = await pool.query('SELECT id, event_id FROM ReportedEvents WHERE id = $1', [reportId]);
        if (rep.rows.length === 0) {
            return res.status(404).json({ error: 'Segnalazione non trovata.' });
        }
        const eventId = rep.rows[0].event_id;
        if (action === 'remove') {
            await pool.query('DELETE FROM Events WHERE id = $1', [eventId]);
            await pool.query('UPDATE ReportedEvents SET status = $1 WHERE id = $2', ['removed', reportId]);
            return res.status(200).json({ message: 'Evento eliminato e segnalazione chiusa.', status: 'removed' });
        } else {
            await pool.query('UPDATE ReportedEvents SET status = $1 WHERE id = $2', ['kept', reportId]);
            return res.status(200).json({ message: 'Evento mantenuto. Segnalazione aggiornata.', status: 'kept' });
        }
    } catch (err) {
        console.error('Errore risoluzione segnalazione:', err?.message || err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

exports.createAdminUser = async (req, res) => {
    const { firstName, lastName, username, email, password, phone } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    const isStrongPassword = (pw) => {
        const p = String(pw || '');
        return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
    };
    const isUsernameAllowed = (un) => {
        const normalized = String(un || '').toLowerCase();
        const badWords = ['cazzo','merda','stronzo','puttana','vaffanculo'];
        if (normalized.length < 3 || normalized.length > 20) return false;
        if (!/^[a-z0-9_]+$/i.test(un)) return false;
        return !badWords.some(w => normalized.includes(w));
    };
    const isValidPhone = (ph) => {
        const s = String(ph || '').trim();
        return /^\+?[0-9\s-]{7,20}$/.test(s);
    };
    if (!firstName || !lastName || !username || !email || !password || !phone) {
        return res.status(400).json({ error: 'Fornire tutti i campi richiesti.' });
    }
    if (!emailRegex.test(String(email))) {
        return res.status(400).json({ error: 'Email non valida.' });
    }
    if (!isUsernameAllowed(username)) {
        return res.status(400).json({ error: 'Username non consentito.' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({ error: 'Password troppo debole.' });
    }
    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Numero di telefono non valido.' });
    }
    try {
        const password_hash = await bcrypt.hash(password, 10);
        const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        const cols = colsRes.rows.map(r => String(r.column_name).toLowerCase());
        const insertCols = ['username','email','password_hash','role'];
        const values = [username, email, password_hash, 'admin'];
        if (cols.includes('first_name')) { insertCols.push('first_name'); values.push(firstName); }
        if (cols.includes('last_name')) { insertCols.push('last_name'); values.push(lastName); }
        if (cols.includes('phone')) { insertCols.push('phone'); values.push(phone); }
        if (cols.includes('email_verified')) { insertCols.push('email_verified'); values.push(true); }
        const placeholders = insertCols.map((_, i) => `$${i+1}`);
        const q = `INSERT INTO Users (${insertCols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id, username, email, role${cols.includes('first_name')?', first_name':''}${cols.includes('last_name')?', last_name':''}${cols.includes('phone')?', phone':''}`;
        const r = await pool.query(q, values);
        return res.status(201).json({ message: 'Admin creato con successo.', user: r.rows[0] });
    } catch (err) {
        if (err && err.code === '23505') {
            return res.status(409).json({ error: 'Email già in uso.' });
        }
        console.error('Errore creazione admin:', err?.message || err);
        return res.status(500).json({ error: 'Errore interno del server.', code: err && err.code, message: err && err.message });
    }
};