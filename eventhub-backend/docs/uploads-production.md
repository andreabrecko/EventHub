# Storage Uploads in Produzione

In sviluppo gli upload (foto eventi) sono salvati localmente in `eventhub-backend/uploads`.
In produzione è consigliato usare uno storage esterno (S3/Blob) per resilienza e CDN.

## Opzioni consigliate
- AWS S3 o compatibile (MinIO, Backblaze B2, DigitalOcean Spaces)
- Azure Blob Storage o Google Cloud Storage

## Strategia di integrazione (passi)
1. Creare un bucket con politiche di accesso pubblico in sola lettura o firmate.
2. Aggiungere variabili d’ambiente:
   - `STORAGE_PROVIDER=s3`
   - `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
   - (opzionale) `S3_ENDPOINT` per provider compatibili S3
3. Sostituire la scrittura su disco locale con upload via SDK (es. `@aws-sdk/client-s3`).
4. Salvare nel DB l’URL pubblico generato invece del path locale.
5. Aggiornare Swagger per indicare che le foto evento sono URL pubblici.

## Considerazioni di sicurezza
- Limitare dimensione e tipo file (già in Multer).
- Validare estensioni/Content-Type.
- Evitare `public-read` indiscriminato se non necessario; preferire URL firmati lato backend quando indicato.

## Stato attuale del codice
- Upload locali funzionanti e serviti da `/uploads`.
- Per non rompere FE/BE, l’integrazione S3 è documentata qui e può essere implementata in un secondo pass.