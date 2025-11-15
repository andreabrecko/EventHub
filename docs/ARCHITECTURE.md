# Architettura EventHub

## Panoramica

- Monorepo con `eventhub-client` (frontend statico) e `eventhub-backend` (API + DB).
- PostgreSQL gestito via `docker-compose` per sviluppo locale.

## Backend

- Entrypoint: `server.js` (avvio HTTP/Socket.IO) e `src/app.js` (Express).
- Sicurezza:
  - Rate limiter per `/register`, `/login`, `/verify-email`, `/password-reset/*`.
  - Header di sicurezza minimi per compatibilità frontend.
  - CORS dinamico basato su `ALLOWED_ORIGINS`.
- Email: `src/services/emailService.js` con timeouts, code e logging DB.
- Documentazione: `docs/deployment.md`, `docs/uploads-production.md`, `docs/README-email-verification.md`.

## Struttura cartelle

- `src/routes`: definizione delle rotte e index
- `src/controllers`: funzioni di controllo per ciascuna rotta
- `src/middleware`: protezioni e utilità
- `src/services`: integrazioni (email, storage)
- `src/utils`: helper
- `src/config`: DB, swagger, altre configurazioni
- `scripts`: utilità CLI e job
- `sql`: migrazioni/alter tabelle

## Client

- Statico: `index.html`, `script.js`, `style.css`.
- Avvio tramite server statico del backend.

## CI/CD

- GitHub Actions: install, test, build immagine Docker.

## Esecuzione

- Dev: `npm run dev` nel backend.
- Test: `npm run test:e2e` e `npm run test:e2e:security`.
- Docker: `docker compose up -d`.