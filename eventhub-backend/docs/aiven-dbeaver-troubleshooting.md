# Troubleshooting DBeaver + Aiven PostgreSQL

## Problemi comuni
- Errore SSL o handshake fallito:
  - Verifica che `Use SSL` sia attivo e `SSL mode` corretto (`verify-full`).
  - Assicurati che il `CA certificate` punti al `ca.pem` di Aiven e sia leggibile.
  - Controlla data e ora del sistema (certificati dipendono da orologio corretto).

- Connessione rifiutata / timeout:
  - Verifica IP allowlist su Aiven (il tuo IP pubblico deve essere autorizzato).
  - Controlla firewall locali/aziendali e che la porta Aiven sia raggiungibile.
  - Se usi SSH/VPN, verifica che il tunnel sia attivo.

- Credenziali errate:
  - Rigenera la password utente in Aiven e riprova.
  - Assicurati di usare il `Database` corretto.

- Prestazioni lente:
  - Usa `EXPLAIN ANALYZE` per individuare query non indicizzate.
  - Valuta indici su colonne usate in `WHERE/ORDER BY`.
  - Imposta `connectTimeout` e `tcpKeepAlive` nelle driver properties.

## Checklist diagnostica
- Host/Port corretti secondo Aiven.
- SSL attivo e CA configurata.
- IP allowlist contiene il tuo IP.
- Nessun blocco firewall locale o di rete.
- Credenziali aggiornate e utente abilitato.
- Se tunnel: endpoint e chiavi SSH validi.

## Comandi utili (alternativa a DBeaver)
- `psql "host=<HOST> port=<PORT> dbname=<DB> user=<USER> password=<PWD> sslmode=verify-full sslrootcert=ca.pem" -c "SELECT 1"`
- Usa `ping`/`tracert` per verificare raggiungibilità dell’host.