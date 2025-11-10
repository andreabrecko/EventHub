# Changelog

## [Unreleased]
- Migliorata la gestione dello stato di autenticazione lato client.
- Aggiornata `updateAuthUI()` per mostrare/nascondere correttamente `auth-links` e `user-info`.
- Reindirizzamento immediato dopo login riuscito (rimosso delay di 2s).
- Migliorata la gestione dei messaggi di errore: i catch in UI mostrano i messaggi del backend quando disponibili.
- Aggiunta una guardia sul pulsante "Crea un nuovo evento" per impedirne l'accesso senza token.
- Wrapper API: timeout per tentativo e nuovo AbortController a ogni retry.

## [0.1.0] - Autenticazione e Creazione Eventi
- Aggiunta pagina e form "Crea un Nuovo Evento" con validazioni.
- Integrazione dashboard admin e azioni base (approve/reject/delete, blocco/sblocco).