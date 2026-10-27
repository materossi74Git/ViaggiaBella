# Specifiche di Sicurezza e Regole Firestore

## 1. Invarianti dei Dati
- **Autenticazione e Ruoli**: Solo gli utenti autenticati con profilo attivo possono interagire con il database.
- **Amministratore Protetto**: Gli utenti ordinari non possono promuovere sé stessi o altri a ruoli con privilegi amministrativi né scrivere nella collezione `/admins`. L'utente iniziale con email `materossi74@gmail.com` o chi è presente in `/admins/{uid}` ha privilegi amministrativi.
- **Integrità Utente**: Un operatore può creare o aggiornare solo il proprio documento in `/users/{userId}` dove `userId == request.auth.uid`, senza modificare il campo `role` o `status`.
- **Anagrafica Mezzi**: Solo gli amministratori possono creare, aggiornare o disattivare veicoli. Gli operatori autenticati possono leggere l'anagrafica dei veicoli per selezionarli durante la registrazione.
- **Registrazione Utilizzi (Viaggi)**:
  - Gli operatori possono creare registrazioni dove `driverId == request.auth.uid`.
  - Gli operatori possono aggiornare solo le proprie registrazioni se lo stato è `in_corso` oppure se entro la finestra di 30 minuti dal primo salvataggio (`firstSavedAt`).
  - Una modifica successiva non può rinnovare il timestamp `firstSavedAt`.
  - Gli amministratori possono visualizzare e aggiornare tutti gli utilizzi (incluso autorizzare correzioni).
- **Richieste di Correzione**:
  - Gli operatori possono creare richieste di correzione per le proprie registrazioni (`driverId == request.auth.uid`).
  - Solo gli amministratori possono modificare lo stato (`approvata`, `rifiutata`) o rispondere.
- **Audit Log Immutabile**:
  - Qualsiasi utente autenticato può appendere una voce di log per la propria azione, ma nessun client (né operatore né amministratore) può sovrascrivere o cancellare record di audit (`allow update, delete: if false`).

## 2. Le "Dirty Dozen" (12 Payload di Test di Violazione)
1. **Payload 1 - Privilege Escalation**: Operatore invia scrittura su `/admins/{uid}` per diventare amministratore -> Atteso: REJECT (PERMISSION_DENIED).
2. **Payload 2 - Role Tampering**: Operatore aggiorna `/users/{uid}` con `{ role: "amministratore" }` -> Atteso: REJECT.
3. **Payload 3 - Driver Spoofing**: Operatore A crea viaggio con `driverId: "operator_B"` -> Atteso: REJECT.
4. **Payload 4 - Overwrite Other Operator's Trip**: Operatore A aggiorna `/vehicleUsages/{usageB}` appartenente a Operatore B -> Atteso: REJECT.
5. **Payload 5 - Timestamp Reset (Window Extension)**: Operatore cerca di riavviare la finestra di 30 minuti alterando `firstSavedAt` -> Atteso: REJECT.
6. **Payload 6 - Post-30-Minute Unauthorized Update**: Operatore tenta di modificare un viaggio completato con `firstSavedAt` precedente a 30 minuti fa -> Atteso: REJECT.
7. **Payload 7 - Vehicle Tampering**: Operatore non-amministratore tenta di modificare o eliminare un veicolo in `/vehicles/{id}` -> Atteso: REJECT.
8. **Payload 8 - Audit Log Erasure**: Tentativo di eliminazione di una voce in `/auditLogs/{id}` -> Atteso: REJECT.
9. **Payload 9 - Audit Log Modification**: Tentativo di sovrascrittura di un log di audit esistente -> Atteso: REJECT.
10. **Payload 10 - Self-Approval of Correction Request**: Operatore prova ad aggiornare la propria richiesta di correzione a `status: "approvata"` -> Atteso: REJECT.
11. **Payload 11 - Giant Payload Injection (Denial of Wallet)**: Invio di stringhe superiori a 50KB in campi note o ID non conformi -> Atteso: REJECT.
12. **Payload 12 - Unauthenticated Read/Write**: Richiesta API priva di token autenticato su collezioni protette -> Atteso: REJECT.
