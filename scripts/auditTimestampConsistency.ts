/**
 * VIAGGIABELLA — SCRIPT DI AUDIT DI SOLA LETTURA PER LA CONSISTENZA DEI TIMESTAMP
 *
 * Questo script esamina le collezioni Firestore ('vehicleUsages', 'vehicles', 'users')
 * identificando documenti che presentano campi temporali inconsistenti con le nuove
 * Firestore Security Rules (es. 'firstSavedAt' in formato stringa ISO, campi mancanti,
 * o 'lockUntil' in formato ISO).
 *
 * MODALITÀ DI ESECUZIONE:
 * 1. Con Firebase Emulator Suite:
 *    npm run audit:emulator
 * 2. Su database live (se autenticato o con emulatore locale attivo):
 *    npm run audit:timestamps
 */

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  collection,
  getDocs,
  terminate,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  auditUsageDocument,
  auditVehicleDocument,
  auditUserDocument,
  generateAuditReport,
  DocumentAuditResult,
} from '../src/utils/timestampAudit';

export {
  auditUsageDocument,
  auditVehicleDocument,
  auditUserDocument,
  generateAuditReport,
  type DocumentAuditResult,
};

/**
 * Funzione principale per esecuzione da riga di comando.
 */
export async function runTimestampAuditCli() {
  console.log('='.repeat(70));
  console.log('🔍 VIAGGIABELLA — AUDIT DI SOLA LETTURA DEI TIMESTAMP FIRESTORE');
  console.log('='.repeat(70));

  const isEmulator = typeof process !== 'undefined' && !!process.env?.FIRESTORE_EMULATOR_HOST;
  console.log(`Ambiente target: ${isEmulator ? 'Firebase Emulator Suite (' + process.env.FIRESTORE_EMULATOR_HOST + ')' : 'Firebase Cloud (' + firebaseConfig.projectId + ')'}`);

  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  });

  const allResults: DocumentAuditResult[] = [];

  try {
    // 1. Scansione vehicleUsages
    console.log('\n[1/3] Scansione collezione "vehicleUsages"...');
    try {
      const snapUsages = await getDocs(collection(db, 'vehicleUsages'));
      console.log(`      Letti ${snapUsages.docs.length} documenti.`);
      for (const d of snapUsages.docs) {
        allResults.push(auditUsageDocument(d.id, d.data()));
      }
    } catch (err: any) {
      console.warn(`      ⚠️ Impossibile leggere "vehicleUsages": ${err.message}`);
      if (err.message.includes('insufficient permissions')) {
        console.warn('      Nota: l\'accesso a vehicleUsages richiede privilegi di amministratore autenticato.');
      }
    }

    // 2. Scansione vehicles
    console.log('\n[2/3] Scansione collezione "vehicles"...');
    try {
      const snapVehicles = await getDocs(collection(db, 'vehicles'));
      console.log(`      Letti ${snapVehicles.docs.length} documenti.`);
      for (const d of snapVehicles.docs) {
        allResults.push(auditVehicleDocument(d.id, d.data()));
      }
    } catch (err: any) {
      console.warn(`      ⚠️ Impossibile leggere "vehicles": ${err.message}`);
    }

    // 3. Scansione users
    console.log('\n[3/3] Scansione collezione "users"...');
    try {
      const snapUsers = await getDocs(collection(db, 'users'));
      console.log(`      Letti ${snapUsers.docs.length} documenti.`);
      for (const d of snapUsers.docs) {
        allResults.push(auditUserDocument(d.id, d.data()));
      }
    } catch (err: any) {
      console.warn(`      ⚠️ Impossibile leggere "users": ${err.message}`);
    }

    const report = generateAuditReport(allResults);

    console.log('\n' + '='.repeat(70));
    console.log('📊 RIEPILOGO AUDIT CONSISTENZA TIMESTAMP');
    console.log('='.repeat(70));
    console.log(`Documenti totali esaminati:   ${report.totalAnalyzed}`);
    console.log(`Documenti conformi:           ${report.totalCompliant}`);
    console.log(`Documenti con anomalie/ISO:   ${report.totalInconsistent}`);
    console.log(`  - vehicleUsages con stringa ISO: ${report.byCollection.vehicleUsages.isoString}`);
    console.log(`  - vehicleUsages senza firstSavedAt (completati): ${report.byCollection.vehicleUsages.missingFirstSavedAt}`);
    console.log(`  - users con lockUntil non nativo: ${report.byCollection.users.isoLockUntil}`);

    if (report.inconsistentDocs.length > 0) {
      console.log('\n📋 ELENCO DETTAGLIATO DOCUMENTI INCONSISTENTI:');
      console.log('-'.repeat(70));
      for (const docRes of report.inconsistentDocs) {
        console.log(`\n• [${docRes.collectionName}] ID: ${docRes.documentId} | ${docRes.label}`);
        for (const f of docRes.fields.filter(x => !x.isCompliantWithRules)) {
          console.log(`    Campo:       ${f.fieldName}`);
          console.log(`    Valore:      ${JSON.stringify(f.rawValue)}`);
          console.log(`    Tipo:        ${f.detectedType}`);
          console.log(`    Criticità:   ${f.issueSeverity.toUpperCase()}`);
          console.log(`    Descrizione: ${f.description}`);
          console.log(`    Azione:      ${f.remediationAction}`);
        }
      }
    } else {
      console.log('\n✅ NESSUNA INCONSISTENZA RILEVATA NEI DOCUMENTI ANALIZZATI.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('🛠️  PIANO DI BONIFICA RACCOMANDATO:');
    console.log('='.repeat(70));
    for (const step of report.remediationPlan) {
      console.log(`• ${step}`);
    }
    console.log('='.repeat(70) + '\n');

    await terminate(db).catch(() => {});
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(0);
    }
  } catch (globalErr: any) {
    console.error('Errore durante l\'esecuzione dell\'audit:', globalErr);
    await terminate(db).catch(() => {});
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  }
}

// Se eseguito direttamente da terminale Node.js (con verifica sicura per prevenire crash in browser/Vite)
const isNodeCli =
  typeof process !== 'undefined' &&
  Boolean(process?.argv) &&
  Array.isArray(process.argv) &&
  typeof process.argv[1] === 'string' &&
  process.argv[1].includes('auditTimestampConsistency');

if (isNodeCli) {
  runTimestampAuditCli().catch(console.error);
}
