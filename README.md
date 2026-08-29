# ONE — MVP 0.1

Prima base software di ONE: assistente mobile centrato su un'unica interfaccia universale.

## Cosa c'è già

- Home mobile-first in React Native / Expo
- Orb centrale animata
- 5 stati visivi:
  - Riposo
  - Attivazione
  - Ascolto
  - Elaborazione
  - Fatto
- Input testuale
- Pulsante microfono (UI, non ancora registrazione reale)
- Azioni rapide Fotocamera / Documento / Foto / Azione
- Attività recenti
- Primo accesso alla futura memoria "Recall"
- Bottom navigation
- Dark UI coerente con il concept ONE

## Stack

- Expo SDK 57
- React Native 0.86
- React 19.2
- TypeScript
- expo-linear-gradient
- @expo/vector-icons

## Avvio rapido

1. Installa Node.js 22.13 o superiore.
2. Estrai questa cartella.
3. Apri il terminale nella cartella `ONE_MVP_0_1`.
4. Esegui:

```bash
npm install
npx expo start
```

5. Installa **Expo Go** sull'iPhone.
6. Assicurati che PC e iPhone siano sulla stessa rete.
7. Scansiona il QR code mostrato da Expo.

> Expo Go è perfetto per questa fase visuale e logica. Per una build iOS personalizzata/TestFlight servirà poi Apple Developer.

## Interazione demo

Tocca la grande O:
- idle → activating
- activating → listening
- listening → thinking
- thinking → done
- done → idle

Lo stato "activating" passa automaticamente a "listening".
Lo stato "done" torna automaticamente a riposo.

Scrivendo nella barra e premendo invio viene simulata una richiesta:
- elaborazione
- completamento

## Roadmap immediata

### MVP 0.2
- Fotocamera reale
- Picker immagini/documenti
- Registrazione voce
- Permessi iOS/Android
- Sheet contestuale dopo acquisizione

### MVP 0.3
- Backend
- Autenticazione
- Database memoria
- Upload privati
- Modello dati universale `OneItem`

### MVP 0.4
- AI multimodale
- classificazione automatica
- estrazione dati
- suggerimento azioni

### MVP 0.5
- Recall / ricerca semantica
- reminder
- monitoraggi
- azioni automatiche
