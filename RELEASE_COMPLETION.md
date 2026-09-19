# ONE — completamento rilascio, 19 settembre 2026

## Correzioni aggiuntive

- Cancellazione allegati tramite Storage API, coda transazionale protetta da RLS e worker ogni 5 minuti. Copre eliminazione documenti/foto, cancellazione Spazi, cascata account e Cestino scaduto.
- Upload incompleti inclusi quando si elimina lo Spazio/account. I file condivisi restano nello Spazio e vengono riassegnati al proprietario rimasto.
- Worker serializzati e upload bloccati sui percorsi in cancellazione. Nessuna perdita della richiesta in caso di errore Storage; retry automatico.
- Nessuna chiave privata nel repository: il worker usa un token casuale conservato in Supabase Vault, verificato dal server. Nessun accesso pubblico alla coda o alle funzioni amministrative.
- Pipeline Codemagic pronta per installazione riproducibile, controlli, prebuild Expo, CocoaPods, firma, archivio e upload TestFlight. Non ancora eseguita: richiede collegamento al team Apple.

## Verifiche eseguite

- 40 test automatici superati, inclusi errore Storage, acknowledgement fallito e concorrenza.
- Eliminazione reale dell’account tecnico: HTTP 200; account rimosso, entrambi gli allegati esclusivi (anche quello senza record documento) rimossi, allegato condiviso conservato e riassegnato al secondo account tecnico.
- TypeScript strict superato; sintassi YAML verificata.
- Primo richiamo reale del worker: HTTP 200, coda vuota.
- Accesso reale con account tecnico temporaneo: HTTP 200.
- AI reale: testo HTTP 200; immagine sintetica rossa riconosciuta correttamente; PDF sintetico con numero 7421 letto correttamente.
- Eliminazione definitiva documento con ruolo autenticato: file rimosso dal worker. Tutti gli account, Spazi e file tecnici sono stati rimossi a fine prova.
- CI GitHub della prima revisione: completata con successo (run 35441920026).

## Configurazione esterna necessaria

1. In Codemagic collegare il repository `Andrea70031/one-app`, selezionare il branch della PR 21 e il workflow `one-ios-release`.
2. Collegare l'integrazione Apple con nome `ONE App Store Connect`; usare il profilo App Store e il certificato per `com.one.assistant`.
3. Nel gruppo `one_release` impostare `APP_STORE_APPLE_ID` della scheda ONE e `ONE_BUILD_NUMBER` intero maggiore dell'ultimo caricato. Nessuna credenziale in chat o nel repository.
4. Supabase: verificare nella dashboard l'allowlist del redirect `one://auth/callback`, mantenendo i redirect web esistenti, e il mittente SMTP. La dashboard in questa sessione richiede accesso; il connettore non espone queste impostazioni.
5. Fornire nome/ragione sociale del titolare e indirizzo privato di assistenza da pubblicare. Il mittente automatico `noreply@auth.oneassistantai.com` risulta dal contesto precedente, ma non sostituisce un contatto di assistenza verificato.
6. Su iPhone/TestFlight verificare conferma email, recupero password, voce, fotocamera, file, calendario, notifiche, logout e cancellazione account. Servono screenshot autentici della build per App Store.
7. App Store Connect: privacy labels, age rating, diritti contenuti, contatti revisione, account dimostrativo ed eventuali dati DSA, poi selezionare la build e inviare.

La pipeline segue la [documentazione Codemagic React Native](https://docs.codemagic.io/yaml-quick-start/building-a-react-native-app/). La cancellazione usa le [Storage API Supabase](https://supabase.com/docs/guides/storage/management/delete-objects); pianificazione conforme alla [guida Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

Non certificare l'app come pronta all'approvazione finché build firmata, prova iPhone e dati del titolare non sono completati.
