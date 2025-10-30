// File: src/controllers/eventController.js

const db = require('../config/db');

// --- B.1 Creazione di eventi (Protetta) ---
exports.createEvent = async (req, res) => {
    const { id: user_id } = req.user; // ID dell'utente loggato (creatore)
    const { title, description, date, location, capacity, category_id, image_url } = req.body; 

    if (!title || !description || !date || !location || !capacity || !category_id) {
        return res.status(400).json({ error: 'Fornire tutti i campi obbligatori.' });
    }

    try {
        const query = `
            INSERT INTO Events (title, description, date, location, capacity, category_id, user_id, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *; 
        `;
        const values = [title, description, date, location, capacity, category_id, user_id, image_url || null];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'Evento creato con successo!',
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
            c.name as category_name
        FROM Events e
        JOIN Users u ON e.user_id = u.id
        JOIN Categories c ON e.category_id = c.id
        WHERE e.is_approved = TRUE -- Mostra solo eventi approvati (assunto per la logica Admin)
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
        query += ` AND DATE(e.date) = $${paramIndex++}`;
        params.push(date);
    }
    
    query += ` ORDER BY e.date ASC`;

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
    const { title, description, date, location, capacity, category_id, image_url } = req.body;

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
        // ... (aggiungi tutti gli altri campi modificabili)
        if (location !== undefined) { setClauses.push(`location = $${paramIndex++}`); updateParams.push(location); }
        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'Nessun campo valido fornito per la modifica.' });
        }

        const updateQuery = `
            UPDATE Events
            SET ${setClauses.join(', ')}, updated_at = NOW()
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
    const { id: user_id } = req.user; 

    try {
        // ... (Logica di verifica capienza e se l'utente è già iscritto, omessa per brevità, usa il codice precedente) ...
        
        // Inserisci la registrazione (Assumiamo la tabella Registrations)
        const insertQuery = 'INSERT INTO Registrations (user_id, event_id) VALUES ($1, $2) RETURNING *';
        await db.query(insertQuery, [user_id, event_id]);

        res.status(201).json({ message: 'Iscrizione all\'evento avvenuta con successo.' });

    } catch (err) {
        console.error("Errore iscrizione evento:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.5 Annullamento iscrizione (Protetta) ---
exports.unregisterFromEvent = async (req, res) => {
    const { id: event_id } = req.params;
    const { id: user_id } = req.user; 

    try {
        const deleteQuery = 'DELETE FROM Registrations WHERE user_id = $1 AND event_id = $2 RETURNING *';
        const result = await db.query(deleteQuery, [user_id, event_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Nessuna iscrizione trovata.' });
        }
        
        res.status(200).json({ message: 'Annullamento iscrizione avvenuto con successo.' });

    } catch (err) {
        console.error("Errore annullamento iscrizione:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};