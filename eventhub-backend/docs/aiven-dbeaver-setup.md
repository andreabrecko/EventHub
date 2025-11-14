# Configurazione DBeaver con PostgreSQL su Aiven

## Prerequisiti
- Accesso al progetto Aiven e al servizio PostgreSQL.
- DBeaver installato (Windows/macOS/Linux) con driver PostgreSQL.
- Certificato CA di Aiven scaricato (`ca.pem`).

## 1) Recupero credenziali da Aiven
- Apri Aiven Console → seleziona il servizio PostgreSQL.
- Vai su "Connection information":
  - `Host` (es. `pg-XXXX.aivencloud.com`).
  - `Port` (tipicamente `26257` per alcune configurazioni, oppure `5432`).
  - `Database` (es. `defaultdb` o il DB configurato).
  - `User` (es. `avnadmin` o un utente dedicato).
  - `Password` (genera/recupera una password). 
  - `SSL` richiesto: scarica `ca.pem`.

## 2) Creazione connessione in DBeaver
- File → New → Database Connection → PostgreSQL.
- Inserisci:
  - `Host`: hostname di Aiven.
  - `Port`: come da Aiven (5432 o altra porta indicata).
  - `Database`: nome DB.
  - `Username` e `Password`: credenziali Aiven.
- Tab "Driver properties" → assicurati che `ssl` sia attivo (`ssl=true`).
- Tab "SSL":
  - Abilita `Use SSL`.
  - `SSL mode`: `verify-full` (raccomandato) o `require` (minimo).
  - `CA certificate`: seleziona il file `ca.pem` di Aiven.
  - Lascia vuoti `Client certificate` e `Client key` se non usi certificati client.
- Test Connection → verifica esito.

## 3) Accesso remoto sicuro
- Aiven → Service → "Firewall" / "IP allowlist":
  - Aggiungi l'IP pubblico del PC corrente.
  - Aggiungi gli IP pubblici dei dispositivi autorizzati (rete ufficio, IP statici).
  - Evita "allow all"; usa solo IP specifici.
- Per accesso da reti variabili:
  - Configura una VPN aziendale o un bastion SSH.
  - In DBeaver: Connection → SSH → abilita tunnel verso un host intermedio (bastion), poi collega al servizio Aiven dalla rete del bastion.

## 4) Backup configurazione DBeaver
- DBeaver: File → Export → DBeaver → Data sources → seleziona il progetto → Next.
- Seleziona la connessione Aiven → Next → scegli destinazione → Finish.
- Otterrai un file JSON/XML (es. `dbeaver-data-sources.json`).

## 5) Esportazione per altri dispositivi
- Condividi il file esportato in modo sicuro (repository privato, vault).
- Su nuovo PC: File → Import → DBeaver → Data sources → seleziona il file.
- Dopo l'import, apri la connessione e aggiorna:
  - Percorso del `CA certificate` (path locale).
  - Eventuali impostazioni SSH/VPN.

## 6) Requisiti di sicurezza
- Usa sempre `SSL/TLS` con `verify-full` e `CA` valida.
- Gestisci credenziali via password manager; evita salvarle in chiaro.
- Limita accessi agli IP autorizzati; preferisci VPN/SSH per mobilità.
- Ruota periodicamente password e token di accesso.

## 7) Test di connessione e prestazioni
- Dal PC corrente: Test Connection in DBeaver.
- Da altro dispositivo autorizzato: ripeti Test Connection.
- Query di esempio (tab SQL Editor in DBeaver):
  - `SELECT COUNT(*) FROM events;`
  - `SELECT COUNT(*) FROM users;`
  - `EXPLAIN ANALYZE SELECT * FROM events ORDER BY created_at DESC LIMIT 20;`
- Stabilità a lungo termine: lascia aperta la connessione per 30–60 minuti e osserva latenze ed eventuali disconnessioni.

## 8) Parametri di connessione ottimizzati (facoltativo)
- `sslmode=verify-full` e `sslrootcert=ca.pem`.
- `connectTimeout=10`–`15` secondi.
- `tcpKeepAlive=true` per stabilità.
- In DBeaver → Driver properties: aggiungi proprietà JDBC:
  - `ssl` = `true`
  - `sslmode` = `verify-full`
  - `connectTimeout` = `15`
  - `keepalives` = `1`
  - `keepalives_idle` = `30`