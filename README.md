# ONE 0.9 — Pulse

ONE unisce l'assistente personale con gli spazi operativi di Cantieri AI.

La release 0.9 introduce il ciclo completo:

**richiesta → analisi AI → revisione → conferma → salvataggio nel cantiere**

## Novità

- briefing **Oggi** con priorità alte, scadenze e cantieri da aggiornare
- creazione guidata di problemi, attività e report giornalieri
- aggiornamento dell'avanzamento del cantiere
- operazioni AI sempre modificabili prima della conferma
- pacchetti esempio installabili: cantiere residenziale e ristrutturazione ufficio
- storico delle operazioni nel Centro azioni
- dipendenze Expo 57 riallineate
- cache PWA aggiornata alla versione 9

## Sicurezza operativa

- il frontend usa soltanto la chiave Supabase pubblicabile e il JWT della sessione
- le scritture passano dalle policy RLS del backend
- ONE non salva operazioni di cantiere senza una conferma esplicita
- i dati demo vengono creati solo dopo l'anteprima e la conferma dell'utente
- le Edge Functions richiedono un utente autenticato

## Avvio PWA

Servire la cartella tramite HTTPS o un server locale:

```bash
npx serve .
```

## Avvio Expo

```bash
npm install
npx expo start
```

## Backend richiesto

La PWA usa le tabelle Supabase già presenti:

- `sites`
- `site_members`
- `issues`
- `activities`
- `daily_reports`
- `documents`
- `ai_messages`
- `one_memories`
- `one_activities`
- `one_actions`
- `one_reminders`

Le scritture su cantieri, problemi, attività e report devono essere consentite esclusivamente agli utenti autorizzati dalle relative policy RLS.
