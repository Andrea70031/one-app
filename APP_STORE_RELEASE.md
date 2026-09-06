# ONE 1.0 — App Store release package

## Identity

- App name: **ONE**
- Version: **1.0.0**
- iOS bundle identifier: `com.one.assistant`
- Category: **Productivity**
- Secondary category: **Business**
- Age rating target: **4+**
- Pricing for 1.0: **Free** (no in-app purchases in this release)

## Store text

### Subtitle
**Mostra, chiedi, delega.**

### Promotional text
ONE trasforma richieste, foto, documenti e voce in risposte, promemoria e azioni concrete, tenendo insieme memoria personale e spazi di lavoro.

### Description
ONE è un assistente personale e professionale progettato per passare dalla richiesta all'azione.

Puoi scrivere, parlare, scattare una foto o allegare un documento. ONE analizza il contenuto, mantiene il contesto nel tuo Recall e ti aiuta a creare promemoria, preparare eventi, gestire attività e lavorare nei tuoi Spazi.

Funzioni principali:
- assistente AI testuale e multimodale;
- analisi di foto e documenti;
- trascrizione delle richieste vocali;
- Recall, la memoria privata sincronizzata;
- promemoria con notifiche locali e briefing giornaliero opzionale;
- Spazi per cantieri, commesse e progetti;
- attività e operazioni con revisione e conferma;
- integrazione con Calendario, Mappe, email e Comandi Rapidi quando richiesto.

ONE non sostituisce il giudizio professionale. Le informazioni importanti devono essere verificate prima di prendere decisioni tecniche, economiche, legali, sanitarie o di sicurezza.

### Keywords
`assistente,ai,produttività,promemoria,progetti,cantieri,documenti,voce,recall,organizzazione`

## Public URLs

After the GitHub Pages deployment of `main`:

- Privacy Policy: `https://andrea70031.github.io/one-app/privacy.html`
- Support URL: `https://andrea70031.github.io/one-app/support.html`
- Terms of Use: `https://andrea70031.github.io/one-app/terms.html`

## App Privacy — draft answers

ONE does **not** use data for third-party advertising or tracking.

Data linked to the user and used for **App Functionality**:
- Contact Info: email address; name if supplied.
- User Content: text requests, documents, photos, audio chosen by the user, workspace content.
- Identifiers: internal user/account identifier.
- Other User Content: Recall memories, reminders, activities and workspace records.

Data is processed by service providers needed to provide the product, including Supabase and OpenAI API. No advertising SDK is included in 1.0.

Suggested App Store Connect selections:
- Data Used to Track You: **No**
- Data Linked to You: **Yes** for the categories above
- Purpose: **App Functionality**
- Third-Party Advertising: **No**
- Developer Advertising/Marketing: **No**

## Review notes

ONE requires an account because Recall, reminders and workspaces are private synchronized data. The app includes an in-app **Delete account** control in Account. Deletion removes the auth account and personal ONE records; sole-owner workspaces are deleted while shared workspace ownership is transferred so data belonging to other members is not destroyed.

Permissions are requested contextually:
- Camera / Photos: only when the user chooses to show an image.
- Microphone: only when recording a voice request.
- Calendar: only when preparing or adding an event.
- Notifications: only after the user enables notifications in Account.

The AI backend requires authentication and applies per-user abuse limits. Operational workspace writes remain subject to Supabase RLS and explicit confirmation flows.

## Publication-only inputs still required

These belong to the Apple/Expo accounts and are intentionally not stored in the repository:
- Apple Developer / App Store Connect login and Team selection;
- EAS project initialization (`eas init`) if the project has not yet been linked to an Expo account;
- App Store Connect app record creation and final legal seller/developer identity;
- final screenshots uploaded to App Store Connect;
- final App Privacy questionnaire confirmation by the account holder.

Once those publication credentials are available, no product-development block should remain for the 1.0 submission.
