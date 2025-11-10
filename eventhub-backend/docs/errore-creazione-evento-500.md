# Incident: Errore 500 in creazione evento

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