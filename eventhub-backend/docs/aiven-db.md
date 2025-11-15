## Connessione Aiven per PostgreSQL

Questa applicazione supporta una modalità di connessione alternativa al database tramite Aiven, configurabile interamente con variabili d'ambiente.

### Variabili d'ambiente

- `AIVEN_DATABASE_URL` (consigliato): stringa di connessione completa fornita da Aiven, es. `postgres://user:pass@host:port/dbname?sslmode=require`
- `DATABASE_URL` (alternativa): stringa di connessione compatibile (Heroku/Aiven)
- `DB_SSL` (default: `true` in produzione): abilita SSL per connessioni parametriche
- `DB_CA_CERT` (opzionale): contenuto del certificato CA in PEM per validare SSL
- `DB_CA_CERT_PATH` (opzionale): percorso locale al file PEM della CA (es. `C:\\certs\\aiven-ca.pem`)

Per connessione parametrica (se non usi la stringa completa), imposta:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Ambienti

- Sviluppo: puoi usare `AIVEN_DATABASE_URL` direttamente; la libreria abilita SSL automaticamente con `rejectUnauthorized: false` se `DB_CA_CERT` non è presente.
- Produzione: imposta `AIVEN_DATABASE_URL` e `DB_SSL=true`. Se disponibile, aggiungi `DB_CA_CERT` per validare il certificato.

### Fallback e segnalazione

- Se nessuna connessione è disponibile, il server continua a servire risorse statiche e API non dipendenti dal DB.
- L’endpoint `GET /api/health` espone `dbConnected` e `dbVia`. Il frontend mostra un avviso “Modalità offline” quando il DB non è raggiungibile.

### Passi di configurazione

1. Crea un servizio PostgreSQL su Aiven e recupera la stringa di connessione.
2. Imposta nel file `.env` del backend:

```
AIVEN_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
DB_SSL=true
# opzionale
DB_CA_CERT=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
```

3. Avvia il backend: `npm run start`
4. Verifica lo stato: `GET http://localhost:3000/api/health` deve mostrare `dbConnected: true`.

### Diagnostica rapida

- `GET /api/db/status` → espone stato connessione e modalità (connectionString/parametri).
- `GET /api/db/ping` → esegue `SELECT 1`.
- `POST /api/db/smoke` → inserimento/eliminazione categoria di prova.

### Note

- Il modulo di connessione è in `src/config/db.js`.
- In assenza di `AIVEN_DATABASE_URL`/`DATABASE_URL`, la connessione usa i parametri `DB_*`.
- Il frontend gestisce il fallback e mostra un avviso quando il DB non è disponibile.