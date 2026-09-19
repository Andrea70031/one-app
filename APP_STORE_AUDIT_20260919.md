# ONE — verifica per l’invio ad App Store

19 settembre 2026 · obiettivo: invio entro lunedì 21 settembre 2026

**Esito: non ancora pronta per l’invio.** Il controllo del codice, del backend e della configurazione ha individuato e corretto difetti reali. Mancano ancora la build firmata, la prova completa su iPhone e alcuni requisiti di pubblicazione. L’esportazione JavaScript riuscita non dimostra l’assenza di crash nativi e non è una build TestFlight.

Repository verificato: `Andrea70031/one-app`, ramo `main`, commit iniziale `0c6b9ee9352906c0e8f89ea63abfd1c2f239db55`. Correzioni sul ramo `codex/one-app-store-audit-20260919`. Sonic MD e Drainmap non sono stati modificati.

## Correzioni eseguite

| Area | Problema riscontrato | Correzione |
|---|---|---|
| Backend | Il progetto usato dall’app risultava INACTIVE; le query scadevano | Riattivato; stato successivo ACTIVE_HEALTHY e query SQL operative |
| Accesso | Lettura profilo dentro il callback auth, con possibile blocco del client; avvio senza gestione del rifiuto della sessione | Lavoro asincrono rinviato fuori dal callback, protezione contro risposte obsolete, gestione errore e attesa iniziale limitata |
| Recupero password | Email inviata senza una schermata nativa per completare il recupero | Callback `one://auth/callback`, gestione link a caldo/a freddo, nuova password con doppio inserimento; resta da configurare/verificare il redirect sul servizio |
| Privacy AI | Invio a terzi senza consenso esplicito dedicato | Richiesta di consenso prima di ogni invio nativo e nella PWA; annullamento senza caricamento degli allegati |
| Privacy prima del login | Privacy e Termini erano disponibili solo dopo l’accesso | Link anche nella schermata di autenticazione |
| Sessioni e notifiche | Preferenze condivise sul dispositivo e notifiche del vecchio account dopo il logout | Preferenze per utente, cancellazione delle notifiche pianificate e protezione dai caricamenti tardivi del vecchio utente |
| Comando centrale | Il cerchio passava tra animazioni simulate, senza eseguire il comando mostrato | Collegato a registrazione, arresto e invio effettivi; eliminato il ciclo dimostrativo |
| Azioni AI | Conferma generica, dati non modificabili e possibilità di ripetere azioni già completate | Revisione con campi modificabili, blocco concorrente e indicazione delle azioni completate |
| Destinazioni e date | Identificatore di spazio precedente poteva prevalere sulla commessa modificata; date calendario predefinite inventate | Destinazione coerente con i campi rivisti, niente orari inventati, controllo aggiornamenti con zero righe |
| Risultati operativi | Errori di cronologia o sincronizzazione potevano presentare come fallita un’azione già eseguita | Conservato l’esito reale; segnalazione esplicita se il promemoria sul dispositivo non è stato copiato nel cloud |
| Recall | Risposta completa salvata ma non consultabile dalla lista nativa | Apertura del contenuto integrale; condivisione della risposta AI |
| Allegati | Selettore accettava formati non supportati; TXT inviati come file binari al provider | PDF/TXT/CSV/Markdown, testo decodificato localmente, limiti e messaggi specifici |
| Voce | Mancata gestione uniforme di audio malformato e timeout | Errori controllati, registrazione limitata a 60 secondi, ripristino modalità audio, arresto quando l’app passa in secondo piano |
| Contesto AI | Elementi nel cestino potevano rientrare nell’analisi; proposte non eseguibili sul client | Esclusione dei record eliminati dal contesto e filtro delle azioni in base alle capacità native |
| Cache PWA | Il service worker intercettava tutti i GET, incluse risposte API private | Cache riservata agli asset pubblici elencati, nessuna cache di richieste autenticate; pulizia delle sole vecchie cache ONE |
| Sicurezza PWA | Errori ricevuti dal link di autenticazione inseriti come HTML | Escape del testo prima del rendering |
| Accessibilità | Animazione continua anche con Riduci movimento | Rispetto dell’impostazione di sistema; schermata login scorrevole con tastiera |
| Peso e permessi | Inclusi 19 font e un modulo mappe mai usato; audio in background non necessario | Un solo font Ionicons, rimosso `expo-maps` e relativo componente scollegato; disattivato audio in background. L’apertura di Mappe Apple rimane disponibile |
| Verifiche | Test AI non aggiornati al rate limit; CI modificava automaticamente il lockfile | Fixture aggiornate, test mirati aggiunti, CI con installazione riproducibile, TypeScript, test e bundle iOS |
| Documentazione | File che dichiaravano la release pronta senza prova firmata | Dichiarazioni corrette e requisiti aperti esplicitati |

**Distribuito sul backend:** `one-ai` versione 6, `one-transcribe` versione 4, entrambi ACTIVE con verifica JWT abilitata. Le correzioni all’app e alle pagine web sono nel ramo di lavoro e richiedono integrazione e nuova build; non risultano installate sull’iPhone.

## Prove completate e loro limiti

| Verifica | Esito |
|---|---|
| Installazione dipendenze e controllo locale dipendenze | Superati |
| TypeScript strict | Superato |
| Test automatici | 36 superati, nessuno fallito; rete/provider e moduli nativi simulati dove indicato nei test |
| Sintassi JavaScript e diff | Superati |
| Esportazione iOS con Metro/Hermes | Superata; 797 moduli, un asset font. Non comprende compilazione Swift/Objective-C né firma |
| Generazione progetto iOS | Superata; target iOS 16.4, schemi URL e descrizioni permessi presenti, esenzione crittografia dichiarata, nessuna modalità audio in background |
| Icona generata per iOS | 1024×1024 RGB; la sorgente resta 512×512, quindi è un ridimensionamento, non una nuova icona ad alta risoluzione |
| Manifest privacy delle dipendenze | 10 file presenti nei pacchetti; aggregazione nell’archivio finale ancora da verificare |
| RLS | Abilitata sulle 18 tabelle pubbliche; prova di isolamento tra due utenti sintetici superata |
| Cestino e rate limit | Spostamento/ripristino e rifiuto della seconda richiesta oltre il limite verificati nel database |
| Preparazione cancellazione account | In transazione: spazio esclusivo eliminato, spazio condiviso trasferito, memoria privata rimossa con cancellazione utente |
| Pulizia dati di prova | Transazioni annullate; zero utenti sintetici rimasti |
| Endpoint protetti | Richieste senza autorizzazione respinte con 401 |
| Privacy, Termini, Supporto pubblici | Tutte e tre le pagine rispondono HTTP 200; questo non certifica completezza legale o assistenza effettiva |
| App Store Connect | Raggiunta la schermata di accesso, nessuna sessione autenticata: build, metadati e stato app non verificabili |
| Expo Doctor online | Bloccato dalla revisione automatica per possibile invio di metadati a un endpoint di telemetria non autorizzato. Non è stato aggirato. Eseguiti separatamente i controlli locali disponibili |

## Cosa manca prima di inviare

| Priorità | Requisito | Stato e completamento necessario |
|---|---|---|
| Bloccante | Build iOS firmata | Nel repository c’è EAS, ma non c’è `codemagic.yaml`, né un progetto EAS collegato visibile in app.json. Configurare/verificare il servizio realmente usato, firma Apple, app record e numero build. Versione dichiarata 1.0.0, build locale 1: non è prova dell’ultima build su Apple |
| Bloccante | Prova TestFlight su iPhone | Avvio a freddo, login/logout, cambio account, foto, PDF, testo, audio, consenso negato, AI reale, Recall, azioni e notifiche. Non è stata eseguita durante questo controllo |
| Bloccante | Conferma email e recupero password | Aggiungere/verificare `one://auth/callback` fra i redirect ammessi; provare i link reali, anche a app chiusa e con link scaduto. Non sono state inviate email di prova |
| Bloccante | AI autenticata completa | Verificare disponibilità modello configurato, credito API, risposta a testo/foto/PDF/audio e comportamento ai limiti. I test con provider simulato e un 401 senza token non dimostrano questo funzionamento |
| Bloccante | Eliminazione completa con allegati reali | La prova SQL non passa da Storage né dall’API Auth admin. Il codice di eliminazione account pulisce i file noti degli spazi esclusivi, ma vanno provati i file caricati in spazi condivisi e i riferimenti già rimossi dal cestino |
| Difetto da chiudere | File orfani dopo eliminazione definitiva | Il purge SQL e la cancellazione diretta dal cestino eliminano righe documenti/spazi senza coordinare sempre Storage. Serve un percorso server di cancellazione file e record con retry, prima di garantire la rimozione completa degli allegati. Non è stato eseguito alcun purge sui dati reali |
| Bloccante pubblicazione | Privacy e contatto assistenza | L’identità del titolare è un rinvio generico alla futura scheda store; il supporto usa GitHub Issues pubbliche. Inserire identità corretta e un canale privato effettivo, verificare conservazione/fornitori/diritti. Non ho inventato recapiti o dati anagrafici |
| Bloccante pubblicazione | Scheda App Store | Screenshot della build finale, descrizione coerente con le funzioni native, questionario privacy, age rating attuale, dati revisore, account dimostrativo, disponibilità Italia/UE e stato DSA. Stato effettivo non verificato senza accesso |
| Da integrare | Correzioni applicazione | Integrare il ramo verificato, distribuire le pagine aggiornate e produrre una nuova build. Il vecchio binario non acquisisce queste correzioni da solo |

Apple richiede un’app completa, backend accessibile e accesso per il revisore; richiede inoltre informazione e consenso esplicito per la condivisione di dati personali con AI di terzi. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

Dal 28 aprile 2026 i caricamenti devono usare Xcode 26 o successivo e SDK iOS 26 o successivo. Il deployment target iOS 16.4 è un parametro distinto e non soddisfa da solo questo requisito. [Requisiti Apple](https://developer.apple.com/news/upcoming-requirements/).

## Cosa mantenere, ridurre o rinviare

- **Mantenere nella prima uscita:** assistente testo/foto/PDF/voce, Recall consultabile, promemoria, azioni confermate, riepilogo Spazi e creazione commesse.
- **Non promettere parità con la PWA:** la sezione Spazi nativa mostra ancora soprattutto un riepilogo. Non offre lo stesso dettaglio navigabile di criticità, attività, giornale lavori, documenti, inviti e ruoli della versione web.
- **Non pubblicizzare Watch, CarPlay o domotica completa:** il repository contiene contratti e piani, non target Watch/CarPlay pronti o una gestione domestica completa.
- **Acquisti in-app:** non implementati. Per rispettare lunedì, raccomando prima uscita gratuita e monetizzazione in un aggiornamento. Per uscire già con abbonamenti occorrono prodotti Apple, acquisto/ripristino, gestione diritti e prove: non basta cambiare il prezzo nella scheda.
- **Temi chiaro/scuro/automatico:** la versione nativa è ancora impostata sullo scuro. Non blocca una prima uscita, ma non promettere tutte e tre le modalità.
- **Offline:** nessuna promessa di funzionamento completo offline; l’AI e i dati cloud richiedono rete. Il messaggio di mancata sincronizzazione ora evita di far sembrare vuoto un account non caricato.
- **Nessun rifacimento generale prima di lunedì:** dopo queste correzioni, concentrare il lavoro su firma, test reali e punti bloccanti, evitando nuove integrazioni.

## Ulteriori osservazioni tecniche

Il Security Advisor riporta: tabella rate limit senza policy (scelta intenzionale: accesso solo tramite funzione), funzione rate limit SECURITY DEFINER eseguibile dagli autenticati (necessaria al flusso attuale, da tenere limitata all’utente corrente), protezione password compromesse disabilitata. Quest’ultima va valutata nelle impostazioni/piano, senza cambiare abbonamento automaticamente. [Protezione password Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

La cronologia migrazioni remota comprende aggiornamenti del cestino dell’8 settembre assenti dai file locali e nomi/versioni che non coincidono integralmente. Il backend operativo non va ricostruito né aggiornato alla cieca con `db push`: prima riallineare cronologia e schema. Non sono state applicate migrazioni in questo controllo.

Il permesso Calendario è in sola scrittura, mentre il flusso recupera il calendario predefinito: va verificato sul dispositivo con iOS attuale. Le notifiche di ONE e l’app Promemoria di iOS sono copie separate; una modifica in Promemoria non è una sincronizzazione bidirezionale già implementata.

## Sequenza concreta per lunedì

1. Integrare le correzioni, chiudere la rimozione completa degli allegati e i dati privacy/supporto.
2. Verificare redirect, email e AI con un account di prova reale; preparare l’account per Apple.
3. Generare la build firmata sul servizio di compilazione collegato usando Xcode/SDK conformi.
4. Installarla su iPhone e completare la prova dei flussi elencati; correggere eventuali crash prima di produrre gli screenshot.
5. Completare App Store Connect e inviare la build verificata.

**Lunedì resta un obiettivo per l’invio, non una previsione di approvazione Apple. Finché i punti bloccanti non sono chiusi, non consiglio di premere “Invia per la revisione”.**
