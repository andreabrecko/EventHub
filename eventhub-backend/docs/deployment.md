# Deployment Cloud (Render/Railway/Heroku)

Questa guida riassume le variabili d’ambiente e le configurazioni per distribuire EventHub.

## Variabili d’ambiente principali
- `PORT`: porta HTTP del backend (default `3000`).
- `JWT_SECRET`: chiave segreta per firmare i token JWT.
- `ALLOWED_ORIGINS`: lista di origini consentite (comma-separated), es. `https://tuo-dominio, http://localhost:5173`.

### Database (PostgreSQL)
- `AIVEN_DATABASE_URL` oppure `DATABASE_URL`: connection string completa.
- In alternativa parametrica:
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - `DB_SSL`: `true` in produzione o quando richiesto.
  - `DB_SSL_VERIFY`: `true` per validare certificato (opzionale).
  - `DB_CA_CERT` o `DB_CA_CERT_PATH` per fornire la CA.

### SMTP (Email)
- Modalità mock/dry-run:
  - `SMTP_JSON_TRANSPORT=true` (invii finti, payload JSON)
  - `SMTP_DRY_RUN=true` (invii loggati ma non inviati)
- Gmail:
  - `EMAIL_SERVICE=gmail`, `EMAIL_USER`, `EMAIL_PASS`
- SMTP generico:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_TLS_SKIP_VERIFY`
- Timeout invio:
  - `SMTP_CONNECTION_TIMEOUT` (ms), `SMTP_GREETING_TIMEOUT` (ms), `SMTP_SOCKET_TIMEOUT` (ms)
  - `EMAIL_SEND_TIMEOUT_MS` (ms) per timeout applicato nelle funzioni di invio

### Statici e Uploads
- Il client è servito staticamente da `eventhub-client`.
- Uploads locali in `eventhub-backend/uploads` (monta volume in Docker o storage persistente).

## Render/Railway/Heroku
- Imposta le variabili d’ambiente sopra negli strumenti di configurazione.
- Assicurati che l’origin del frontend sia incluso in `ALLOWED_ORIGINS`.
- Fornisci la stringa `DATABASE_URL` con SSL quando il provider la richiede.

## Docker Compose
Vedi `docker-compose.yml`: avvia Postgres e il backend con variabili pronte e volumi per uploads.

## Note CORS/Socket.IO
- CORS Express e Socket.IO usano `ALLOWED_ORIGINS`. `*` consente tutte le origini.
- Per ambienti produzione, specifica gli host del frontend per prevenire abusi.