// File: src/controllers/eventController.js

const { pool } = require('../config/db');
const socketManager = require('../utils/socketManager'); // <--- AGGIUNTA PER NOTIFICHE LIVE
const { initSchema } = require('../config/initSchema');

// Fallback: assicura le tabelle principali in modo idempotente
async function ensureCoreSchema() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
                email_verified BOOLEAN NOT NULL DEFAULT FALSE,
                verification_token TEXT,
                verification_token_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Categories (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL
            );
        `);
        // Seed di base (idempotente)
        await pool.query(`
            INSERT INTO Categories (name)
            VALUES
                ('Benessere'),
                ('Cultura'),
                ('Sport'),
                ('Musica'),
                ('Tecnologia'),
                ('Sociale'),
                ('Food & Drink')
            ON CONFLICT (name) DO NOTHING;
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Events (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                event_date TIMESTAMP NOT NULL,
                location TEXT NOT NULL,
                capacity INTEGER NOT NULL CHECK (capacity > 0),
                category_id INTEGER REFERENCES Categories(id) ON DELETE SET NULL,
                user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
                is_approved BOOLEAN NOT NULL DEFAULT FALSE,
                min_participants INTEGER,
                max_participants INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Registrations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
                registered_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (user_id, event_id)
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS EventPhotos (
                id SERIAL PRIMARY KEY,
                event_id INTEGER REFERENCES Events(id) ON DELETE CASCADE,
                file_path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ChatMessages (
                id SERIAL PRIMARY KEY,
                event_id INTEGER REFERENCES Events(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
                message_text TEXT NOT NULL,
                sent_at TIMESTAMP DEFAULT NOW()
            );
        `);
    } catch (e) {
        console.error('ensureCoreSchema error:', e?.message || e);
        throw e;
    }
}

// Crea un evento a partire dai dati del form multipart.
// Valida i campi, normalizza data/ora, verifica lo schema e inserisce l'evento.
// Supporta schemi variabili (creator_id/user_id, min/max_participants) e salva eventuali foto.
const createEvent = async (req, res) => {
    const { id: user_id } = req.user;
    let { title, description, date, location, capacity, category_id, min_participants, max_participants } = req.body;

    if (!title || !description || !date || !location || !capacity || !category_id) {
        return res.status(400).json({ error: "Fornire tutti i campi obbligatori per l'evento." });
    }

    // Normalizza tipi
    capacity = Number(capacity);
    category_id = Number(category_id);
    min_participants = (min_participants !== undefined && min_participants !== null) ? Number(min_participants) : null;
    max_participants = (max_participants !== undefined && max_participants !== null) ? Number(max_participants) : null;

    if (!Number.isFinite(capacity) || capacity <= 0) {
        return res.status(400).json({ error: 'Capacità non valida.' });
    }
    if (!Number.isInteger(category_id) || category_id <= 0) {
        return res.status(400).json({ error: 'Categoria non valida.' });
    }

    // Normalizza data: accetta 'YYYY-MM-DDTHH:mm' oppure 'DD/MM/YYYY' (+ opzionale time)
    let eventDateIso = null;
    try {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(date))) {
            eventDateIso = new Date(date);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(date)) && req.body.time) {
            eventDateIso = new Date(`${date}T${req.body.time}`);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(date))) {
            const [d, m, y] = String(date).split('/').map(s => Number(s));
            const hh = (req.body.time && /^\d{2}:\d{2}$/.test(req.body.time)) ? Number(req.body.time.split(':')[0]) : 12;
            const mm = (req.body.time && /^\d{2}:\d{2}$/.test(req.body.time)) ? Number(req.body.time.split(':')[1]) : 0;
            eventDateIso = new Date(y, m - 1, d, hh, mm, 0);
        } else {
            // tenta parse generico
            eventDateIso = new Date(date);
        }
        if (!(eventDateIso instanceof Date) || Number.isNaN(eventDateIso.getTime())) {
            return res.status(400).json({ error: 'Formato data/ora non valido.' });
        }
    } catch (_) {
        return res.status(400).json({ error: 'Formato data/ora non valido.' });
    }

    // Best-effort: assicurati che lo schema esista prima di procedere
    try {
        const ev = await pool.query("SELECT to_regclass('public.events') AS exists");
        const cat = await pool.query("SELECT to_regclass('public.categories') AS exists");
        if (!ev.rows[0]?.exists || !cat.rows[0]?.exists) {
            try { await initSchema(); } catch (_) { await ensureCoreSchema(); }
        }
    } catch (schemaCheckErr) {
        console.warn('Verifica schema non riuscita; applico fallback:', schemaCheckErr?.message || schemaCheckErr);
        try { await ensureCoreSchema(); } catch (_) {}
    }

    try {
        // Verifica categoria esistente
        const catCheck = await pool.query('SELECT id FROM Categories WHERE id = $1', [category_id]);
        if (catCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Categoria inesistente.' });
        }

        // 1) Crea l'evento (user_id è il creatore). Imposta is_approved = FALSE
        const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'");
        const cols = colsRes.rows.map(r => String(r.column_name).toLowerCase());
        const hasMin = cols.includes('min_participants');
        const hasMax = cols.includes('max_participants');
        let insertCols = ['title','description','event_date','location','capacity','category_id'];
        let placeholders = ['$1','$2','$3','$4','$5','$6'];
        let insertVals = [title, description, eventDateIso.toISOString(), location, capacity, category_id];
        if (cols.includes('creator_id')) { insertCols.push('creator_id'); placeholders.push(`$${placeholders.length+1}`); insertVals.push(user_id); }
        if (cols.includes('user_id')) { insertCols.push('user_id'); placeholders.push(`$${placeholders.length+1}`); insertVals.push(user_id); }
        if (hasMin) { insertCols.push('min_participants'); placeholders.push(`$${placeholders.length+1}`); insertVals.push(min_participants); }
        if (hasMax) { insertCols.push('max_participants'); placeholders.push(`$${placeholders.length+1}`); insertVals.push(max_participants); }
        insertCols.push('is_approved'); placeholders.push(`$${placeholders.length+1}`); insertVals.push(false);
        const insertEventQuery = `INSERT INTO Events (${insertCols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *;`;
        const eventResult = await pool.query(insertEventQuery, insertVals);
        const newEvent = eventResult.rows[0];

        // 2) Assicurati che la tabella EventPhotos esista
        await pool.query(`
            CREATE TABLE IF NOT EXISTS EventPhotos (
                id SERIAL PRIMARY KEY,
                event_id INTEGER REFERENCES Events(id) ON DELETE CASCADE,
                file_path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 3) Se sono presenti file caricati, salva i percorsi nella tabella EventPhotos
        if (Array.isArray(req.files) && req.files.length > 0) {
            const insertPhotoQuery = `
                INSERT INTO EventPhotos (event_id, file_path)
                VALUES ($1, $2)
                RETURNING id;
            `;
            for (const file of req.files) {
                const publicPath = `/uploads/events/${file.filename}`;
                await pool.query(insertPhotoQuery, [newEvent.id, publicPath]);
            }
        }

        // Notifica gli admin in tempo reale dell'evento creato
        const io = socketManager.getIoInstance();
        if (io) {
            io.to('admins').emit('admin:eventCreated', { event: newEvent });
        }

        res.status(201).json({
            message: 'Evento creato con successo! In attesa di approvazione admin.',
            event: newEvent
        });

    } catch (err) {
        console.error('Errore creazione evento:', err);
        // Mappatura specifica degli errori Postgres per risposte più chiare
        const code = err && err.code ? String(err.code) : '';
        const msg = String(err?.message || '').toLowerCase();
        const constraint = String(err?.constraint || '').toLowerCase();

        // Errori di data/ora o parsing
        if (code === '22007' || code === '22P02' || msg.includes('invalid input syntax for type timestamp') || msg.includes('date/time')) {
            return res.status(400).json({ error: 'Data/ora evento non valida.' });
        }
        // Violazioni NOT NULL
        if (code === '23502' || msg.includes('null value in column')) {
            return res.status(400).json({ error: 'Campi obbligatori mancanti.' });
        }
        // Violazioni chiavi esterne
        if (code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key')) {
            if (constraint.includes('category') || constraint.includes('events_category_id')) {
                return res.status(400).json({ error: 'Categoria non valida.' });
            }
            if (constraint.includes('user') || constraint.includes('events_user_id')) {
                return res.status(400).json({ error: 'Utente non valido. Effettua nuovamente il login.' });
            }
            return res.status(400).json({ error: 'Riferimenti non validi (utente/categoria).' });
        }
        // Tabelle o colonne mancanti (schema non inizializzato)
        if (code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))) {
            try { await initSchema(); } catch (_) { await ensureCoreSchema(); }
            // Dopo l'inizializzazione, prova una sola volta a rieseguire la creazione
            try {
                // Verifica categoria esistente
                const catCheck2 = await pool.query('SELECT id FROM Categories WHERE id = $1', [category_id]);
                if (catCheck2.rows.length === 0) {
                    return res.status(400).json({ error: 'Categoria inesistente.' });
                }
                const colsRes2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'");
                const cols2 = colsRes2.rows.map(r => String(r.column_name).toLowerCase());
                const hasMin2 = cols2.includes('min_participants');
                const hasMax2 = cols2.includes('max_participants');
                let insertCols2 = ['title','description','event_date','location','capacity','category_id'];
                let placeholders2 = ['$1','$2','$3','$4','$5','$6'];
                let insertVals2 = [title, description, eventDateIso.toISOString(), location, capacity, category_id];
                if (cols2.includes('creator_id')) { insertCols2.push('creator_id'); placeholders2.push(`$${placeholders2.length+1}`); insertVals2.push(user_id); }
                if (cols2.includes('user_id')) { insertCols2.push('user_id'); placeholders2.push(`$${placeholders2.length+1}`); insertVals2.push(user_id); }
                if (hasMin2) { insertCols2.push('min_participants'); placeholders2.push(`$${placeholders2.length+1}`); insertVals2.push(min_participants); }
                if (hasMax2) { insertCols2.push('max_participants'); placeholders2.push(`$${placeholders2.length+1}`); insertVals2.push(max_participants); }
                insertCols2.push('is_approved'); placeholders2.push(`$${placeholders2.length+1}`); insertVals2.push(false);
                const insertEventQuery2 = `INSERT INTO Events (${insertCols2.join(',')}) VALUES (${placeholders2.join(',')}) RETURNING *;`;
                const eventResult2 = await pool.query(insertEventQuery2, insertVals2);
                const newEvent2 = eventResult2.rows[0];
                // Foto
                if (Array.isArray(req.files) && req.files.length > 0) {
                    const insertPhotoQuery2 = `
                        INSERT INTO EventPhotos (event_id, file_path)
                        VALUES ($1, $2)
                        RETURNING id;
                    `;
                    for (const file of req.files) {
                        const publicPath = `/uploads/events/${file.filename}`;
                        await pool.query(insertPhotoQuery2, [newEvent2.id, publicPath]);
                    }
                }
                const io = socketManager.getIoInstance();
                if (io) io.to('admins').emit('admin:eventCreated', { event: newEvent2 });
                return res.status(201).json({ message: 'Evento creato con successo! In attesa di approvazione admin.', event: newEvent2 });
            } catch (retryErr) {
                console.error('Retry createEvent dopo initSchema fallito:', retryErr);
                return res.status(500).json({ error: 'Errore interno dopo inizializzazione schema.' });
            }
        }
        if (code === '42703') {
            return res.status(500).json({ error: 'Schema DB non compatibile. Controlla le colonne della tabella Events.' });
        }
        // Fallback
        return res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.4 Lista eventi pubblici e filtri ---
const getEvents = async (req, res) => {
    const { category_id, location, date } = req.query; 

    // Determina dinamicamente la colonna del creatore (user_id o creator_id)
    let ownerCol = 'user_id';
    try {
        const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'");
        const cols = colsRes.rows.map(r => String(r.column_name).toLowerCase());
        ownerCol = cols.includes('user_id') ? 'user_id' : (cols.includes('creator_id') ? 'creator_id' : 'user_id');
    } catch (_) {}

    let query = `
        SELECT 
            e.*, 
            u.username as creator_username, 
            c.name as category_name,
            (SELECT COUNT(*) FROM Registrations r WHERE r.event_id = e.id) as current_registrations,
            COALESCE(p.photos, '[]'::json) AS photos
        FROM Events e
        JOIN Users u ON e.${ownerCol} = u.id
        LEFT JOIN Categories c ON e.category_id = c.id
        LEFT JOIN LATERAL (
            SELECT json_agg(ep.file_path) AS photos
            FROM EventPhotos ep
            WHERE ep.event_id = e.id
        ) p ON TRUE
        WHERE 1=1
    `;
    // Mostra solo eventi approvati
    query += ` AND e.is_approved = TRUE`;
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
        const result = await pool.query(query, params);
        
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
const updateEvent = async (req, res) => {
    const { id: eventId } = req.params;
    const { id: userId } = req.user; 
    const { title, description, event_date, location, capacity, category_id } = req.body;

    try {
        // 1. Autorizzazione: verifica che l'utente sia il creatore
        const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'");
        const cols = colsRes.rows.map(r => String(r.column_name).toLowerCase());
        const ownerCol = cols.includes('user_id') ? 'user_id' : (cols.includes('creator_id') ? 'creator_id' : 'user_id');
        const checkQuery = `SELECT ${ownerCol} AS owner_id FROM Events WHERE id = $1`;
        const checkResult = await pool.query(checkQuery, [eventId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato.' });
        }
        if (checkResult.rows[0].owner_id !== userId) {
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
        
        
        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'Nessun campo valido fornito per la modifica.' });
        }

        const updateQuery = `
            UPDATE Events
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex++}
            RETURNING *;
        `;
        updateParams.push(eventId); 

        const updateResult = await pool.query(updateQuery, updateParams);

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
const deleteEvent = async (req, res) => {
    const { id: eventId } = req.params;
    const { id: userId } = req.user; 

    try {
        const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'");
        const cols = colsRes.rows.map(r => String(r.column_name).toLowerCase());
        const ownerCol = cols.includes('user_id') ? 'user_id' : (cols.includes('creator_id') ? 'creator_id' : 'user_id');
        const checkQuery = `SELECT ${ownerCol} AS owner_id, title FROM Events WHERE id = $1`;
        const checkResult = await pool.query(checkQuery, [eventId]);

        if (checkResult.rows.length === 0) {
            try { await pool.query('INSERT INTO NotificationLogs (user_id, type, message, channel, status, meta) VALUES ($1,$2,$3,$4,$5,$6)', [userId, 'event_delete', 'Tentativo eliminazione su evento inesistente', 'api', 'not_found', JSON.stringify({ eventId })]); } catch (_) {}
            return res.status(404).json({ error: 'Evento non trovato.' });
        }
        if (checkResult.rows[0].owner_id !== userId) {
            try { await pool.query('INSERT INTO NotificationLogs (user_id, type, message, channel, status, meta) VALUES ($1,$2,$3,$4,$5,$6)', [userId, 'event_delete', 'Eliminazione non autorizzata', 'api', 'denied', JSON.stringify({ eventId })]); } catch (_) {}
            return res.status(403).json({ error: 'Non sei autorizzato a cancellare questo evento.' });
        }

        const deleteQuery = 'DELETE FROM Events WHERE id = $1 RETURNING id';
        await pool.query(deleteQuery, [eventId]);

        try { await pool.query('INSERT INTO NotificationLogs (user_id, type, message, channel, status, meta) VALUES ($1,$2,$3,$4,$5,$6)', [userId, 'event_delete', `Evento '${checkResult.rows[0].title}' eliminato dal creatore`, 'api', 'success', JSON.stringify({ eventId })]); } catch (_) {}
        res.status(204).send();

    } catch (err) {
        console.error("Errore cancellazione evento:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.5 Iscrizione a un evento (Protetta) ---
const registerForEvent = async (req, res) => {
    const { id: event_id } = req.params;
    const { id: user_id, username } = req.user; // Otteniamo l'ID e il ruolo/username dal token

    try {
        // 1. Verifica se l'utente è già iscritto
        const existsQuery = 'SELECT 1 FROM Registrations WHERE user_id = $1 AND event_id = $2';
        const existsResult = await pool.query(existsQuery, [user_id, event_id]);

        if (existsResult.rows.length > 0) {
            return res.status(409).json({ error: 'Sei già iscritto a questo evento.' });
        }

        // 2. Verifica capienza e stato evento (deve essere approvato e nel futuro)
        const eventQuery = `
            SELECT capacity 
            FROM Events 
            WHERE id = $1 AND event_date > CURRENT_TIMESTAMP AND is_approved = TRUE
        `;
        const eventResult = await pool.query(eventQuery, [event_id]);
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato, non approvato o già concluso.' });
        }
        const eventCapacity = eventResult.rows[0].capacity;
        
        // 3. Verifica capienza
        const countQuery = 'SELECT COUNT(*) FROM Registrations WHERE event_id = $1';
        const countResult = await pool.query(countQuery, [event_id]);
        const currentRegistrations = parseInt(countResult.rows[0].count, 10);

        if (currentRegistrations >= eventCapacity) {
            return res.status(400).json({ error: 'Evento al completo. Capienza massima raggiunta.' });
        }

        // 4. Inserisci la registrazione
        const insertQuery = 'INSERT INTO Registrations (user_id, event_id) VALUES ($1, $2) RETURNING *';
        await pool.query(insertQuery, [user_id, event_id]);

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
            io.emit('registrationChangeGlobal', { eventId: event_id, userId: user_id, username: username || 'Utente', action: 'registered' });
        }
        // Email di conferma iscrizione
        try {
            const userRes = await pool.query('SELECT email FROM Users WHERE id = $1', [user_id]);
            const eventRes = await pool.query('SELECT title FROM Events WHERE id = $1', [event_id]);
            const to = userRes.rows[0]?.email;
            const title = eventRes.rows[0]?.title;
            if (to && title) {
                const { sendRegistrationConfirmationEmail } = require('../services/emailService');
                await sendRegistrationConfirmationEmail({ to, action: 'register', eventTitle: title, when: Date.now(), pool, userId: user_id });
            }
        } catch (e) {
            console.error('Errore invio email conferma registrazione:', e?.message || e);
        }
    } catch (err) {
        console.error("Errore iscrizione evento:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// --- B.5 Annullamento iscrizione (Protetta) ---
const unregisterFromEvent = async (req, res) => {
    const { id: event_id } = req.params;
    const { id: user_id, username } = req.user; 

    try {
        const deleteQuery = 'DELETE FROM Registrations WHERE user_id = $1 AND event_id = $2 RETURNING *';
        const result = await pool.query(deleteQuery, [user_id, event_id]);

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
            io.emit('registrationChangeGlobal', { eventId: event_id, userId: user_id, username: username || 'Utente', action: 'unregistered' });
        }
        // Email di conferma annullamento
        try {
            const userRes = await pool.query('SELECT email FROM Users WHERE id = $1', [user_id]);
            const eventRes = await pool.query('SELECT title FROM Events WHERE id = $1', [event_id]);
            const to = userRes.rows[0]?.email;
            const title = eventRes.rows[0]?.title;
            if (to && title) {
                const { sendRegistrationConfirmationEmail } = require('../services/emailService');
                await sendRegistrationConfirmationEmail({ to, action: 'unregister', eventTitle: title, when: Date.now(), pool, userId: user_id });
            }
        } catch (e) {
            console.error('Errore invio email conferma annullamento:', e?.message || e);
        }

    } catch (err) {
        console.error("Errore annullamento iscrizione:", err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

// Funzione temporanea per aggiungere una categoria
const addCategory = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Il nome della categoria è obbligatorio.' });
    }

    try {
        const query = `
            INSERT INTO Categories (name)
            VALUES ($1)
            RETURNING id, name;
        `;
        const result = await pool.query(query, [name]);
        const newCategory = result.rows[0];
        res.status(201).json({ message: 'Categoria aggiunta con successo!', category: newCategory });
    } catch (err) {
        console.error("Errore nell'aggiungere la categoria:", err);
        res.status(500).json({ error: 'Errore interno del server durante l\'aggiunta della categoria.' });
    }
};

const getCategories = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM Categories ORDER BY name ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Errore nel recupero delle categorie:", err);
        res.status(500).json({ error: 'Errore interno del server durante il recupero delle categorie.' });
    }
};


const seedCategories = async () => {
    console.log('Attempting to seed categories...');
    try {
        const client = await pool.connect();
        console.log('Database client connected for seeding.');
        const res = await client.query('SELECT COUNT(*) FROM Categories');
        const categoryCount = parseInt(res.rows[0].count);
        console.log(`Current category count: ${categoryCount}`);

        if (categoryCount === 0) {
            console.log('Nessuna categoria trovata. Inserimento categorie predefinite...');
            const defaultCategories = [
                'Musica', 'Sport', 'Arte', 'Tecnologia', 'Cibo', 'Educazione', 'Sociale', 'Benessere'
            ];
            for (const categoryName of defaultCategories) {
                await client.query('INSERT INTO Categories (name) VALUES ($1)', [categoryName]);
                console.log(`Inserted category: ${categoryName}`);
            }
            console.log('Categorie predefinite inserite con successo.');
        } else {
            console.log('Categorie esistenti trovate. Nessun inserimento necessario.');
        }
        client.release();
        console.log('Database client released after seeding.');
    } catch (error) {
        console.error('Errore durante il seeding delle categorie:', error);
    }
};

const reportEvent = async (req, res) => {
    const { id: eventId } = req.params;
    const { id: reporterId } = req.user;
    const { reason } = req.body || {};
    try {
        const evCheck = await pool.query('SELECT id FROM Events WHERE id = $1', [eventId]);
        if (evCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Evento non trovato.' });
        }
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ReportedEvents (
                id SERIAL PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
                reporter_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                reason TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (event_id, reporter_id)
            );
        `);
        const ins = await pool.query(
            "INSERT INTO ReportedEvents (event_id, reporter_id, reason) VALUES ($1,$2,$3) ON CONFLICT (event_id, reporter_id) DO UPDATE SET reason = EXCLUDED.reason, status = 'pending' RETURNING id, event_id, reporter_id, reason, status, created_at",
            [eventId, reporterId, reason || null]
        );
        // Notifica in tempo reale agli admin
        try {
            const io = socketManager.getIoInstance();
            if (io) {
                io.to('admins').emit('admin:reportCreated', { report: ins.rows[0] });
            }
        } catch (_) {}
        res.status(201).json({ message: 'Segnalazione inviata.', report_id: ins.rows[0].id });
    } catch (err) {
        console.error('Errore segnalazione evento:', err?.message || err);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
};

module.exports = {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent,
    registerForEvent,
    unregisterFromEvent,
    getEventParticipants,
    addCategory,
    getCategories,
    seedCategories,
    reportEvent
};

// --- B.6 Lista partecipanti evento (Pubblica)
function getEventParticipants(req, res) {
    const { id: eventId } = req.params;
    pool.query(
        `SELECT u.id, u.username
             FROM Registrations r
             JOIN Users u ON u.id = r.user_id
             WHERE r.event_id = $1
             ORDER BY u.username ASC`,
        [eventId]
    ).then(r => {
        return res.status(200).json({ count: r.rows.length, participants: r.rows });
    }).catch(err => {
        console.error('Errore recupero partecipanti:', err?.message || err);
        return res.status(500).json({ error: 'Errore interno del server.' });
    });
}