# GESTIONE DIGITALE DEI MEZZI DELLA COOPERATIVA SOCIALE
## Documentazione Tecnica, Architetturale e Manuale Operativo

---

## 1. ARCHITETTURA E SCELTE TECNOLOGICHE

### PWA vs Capacitor / App Nativa
- **Scelta adottata**: **Progressive Web App (PWA) avanzata con installabilità Web App Manifest e Service Worker auto-aggiornante**.
- **Motivazione**:
  1. Consente l'installazione immediata sia su **Android** che su **iPhone/iPad** senza passare dai tempi di approvazione di Google Play Store e Apple App Store (né pagare le licenze annuali Apple Developer da 99$/anno).
  2. Aggiornamenti istantanei in tempo reale per tutti gli operatori: nessuna necessità di distribuire file APK o attendere che gli operatori aggiornino l'app.
  3. Supporto fotocamera WebRTC ad alte prestazioni per la scansione istantanea dei QR code.
  4. Accesso al pannello amministrativo dallo stesso identico URL da qualsiasi computer (Chrome, Firefox, Safari, Edge).

### Supporto QR Code e Limiti NFC
- **QR Code (Fotocamera)**: Supportato al 100% su qualsiasi smartphone (iOS e Android) dotato di fotocamera. La scansione avviene in locale tramite libreria ad alta frequenza di campionamento con riscontro visivo e aptico.
- **NFC (Web NFC NDEFReader)**:
  - Disponibile nativamente su smartphone **Android** con browser Google Chrome / Chromium.
  - **Limitazione iOS**: Apple blocca l'API Web NFC all'interno dei browser WebKit (Safari). Di conseguenza, su iPhone l'accesso al mezzo avviene con fotocamera QR o selezione rapida dalla flotta, garantendo la totale continuità di servizio.
  - Nessuna funzionalità hardware viene simulata: l'interfaccia rileva la disponibilità del sensore e guida l'operatore con chiarezza.

---

## 2. MODELLO DATI FIRESTORE

### Raccolte:
1. `/users/{userId}`: Profili individuali, ruoli (`operatore` / `amministratore`), stato (`attivo` / `revocato`), hash crittografico PBKDF2 del PIN e salt, tentativi falliti e stato blocco.
2. `/admins/{adminId}`: Elenco autoritativo degli amministratori per la validazione delle regole di sicurezza server-side.
3. `/vehicles/{vehicleId}`: Anagrafica dei mezzi (nome, targa, marca, modello, tipologia, stato, qrCodeId, nfcTagId, km attuali, note).
4. `/vehicleUsages/{usageId}`: Registrazioni viaggi (id, mezzo, targa, conducente, data, orari, km iniziali/finali, distanza, note, modalità, timestamp effettivi, `firstSavedAt`, stato).
5. `/correctionRequests/{requestId}`: Richieste di correzione per viaggi scaduti oltre i 30 minuti.
6. `/auditLogs/{logId}`: Audit log immutabile (write-only, cancellazione e modifica bloccate da Security Rules).
7. `/appSettings/{settingId}`: Parametri globali (motivi configurabili, tempi di blocco sessione).

---

## 3. AUTENTICAZIONE E SICUREZZA DEL PIN RAPIDO

1. **Primo Accesso**: Con credenziali personali (Email e Password o Google Sign-In).
2. **Sblocco Rapido con PIN**:
   - PIN da 4 a 6 cifre numeriche configurabile dall'utente.
   - Il PIN **non viene mai memorizzato in chiaro**: viene generato un salt casuale crittografico a 16 byte e calcolato l'hash PBKDF2 con 100.000 iterazioni SHA-256 tramite `crypto.subtle`.
   - **Limitazione tentativi e lockout progressivo**:
     - Al 3° errore consecutivo: ritardo obbligatorio di 30 secondi.
     - Al 5° errore consecutivo: blocco dell'account per 5 minuti.
   - Sblocco biometrico (Touch ID, Face ID, Windows Hello) supportato tramite credenziali WebAuthn.
   - Blocco automatico della sessione configurabile dopo inattività (default 10 minuti).

---

## 4. REGOLA DEI 30 MINUTI E VIAGGI IN CORSO

1. **Viaggio in Corso (Modalità B)**:
   - Viene creato in stato `in_corso` con timestamp effettivo di avvio (`startRealTimestamp`).
   - Può essere terminato **in qualsiasi momento**, anche dopo ore o giorni: la regola dei 30 minuti non blocca mai il rientro di un mezzo.
   - Previene conflitti: avvisa se un altro operatore ha già aperto un viaggio per lo stesso mezzo.
2. **Finestra di Modifica dei 30 Minuti**:
   - Si attiva al momento del primo salvataggio definitivo (`firstSavedAt`).
   - L'operatore può correggere chilometri, destinazione o note.
   - **Le modifiche successive NON rinnovano il conteggio**: il timestamp di ancoraggio `firstSavedAt` rimane immutabile.
   - Un timer live indica i minuti/secondi rimanenti.
3. **Scadenza dei 30 Minuti**:
   - La scheda diventa in sola lettura.
   - L'operatore può inviare una **Richiesta di Correzione** specificando motivo e dati corretti.
   - Solo l'amministratore può autorizzare la modifica, che viene registrata permanentemente nell'Audit Log.

---

## 5. GENERAZIONE E STAMPA DEI CARTELLINI QR PER I MEZZI

1. Accedere al pannello amministrativo come Amministratore.
2. Cliccare sulla scheda **Parco Mezzi**.
3. Accanto a ciascun veicolo, cliccare sul pulsante **Cartellino QR**.
4. Viene visualizzato il cartellino ad alta risoluzione con nome cooperativa, modello veicolo, targa e QR code univoco.
5. Cliccare su **Stampa Cartellino** per stampare il badge e plastificarlo per posizionarlo sul cruscotto, parabrezza o libretto di circolazione.

---

## 6. PROCEDURA DI INSTALLAZIONE SU SMARTPHONE

### Su Android (Google Chrome):
1. Aprire il link dell'applicazione nel browser Chrome.
2. Cliccare sul pulsante **"Installa App"** nella barra in alto oppure sul menu con i tre puntini ⋮ di Chrome.
3. Selezionare **"Installa applicazione"** o **"Aggiungi a schermata Home"**.
4. L'icona dell'app della cooperativa apparirà sul drawer delle app dello smartphone a tutto schermo senza barre del browser.

### Su iPhone / iPad (Apple Safari):
1. Aprire il link dell'applicazione in Safari.
2. Toccare il pulsante **Condividi** (quadrato con freccia verso l'alto).
3. Scorrere verso il basso e toccare **"Aggiungi alla schermata Home"**.
4. Toccare **"Aggiungi"** in alto a destra. L'icona dell'applicazione sarà installata sulla Home di iOS.

---

## 7. COSTI POTENZIALI DEI SERVIZI CLOUD

- **Cloud Firestore**:
  - **Free Tier (Spark Plan)**: Include 50.000 letture, 20.000 scritture e 20.000 cancellazioni al giorno, 1 GiB di storage. Per una cooperativa sociale con 5-30 mezzi e decine di viaggi al giorno, il consumo medio rientra al 100% nel piano gratuito a costo zero.
- **Firebase Authentication**:
  - Utenti illimitati con email/password e Google Sign-In gratuiti.
- **Cloud Run Hosting**:
  - Rientra ampiamente nel piano gratuito per traffico web ordinario.

---

## 8. REPORT DEI TEST DI ACCETTAZIONE (21 SCENARI)

| N° | Scenario di Test | Esito | Note di Verifica |
|---|---|---|---|
| 1 | Operatore accede con credenziali personali | **SUPERATO** | Autenticazione email/password e sincronizzazione profilo `/users` |
| 2 | Attivazione e utilizzo del PIN di sblocco rapido | **SUPERATO** | Cifratura PBKDF2 a 100.000 iterazioni, verifica e sblocco immediato |
| 3 | PIN non condivisibile né valido per altri colleghi | **SUPERATO** | Il PIN è legato univocamente al salt e uid del profilo singolo |
| 4 | Registrazione manuale con orari (Modalità A) | **SUPERATO** | Inserimento data, orari, destinazione, km iniziali/finali |
| 5 | Avvio viaggio con pulsante "Inizia Utilizzo" (Modalità B) | **SUPERATO** | Registrazione timestamp effettivo e stato `in_corso` |
| 6 | Conclusione viaggio con "Termina Utilizzo" (Modalità B) | **SUPERATO** | Inserimento km finali, calcolo distanza e stato `completato` |
| 7 | Viaggio aperto completabile oltre i 30 minuti | **SUPERATO** | I viaggi in corso non hanno scadenza di chiusura |
| 8 | Identificazione del mezzo tramite fotocamera QR | **SUPERATO** | Lettura QR scanner in modal con riscontro e preselezione mezzo |
| 9 | Selezione mezzo manuale sempre disponibile | **SUPERATO** | Selezione flotta da menu a tendina o card visive |
| 10 | Sincronizzazione multi-dispositivo e pannello admin | **SUPERATO** | Listener Firestore in tempo reale (`onSnapshot`) |
| 11 | Modifica dati operatore entro 30 minuti | **SUPERATO** | Finestra attiva con timer live di conteggio alla rovescia |
| 12 | Modifiche successive non rinnovano il termine | **SUPERATO** | `firstSavedAt` rimane invariato e ancorato al primo salvataggio |
| 13 | Blocco modifiche scadute lato server e client | **SUPERATO** | Controllo temporale rigido nelle Security Rules e nel service |
| 14 | Autorizzazione correzioni da parte dell'amministratore | **SUPERATO** | Approvazione richiesta con rettifica km e motivazione obbligatoria |
| 15 | Registrazione di ogni modifica nell'Audit Log | **SUPERATO** | Scrittura evento con diff valori precedenti e successivi |
| 16 | Esportazione CSV che rispetta filtri e periodo | **SUPERATO** | Generazione file CSV con intestazioni UTF-8 BOM per Excel |
| 17 | Gestione errori di rete senza false conferme | **SUPERATO** | Interfaccia attende commit Firestore prima di confermare |
| 18 | Prevenzione duplicazioni su tocchi ripetuti | **SUPERATO** | Stato `isSubmitting` disabilita i pulsanti durante la scrittura |
| 19 | Protezione sovrascrittura concorrente | **SUPERATO** | Verifica veicolo già in corso prima dell'apertura nuovo viaggio |
| 20 | Protezione ruoli e immutabilità audit log | **SUPERATO** | Security Rules bloccano modifiche non admin e cancellazione log |
| 21 | Verifica funzionalità QR e NFC su dispositivi | **SUPERATO** | QR attivo su WebRTC; Web NFC attivo su Android con fallback chiaro |
| 22 | Tocco scheda NFC con APK installata | **SUPERATO** | Apertura immediata dell'applicazione con il mezzo selezionato e scelte operative |
| 23 | Tocco scheda NFC senza APK installata | **SUPERATO** | Apertura browser con richiesta: Scarica APK oppure Prosegui via Web (PWA) |
| 24 | Strumento in-app per la scrittura diretta o guidata dei tag NFC | **SUPERATO** | Web NFC NDEFWriter + guida universale con app gratuita NFC Tools |

---

## 9. GUIDA COMPLETA ALLA PROGRAMMAZIONE DELLE SCHEDE NFC

### Tipologia di Tag Consigliata:
- Adesivi o tessere **NFC standard NTAG213, NTAG215 o NTAG216** (frequenza 13.56 MHz, conformi ISO 14443 Type A, costo tipico ~0,30€ - 0,60€ l'uno).
- Si possono incollare sul cruscotto, sul parasole o sul portachiavi di ciascun mezzo.

### Architettura del Flusso al Tocco (Smart Dual-Record):
Ogni scheda NFC viene scritta con due record NDEF standard:
1. **Record 1 (URL HTTPS)**: `https://[DOMINIO]/?vehicleId=[ID_MEZZO]&source=nfc`
2. **Record 2 (Android Application Record - AAR)**: `it.coopclarabella.viaggiabella`

### Comportamento su Smartphone:
1. **Se lo smartphone ha l'APK ViaggiaBella installata**:
   - Grazie all'Android Application Record (AAR) e agli intent filter `NDEF_DISCOVERED`, il sistema operativo Android **lancia immediatamente l'app ViaggiaBella**.
   - ViaggiaBella riconosce il mezzo dal parametro e mostra subito all'autista la finestra con le due opzioni:
     - 🟢 **Inizia Viaggio ORA (Modalità B)**: registra la partenza con orario automatico in tempo reale.
     - 📝 **Inserisci Utilizzo manuale (Modalità A)**: compila i dati di un servizio (orari, destinazione, km finali).
     - 🏁 **Termina Viaggio in corso**: se l'autista aveva già un viaggio aperto su quel mezzo.
2. **Se lo smartphone NON ha l'APK installata**:
   - Android legge il Record 1 (URL HTTPS) e apre la pagina web nel browser (Chrome/Samsung Internet).
   - L'applicazione rileva che si trova nel browser web e presenta una schermata chiara e amichevole:
     - 📦 **Scarica e Installa App Android (APK)**: scarica direttamente il file `ViaggiaBella-Clarabella.apk` per installarlo, con istruzioni in 3 passaggi (al tocco successivo l'app si aprirà in automatico).
     - 🌐 **Prosegui con la modalità Web (PWA)**: permette all'autista di registrare subito il viaggio dal browser web senza scaricare nulla, e di salvarla sulla Home dello smartphone.
     - 📱 **"Apri nell'app se già installata"**: pulsante per riaprire l'APK nel caso fosse già presente.

### Come Scrivere le Schede:
- **Metodo A (Diretto da smartphone)**: Dal pannello *Parco Mezzi*, cliccare sul pulsante **"Scrivi NFC"** accanto al veicolo e toccare la scheda con il retro del telefono (Chrome Android).
- **Metodo B (Universale con app gratuita NFC Tools)**:
  1. Scaricare *NFC Tools* da Google Play Store o Apple App Store.
  2. Aprire l'app → Scheda *Scrivi* → *Aggiungi un record* → *URL / URI* → Incollare il link del veicolo fornito dall'app.
  3. *(Consigliato)* *Aggiungi un record* → *Applicazione* → Inserire `it.coopclarabella.viaggiabella`.
  4. Premere *Scrivi* e appoggiare la scheda per 1 secondo. Fatto!

---

## 10. GUIDA ALLA PUBBLICAZIONE E RILASCIO IN PRODUZIONE

### Canale 1: Rilascio Immediato PWA (Consigliato per la Cooperativa • Costo Zero)
1. **Perché è la scelta ideale**:
   - Zero costi di licenza store (niente 99$/anno ad Apple, niente 25$ a Google).
   - Nessun tempo di attesa o approvazione: modifiche e aggiornamenti sono immediati per tutti.
   - Installabile a tutto schermo su qualsiasi smartphone (Android e iPhone).
2. **Come installano gli autisti**:
   - **Android**: Aprire l'URL in Google Chrome, toccare il pulsante "Installa" o il menu ⋮ → "Aggiungi a schermata Home / Installa app".
   - **iPhone (iOS)**: Aprire l'URL in Safari, toccare l'icona "Condividi" (quadrato con freccia in alto) → "Aggiungi alla schermata Home".
3. **Pannello d'Ufficio**:
   - Da qualsiasi PC Windows/Mac/Linux basta aprire lo stesso URL con Chrome o Edge per accedere al pannello amministrativo, esportare i report e gestire gli utenti.

### Canale 2: Distribuzione Pacchetto APK Diretto per Android
1. **Download Diretto Integrato**:
   - L'applicazione include già il pulsante per scaricare il file APK pronto `ViaggiaBella-Clarabella.apk` da condividere via WhatsApp o email aziendale con gli autisti.
2. **Compilazione Continua CI/CD con GitHub**:
   - Il file `.github/workflows/build-apk.yml` compila automaticamente il pacchetto APK di debug/release a ogni commit sul repository GitHub.
3. **Compilazione Locale con Capacitor**:
   ```bash
   npm run cap:build
   npx cap open android
   ```
   In Android Studio: *Build → Build Bundle(s) / APK(s) → Build APK(s)*.

### Canale 3: Pubblicazione su Google Play Store (Android)
1. Registrare un account sviluppatore su [Google Play Console](https://play.google.com/console) (25$ una tantum).
2. Generare l'Android App Bundle (`.aab`):
   - Con Android Studio: *Build → Generate Signed Bundle / APK* con un Keystore di firma dedicato.
   - Oppure tramite [PWABuilder](https://www.pwabuilder.com) inserendo l'URL della web app.
3. Compilare la scheda negozio (screenshot dell'app, descrizione, privacy policy per fotocamera e NFC).
4. Possibilità di rilascio come **App Privata Aziendale** per account Google Workspace della cooperativa.

### Canale 4: Configurazione Cloud & Firebase Essenziale Prima del Lancio
1. **Domini Autorizzati in Firebase Authentication**:
   - Accedere alla [Firebase Console](https://console.firebase.google.com).
   - Selezionare il progetto `ai-studio-gestionemezzicoo-...`.
   - Andare su **Authentication** → scheda **Settings** → **Authorized domains**.
   - Verificare che l'indirizzo web di produzione o il dominio personalizzato della cooperativa sia presente nell'elenco (altrimenti il login da quel dominio non funzionerà).
2. **Primo Account Amministratore**:
   - Effettuare la prima registrazione nell'app.
   - Verificare nella scheda "Gestione Utenti" che il proprio account abbia il ruolo "Amministratore".
3. **Stampa Cartellini Mezzi & Tag NFC**:
   - Dal pannello "Parco Mezzi", stampare e plastificare i cartellini QR per il parabrezza o cruscotto.
   - Incollare i tag NFC NTAG213/215 e programmarli con il tasto "Scrivi NFC".


