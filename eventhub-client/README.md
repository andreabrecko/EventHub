# EventHub Client (Vanilla JS)

Interfaccia web semplice per EventHub sviluppata in HTML/CSS/JavaScript vanilla.

## Funzionalità
- Autenticazione (registrazione/login) con JWT.
- Visualizzazione eventi approvati con ricerca testuale.
- Creazione evento con upload foto e selezione categoria.
- Dashboard amministratore: approva/rifiuta/elimina eventi, blocca/sblocca utenti.

## Avvio
1. Avvia il backend: `cd ../eventhub-backend && npm start` (oppure `npm run dev` se hai `nodemon`).
2. Avvia il client: `npx --yes serve -l 5173` nella cartella `eventhub-client`.
3. Apri `http://localhost:5173/`.

## Configurazione
- Il backend usa variabili `.env` (vedi `eventhub-backend/.env.example`).
- L’API base è `http://localhost:3000/api` (configurata in `script.js`).

## Note
- Il client mostra un messaggio se non ci sono categorie disponibili.
- La ricerca eventi è ottimizzata con debounce.
