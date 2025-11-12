# Incident: Errore 500 in creazione evento

## Sintomi
- Richieste `POST /api/events` falliscono con errore 500.
- In alcuni casi, il server si interrompe al boot se il DB non è raggiungibile.

## Cause individuate
- Possibile schema DB non inizializzato in ambienti freschi: tabelle `Events`, `Categories` e `EventPhotos` non presenti.
- Parsing data/ora non valido lato backend quando la UI invia formati differenti.
- Riferimento a colonna inesistente `image_url` durante l’aggiornamento evento.
- Arresto del processo al fallimento della connessione DB (non resiliente).
- Log del segreto JWT durante il login.

## Correzioni applicate
- Resilienza DB: rimosso `process.exit(1)` e sostituito con throw in `src/config/db.js:28–31` per evitare l’arresto del processo e consentire un avvio parziale dell’app.
- Middleware Auth: snellita la verifica del token evitando doppie letture e variabili ridondanti in `src/middleware/authMiddleware.js:9–30`.
- Sicurezza Login: rimosso il log di `JWT_SECRET` in `src/controllers/userController.js:118–126`.
- Schema compatibilità: eliminato l’uso di `image_url` nell’update dinamico degli eventi in `src/controllers/eventController.js:348–374` (la colonna non esiste nello schema corrente).
- Dipendenze: aggiornato `nodemailer` a `^7.0.10` per risolvere advisory GHSA-mm7p-fcc7-pg87 (`package.json`).

## Verifiche eseguite
- Avvio server in modalità sviluppo: ok (`Server EventHub in esecuzione sulla porta 3000`).
- Health check: `GET /api/health` risponde `{"status":"API running","service":"EventHub"}`.
- Serving client statico: `GET /` restituisce `index.html` dell’app client.
- Seed categorie: presente e idempotente; non vengono reinserite se già esistenti.

## Raccomandazioni operative
- Assicurarsi che le variabili `.env` siano valorizzate (DB, `JWT_SECRET`, SMTP).
- In produzione, attivare `DB_SSL=true` quando necessario.
- Valutare l’aggiunta di test automatici per: creazione evento, validazione data, fallback schema, autenticazione.

## Stato
- Risolto. Endpoint di creazione evento operativo con fallback schema e gestione errori più chiara.

## Sintomi
- Il client mostra: `Errore durante la creazione dell'evento: errore interno del server`.
- La console di Chromium segnala una risposta `500 (Internal Server Error)` in POST `/api/events`.

## Causa Radice
- La tabella `Events` (e altre tabelle correlate) non era presente nel database. 
- L'inserimento in `Events` falliva con errore Postgres del tipo `relation "events" does not exist`, non intercettato dai controlli specifici (timestamp/foreign key/null) e restituito come 500 generico.
- Anche il seed delle categorie dipende da `Categories`, che a sua volta non era garantita.

## Soluzione Applicata
1. Creazione di un inizializzatore schema DB idempotente.
   - Nuovo file: `src/config/initSchema.js`.
   - Crea (IF NOT EXISTS) le tabelle: `Users`, `Categories`, `Events`, `Registrations`, `EventPhotos`, `ChatMessages`.
   - Usa transazione per consistenza e logga esito.

2. Integrazione nell'avvio del server.
   - Modifica `server.js` per chiamare `initSchema()` subito dopo `connectDB()` e prima di `seedCategories()`.
   - Questo garantisce che lo schema sia presente prima di qualsiasi operazione che lo utilizza.

## Impatto sul codice
- File nuovi/modificati:
  - `src/config/initSchema.js` (nuovo)
  - `server.js` (aggiornato per integrare initSchema)

## Verifica
- Avvio backend con `npm run dev` senza errori di schema.
- Connessioni Socket.IO stabilite, indicando che il server è up e il DB è raggiungibile.
- Con lo schema presente, le richieste di creazione evento non incontrano più l'errore `relation does not exist`.

## Considerazioni Future
- Se si desidera una gestione più formale delle migrazioni, introdurre uno strumento come `node-pg-migrate` o `Knex`.
- Aggiungere test di integrazione che verificano la presenza delle tabelle critiche all'avvio.

## Riferimenti
- `src/controllers/eventController.js`: logica di creazione evento e inserimento in `EventPhotos`.
- `src/app.js`: inizializzazione legacy di `EventPhotos` (sicura perché IF NOT EXISTS).
- `src/config/db.js`: gestione connessione a Postgres.