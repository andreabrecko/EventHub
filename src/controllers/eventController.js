// File: src/controllers/eventController.js

const db = require('../config/db');
const socketManager = require('../utils/socketManager'); // <--- AGGIUNTA PER NOTIFICHE LIVE

// --- B.1 Creazione di eventi (Protetta) ---
exports.createEvent = async (req, res) => {
    const { id: user_id } = req.user; 
    const { title, description, date, location, capacity, category_id, image_url } = req.body; 

    if (!title || !description || !date || !location || !capacity || !category_id) {
        return res.status(400).json({ error: 'Fornire tutti i campi obbligatori per l\'evento.' });
    }

    try {
        // La colonna user_id è il creatore dell'evento, come da schema DB (precedentemente creator_id)
        const query = `
            INSERT INTO Events (title, description, event_date, location, capacity, category_id, user_id, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *; 
        `;
        const values = [title, description, date, location, capacity, category_id, user_id, image_url || null];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Evento creato con successo! In attesa di approvazione admin.',
            event: result.rows[0]
        });

    } catch (err) {
        console.error("Errore creazione evento:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.4 Lista eventi pubblici e filtri ---
exports.getEvents = async (req, res) => {
    const { category_id, location, date } = req.query; 

    let query = `
        SELECT 
            e.*, 
            u.username as creator_username, 
            c.name as category_name,
            (SELECT COUNT(*) FROM Registrations r WHERE r.event_id = e.id) as current_registrations
        FROM Events e
        JOIN Users u ON e.user_id = u.id
        LEFT JOIN Categories c ON e.category_id = c.id
        WHERE e.is_approved = TRUE -- Mostra solo eventi approvati (Macro D)
    `;
    const params = [];
    let paramIndex = 1;

    if (category_id) {
        query += ` AND e.category_id = $${paramIndex++}`;
        params.push(category_id);
    }
    if (location) {
        query += ` AND e.location ILIKE $${paramIndex++}`;
        params.push(`%${location}%`);
    }
    if (date) {
        // Filtra per giorno specifico
        query += ` AND DATE(e.event_date) = $${paramIndex++}`;
        params.push(date);
    }
    
    query += ` ORDER BY e.event_date ASC`;

    try {
        const result = await db.query(query, params);
        
        res.status(200).json({
            count: result.rows.length,
            events: result.rows
        });

    } catch (err) {
        console.error("Errore recupero eventi:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.2 Modifica evento (Protetta e Autorizzata) ---
exports.updateEvent = async (req, res) => {
    const { id: eventId } = req.params;
    const { id: userId } = req.user; 
    const { title, description, event_date, location, capacity, category_id, image_url } = req.body;

    try {
        // 1. Autorizzazione: verifica che l'utente sia il creatore
        const checkQuery = 'SELECT user_id FROM Events WHERE id = $1';
        const checkResult = await db.query(checkQuery, [eventId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato.' });
        }
        if (checkResult.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Non sei autorizzato a modificare questo evento.' });
        }
        
        // 2. Costruisci la query di UPDATE dinamica
        let setClauses = [];
        let updateParams = [];
        let paramIndex = 1;

        if (title !== undefined) { setClauses.push(`title = $${paramIndex++}`); updateParams.push(title); }
        if (description !== undefined) { setClauses.push(`description = $${paramIndex++}`); updateParams.push(description); }
        if (event_date !== undefined) { setClauses.push(`event_date = $${paramIndex++}`); updateParams.push(event_date); }
        if (location !== undefined) { setClauses.push(`location = $${paramIndex++}`); updateParams.push(location); }
        if (capacity !== undefined) { setClauses.push(`capacity = $${paramIndex++}`); updateParams.push(capacity); }
        if (category_id !== undefined) { setClauses.push(`category_id = $${paramIndex++}`); updateParams.push(category_id); }
        if (image_url !== undefined) { setClauses.push(`image_url = $${paramIndex++}`); updateParams.push(image_url); }
        
        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'Nessun campo valido fornito per la modifica.' });
        }

        const updateQuery = `
            UPDATE Events
            SET ${setClauses.join(', ')}, created_at = NOW() -- Usiamo created_at come timestamp di modifica
            WHERE id = $${paramIndex++}
            RETURNING *;
        `;
        updateParams.push(eventId); 

        const updateResult = await db.query(updateQuery, updateParams);

        res.status(200).json({
            message: 'Evento aggiornato con successo!',
            event: updateResult.rows[0]
        });

    } catch (err) {
        console.error("Errore aggiornamento evento:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.3 Cancellazione evento (Protetta e Autorizzata) ---
exports.deleteEvent = async (req, res) => {
    const { id: eventId } = req.params;
    const { id: userId } = req.user; 

    try {
        // 1. Autorizzazione: verifica che l'utente sia il creatore
        const checkQuery = 'SELECT user_id FROM Events WHERE id = $1';
        const checkResult = await db.query(checkQuery, [eventId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato.' });
        }
        if (checkResult.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Non sei autorizzato a cancellare questo evento.' });
        }

        // 2. Esegue la cancellazione
        const deleteQuery = 'DELETE FROM Events WHERE id = $1 RETURNING id';
        await db.query(deleteQuery, [eventId]);

        res.status(204).send(); // 204 No Content

    } catch (err) {
        console.error("Errore cancellazione evento:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.5 Iscrizione a un evento (Protetta) ---
exports.registerForEvent = async (req, res) => {
    const { id: event_id } = req.params;
    const { id: user_id, username } = req.user; // Otteniamo l'ID e il ruolo/username dal token

    try {
        // 1. Verifica se l'utente è già iscritto
        const existsQuery = 'SELECT * FROM Registrations WHERE user_id = $1 AND event_id = $2';
        const existsResult = await db.query(existsQuery, [user_id, event_id]);

        if (existsResult.rows.length > 0) {
            return res.status(409).json({ error: 'Sei già iscritto a questo evento.' });
        }

        // 2. Verifica capienza e stato evento (deve essere approvato e nel futuro)
        const eventQuery = `
            SELECT capacity 
            FROM Events 
            WHERE id = $1 AND event_date > CURRENT_TIMESTAMP AND is_approved = TRUE
        `;
        const eventResult = await db.query(eventQuery, [event_id]);
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato, non approvato o già concluso.' });
        }
        const eventCapacity = eventResult.rows[0].capacity;
        
        // 3. Verifica capienza
        const countQuery = 'SELECT COUNT(*) FROM Registrations WHERE event_id = $1';
        const countResult = await db.query(countQuery, [event_id]);
        const currentRegistrations = parseInt(countResult.rows[0].count, 10);

        if (currentRegistrations >= eventCapacity) {
            return res.status(400).json({ error: 'Evento al completo. Capienza massima raggiunta.' });
        }

        // 4. Inserisci la registrazione
        const insertQuery = 'INSERT INTO Registrations (user_id, event_id) VALUES ($1, $2) RETURNING *';
        await db.query(insertQuery, [user_id, event_id]);

        res.status(201).json({ message: 'Iscrizione all\'evento avvenuta con successo.' });

        // --- C. Notifica Live: Notifica live quando qualcuno si iscrive ---
        const io = socketManager.getIoInstance();
        if (io) {
            io.to(`event_${event_id}`).emit('registrationChange', { 
                eventId: event_id, 
                userId: user_id, 
                username: username || 'Utente',
                action: 'registered',
                message: `🎉 Nuova iscrizione! ${username} si è unito/a.` 
            });
        }
    } catch (err) {
        console.error("Errore iscrizione evento:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.5 Annullamento iscrizione (Protetta) ---
exports.unregisterFromEvent = async (req, res) => {
    const { id: event_id } = req.params;
    const { id: user_id, username } = req.user; 

    try {
        const deleteQuery = 'DELETE FROM Registrations WHERE user_id = $1 AND event_id = $2 RETURNING *';
        const result = await db.query(deleteQuery, [user_id, event_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Nessuna iscrizione trovata per questo utente a questo evento.' });
        }
        
        res.status(200).json({ message: 'Annullamento iscrizione avvenuto con successo.' });

        // --- C. Notifica Live: Notifica live quando qualcuno annulla l'iscrizione ---
        const io = socketManager.getIoInstance();
        if (io) {
            io.to(`event_${event_id}`).emit('registrationChange', { 
                eventId: event_id, 
                userId: user_id, 
                username: username || 'Utente',
                action: 'unregistered',
                message: `❌ ${username} ha annullato l'iscrizione.`
            });
        }

    } catch (err) {
        console.error("Errore annullamento iscrizione:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};