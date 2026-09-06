# ONE 1.0

ONE è un assistente personale e professionale che unisce AI, memoria privata, promemoria e Spazi di lavoro.

La release 1.0 porta il prodotto dalla PWA/prototipo a una base nativa pronta per la pubblicazione:

**mostra / chiedi / delega → analisi AI → revisione → conferma → azione o salvataggio**

## ONE Native 1.0

- autenticazione reale Supabase con sessione persistente
- richieste testuali, foto, documenti e voce
- fino a 6 immagini nella stessa richiesta
- trascrizione vocale tramite Edge Function autenticata
- Home, Spazi, Recall, Promemoria e Account navigabili
- promemoria sincronizzati e notifiche locali opzionali
- briefing giornaliero opzionale
- azioni native per Calendario, email, Mappe e Comandi Rapidi
- creazione e gestione guidata degli Spazi/cantieri
- eliminazione account direttamente dall'app
- Privacy, Termini e Supporto pubblici
- error boundary per evitare schermate bianche irreversibili

## Sicurezza e costi

- il frontend usa soltanto la chiave Supabase pubblicabile e il JWT della sessione
- le scritture passano dalle policy RLS del backend
- le Edge Functions sensibili richiedono autenticazione
- `one-ai` e `one-transcribe` applicano rate limit per utente
- ONE non salva operazioni operative senza i flussi di revisione/conferma previsti
- l'eliminazione account cancella i dati personali e gestisce in modo sicuro gli Spazi condivisi

## Avvio PWA

```bash
npx serve .
```

## Avvio Expo

```bash
npm install
npx expo start
```

## Verifiche release

```bash
npm run check
npm run doctor
```

## Pubblicazione

La configurazione EAS è in `eas.json`. Metadati, note di revisione, privacy draft e checklist App Store sono in `APP_STORE_RELEASE.md`.

## Backend

ONE usa Supabase per autenticazione, RLS, dati sincronizzati, Storage ed Edge Functions. Le tabelle principali includono `sites`, `site_members`, `issues`, `activities`, `daily_reports`, `documents`, `ai_messages`, `one_memories`, `one_activities`, `one_actions`, `one_reminders` e `one_rate_limits`.
