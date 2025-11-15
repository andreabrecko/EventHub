# EventHub Monorepo

Struttura chiara e accademica per client e backend.

## Struttura

- `EventHub/eventhub-client`: Frontend statico (HTML/CSS/JS)
- `EventHub/eventhub-backend`: Backend Node.js/Express + PostgreSQL
- `EventHub/docs`: Documentazione generale del progetto
- `docker-compose.yml`: Orchestrazione locale (DB + backend)

## Backend

- Avvio sviluppo: `cd EventHub/eventhub-backend && npm run dev`
- Test e2e: `npm run test:e2e` e `npm run test:e2e:security`
- Variabili: vedi `eventhub-backend/.env.example` e `docs/deployment.md`

Struttura cartelle principale:

- `src/app.js`: Configurazione Express e middleware globali
- `src/routes/`: Definizione ed export delle rotte
- `src/controllers/`: Logica richieste HTTP
- `src/middleware/`: Protezioni (rate limit, headers, auth)
- `src/services/`: Integrazioni (email, storage)
- `src/utils/`: Funzioni di supporto
- `src/config/`: Config, DB, swagger

## Docker

- Build immagine: `docker build -t eventhub-backend ./EventHub/eventhub-backend`
- Avvio stack: `docker compose up -d`

## Documentazione

- `EventHub/docs/ARCHITECTURE.md`: Panoramica architetturale
- `EventHub/eventhub-backend/docs/`: Dettagli backend (deploy, uploads, email)

## Note

- CORS e Socket.IO si basano su `ALLOWED_ORIGINS`
- Rate limit abilitato su endpoint sensibili (login/registrazione/email)
- Header di sicurezza globali applicati