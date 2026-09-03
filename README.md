# ONE 1.0 — Site Copilot

ONE unisce l'assistente personale con gli spazi operativi di Cantieri AI.

La release 1.0 introduce il ciclo completo del sopralluogo:

**appunti + voce + fotografie → analisi AI → revisione unica → salvataggio atomico**

## Novità

- sessione **Sopralluogo AI** avviabile da ogni cantiere
- acquisizione di appunti, note vocali e fino a sei fotografie
- compressione delle immagini prima dell'invio
- bozza strutturata con riepilogo, lavorazioni, blocchi, attività e criticità
- revisione completa di ogni dato prima della conferma
- salvataggio transazionale di report, attività, criticità e avanzamento
- fallback utilizzabile anche quando il motore AI non è disponibile
- cache PWA aggiornata alla versione 10

## Sicurezza operativa

- il frontend usa soltanto la chiave Supabase pubblicabile e il JWT della sessione
- le scritture passano dalle policy RLS del backend
- ONE non salva il sopralluogo senza una conferma esplicita
- la funzione `commit_site_walkthrough` usa `SECURITY INVOKER` e mantiene attive le policy RLS
- l'operazione è atomica: in caso di errore non restano dati parziali
- le fotografie vengono elaborate per creare la bozza ma non archiviate in questa release
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

La migrazione `20260903170718_commit_site_walkthrough.sql` aggiunge la funzione RPC transazionale necessaria alla conferma del sopralluogo.

Le scritture su cantieri, problemi, attività e report devono essere consentite esclusivamente agli utenti autorizzati dalle relative policy RLS.
