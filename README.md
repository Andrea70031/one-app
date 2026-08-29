# ONE — MVP 0.2

Questa versione porta ONE dal concept interattivo alla prima app che **vede, riceve documenti e ascolta**.

## Nuovo in 0.2

- Fotocamera reale tramite UI di sistema
- Selezione immagini dalla libreria
- Selezione documenti dal dispositivo / iCloud Drive
- Registrazione audio reale
- Gestione permessi fotocamera, foto e microfono
- Anteprima dell'ultimo contenuto acquisito
- Orb collegata agli stati:
  - acquisizione
  - ascolto
  - elaborazione simulata
  - completamento
- Base pronta per inviare contenuti all'AI nel prossimo step

## Installazione

Dalla cartella del progetto:

```bash
npm install
npx expo start
```

Oppure, se stai aggiornando la 0.1 manualmente:

```bash
npx expo install expo-image-picker expo-document-picker expo-audio
```

## Test su iPhone

Apri il progetto con Expo Go e prova:

- **Mostra** → apre la fotocamera
- **Foto** → apre la libreria
- **Documento** → apre il selettore file
- **Parla** → avvia la registrazione
- premendo di nuovo **Stop** termina l'audio

Alla prima apertura iOS chiederà i permessi necessari.

## Cosa NON fa ancora

La fase di "elaborazione" è ancora simulata.

Il contenuto viene acquisito davvero, ma non viene ancora inviato a un modello AI. Questo è intenzionale: la 0.3 collegherà backend, storage privato e modello multimodale.

## Prossimo step: MVP 0.3

- API/backend sicuro
- upload foto/documenti/audio
- AI multimodale
- trascrizione voce
- riconoscimento tipo di contenuto
- output strutturato
- prima logica di azioni suggerite
- salvataggio nella memoria Recall
