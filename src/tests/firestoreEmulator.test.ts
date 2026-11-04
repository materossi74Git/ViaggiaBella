import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';

const PROJECT_ID = 'viaggiabella';

describe('Firestore Security Rules - Real Emulator Test Suite', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    try {
      await testEnv.clearFirestore();
    } catch {
      // Ignora eventuali conflitti concorrenziali durante il reset dell'emulatore
    }
  });

  // =========================================================================
  // SEZIONE 1: VEHICLE USAGES (I VIAGGI E LA REGOLA DEI 30 MINUTI)
  // =========================================================================
  describe('2. Test della raccolta vehicleUsages', () => {
    const operatorUid = 'operatore_mario';
    const colleagueUid = 'operatore_luigi';
    const adminUid = 'admin_boss';

    beforeEach(async () => {
      // Setup iniziale con regole disabilitate
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        // Registra admin nel registro admins
        await setDoc(doc(db, 'admins', adminUid), {
          uid: adminUid,
          email: 'admin@clarabella.it',
          role: 'amministratore',
        });
      });
    });

    it('Operatore modifica un proprio viaggio completato dopo 10 minuti (con Timestamp nativo): CONSENTITO', async () => {
      const tenMinutesAgo = Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
      const usageId = 'usg_10min';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: tenMinutesAgo,
          startKm: 1000,
          endKm: 1020,
          destination: 'Brescia Centro',
          reason: 'Trasporto Utenti',
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertSucceeds(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          destination: 'Brescia Ospedale',
          notes: 'Corretta destinazione entro 10 min',
        })
      );
    });

    it('Operatore modifica un proprio viaggio completato dopo 29 minuti (con Timestamp nativo): CONSENTITO', async () => {
      const twentyNineMinutesAgo = Timestamp.fromMillis(Date.now() - 29 * 60 * 1000);
      const usageId = 'usg_29min';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: twentyNineMinutesAgo,
          startKm: 1000,
          endKm: 1020,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertSucceeds(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          notes: 'Modifica a 29 minuti',
        })
      );
    });

    it('Operatore modifica un proprio viaggio completato dopo 31 minuti (con Timestamp nativo): NEGATO', async () => {
      const thirtyOneMinutesAgo = Timestamp.fromMillis(Date.now() - 31 * 60 * 1000);
      const usageId = 'usg_31min';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: thirtyOneMinutesAgo,
          startKm: 1000,
          endKm: 1020,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertFails(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          notes: 'Tentativo illecito a 31 minuti',
        })
      );
    });

    it('Operatore modifica un viaggio completato dopo 24 ore (con Timestamp nativo): NEGATO', async () => {
      const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
      const usageId = 'usg_24h';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: oneDayAgo,
          startKm: 1000,
          endKm: 1050,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertFails(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          destination: 'Tentativo modifica viaggio di ieri',
        })
      );
    });

    it('Operatore con firstSavedAt memorizzato come Epoch number (millisecondi): 10 min OK, 35 min NEGATO', async () => {
      const tenMinNum = Date.now() - 10 * 60 * 1000;
      const thirtyFiveMinNum = Date.now() - 35 * 60 * 1000;

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'vehicleUsages', 'usg_num_10'), {
          id: 'usg_num_10',
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: tenMinNum,
        });
        await setDoc(doc(db, 'vehicleUsages', 'usg_num_35'), {
          id: 'usg_num_35',
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: thirtyFiveMinNum,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertSucceeds(updateDoc(doc(opDb, 'vehicleUsages', 'usg_num_10'), { notes: 'Ok entro 10 min' }));
      await assertFails(updateDoc(doc(opDb, 'vehicleUsages', 'usg_num_35'), { notes: 'Fail a 35 min' }));
    });

    it('Operatore con firstSavedAt memorizzato come stringa ISO: NEGATO (limite intrinseco CEL Firestore Rules)', async () => {
      const tenMinutesAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const usageId = 'usg_iso_string';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: tenMinutesAgoIso,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      // Le security rules non potendo convertire stringhe ISO a runtime con request.time rifiutano la modifica
      await assertFails(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          notes: 'Tentativo modifica con formato ISO string',
        })
      );
    });

    it('Operatore modifica un viaggio appartenente a un collega: NEGATO', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const usageId = 'usg_collega';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: colleagueUid,
          status: 'completato',
          firstSavedAt: fiveMinutesAgo,
          startKm: 1000,
          endKm: 1010,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertFails(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          notes: 'Modifica non autorizzata viaggio collega',
        })
      );
    });

    it('Operatore modifica firstSavedAt per eludere la regola dei 30 minuti: NEGATO', async () => {
      const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      const usageId = 'usg_tamper_time';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: thirtyOneMinutesAgo,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertFails(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          firstSavedAt: new Date().toISOString(), // Tentativo di proroga
          notes: 'Tentativo reset timestamp',
        })
      );
    });

    it('Amministratore modifica un viaggio storico oltre 30 minuti: CONSENTITO', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const usageId = 'usg_storico_admin';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: tenDaysAgo,
          startKm: 5000,
          endKm: 5050,
        });
      });

      const adminDb = testEnv.authenticatedContext(adminUid).firestore();
      await assertSucceeds(
        updateDoc(doc(adminDb, 'vehicleUsages', usageId), {
          endKm: 5055,
          adminCorrectionNote: 'Rettifica chilometrica approvata',
        })
      );
    });

    it('Operatore conclude un viaggio ancora in corso dopo diverse ore (es. 5 ore): CONSENTITO', async () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      const usageId = 'usg_long_trip';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'in_corso',
          createdAt: fiveHoursAgo,
          startKm: 1000,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertSucceeds(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          status: 'completato',
          endTime: '18:30',
          endKm: 1120,
          firstSavedAt: new Date().toISOString(),
        })
      );
    });

    it('Operatore tenta di modificare un viaggio già completato e vecchio che in precedenza era in_corso: NEGATO', async () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const usageId = 'usg_old_completed';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'vehicleUsages', usageId), {
          id: usageId,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: twoDaysAgo,
          startKm: 1000,
          endKm: 1050,
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertFails(
        updateDoc(doc(opDb, 'vehicleUsages', usageId), {
          notes: 'Tentativo modifica tardiva',
        })
      );
    });

    it('Verifica formato firstSavedAt: Firestore Timestamp (entro 30m vs oltre 30m)', async () => {
      const usageRecent = 'usg_ts_recent';
      const usageOld = 'usg_ts_old';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'vehicleUsages', usageRecent), {
          id: usageRecent,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: Timestamp.fromMillis(Date.now() - 15 * 60 * 1000), // 15 min fa
        });
        await setDoc(doc(db, 'vehicleUsages', usageOld), {
          id: usageOld,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: Timestamp.fromMillis(Date.now() - 45 * 60 * 1000), // 45 min fa
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertSucceeds(updateDoc(doc(opDb, 'vehicleUsages', usageRecent), { notes: 'Ok' }));
      await assertFails(updateDoc(doc(opDb, 'vehicleUsages', usageOld), { notes: 'Fail' }));
    });

    it('Verifica formato firstSavedAt: assente, null o malformato -> modifiche negate', async () => {
      const usageNull = 'usg_null';
      const usageMalformed = 'usg_malformed';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'vehicleUsages', usageNull), {
          id: usageNull,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: null,
        });
        await setDoc(doc(db, 'vehicleUsages', usageMalformed), {
          id: usageMalformed,
          vehicleId: 'veh_1',
          driverId: operatorUid,
          status: 'completato',
          firstSavedAt: 'data_non_valida',
        });
      });

      const opDb = testEnv.authenticatedContext(operatorUid).firestore();
      await assertFails(updateDoc(doc(opDb, 'vehicleUsages', usageNull), { notes: 'Fail null' }));
      await assertFails(updateDoc(doc(opDb, 'vehicleUsages', usageMalformed), { notes: 'Fail malformed' }));
    });
  });

  // =========================================================================
  // SEZIONE 2: VEHICLES (MEZZI, TRANSIZIONI DI STATO E ANTI-LOCK)
  // =========================================================================
  describe('3. Test della raccolta vehicles', () => {
    const operatorMario = 'operatore_mario';
    const operatorLuigi = 'operatore_luigi';
    const adminUid = 'admin_boss';
    const vehicleId = 'veh_ducato';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'admins', adminUid), { uid: adminUid });
        await setDoc(doc(db, 'vehicles', vehicleId), {
          id: vehicleId,
          name: 'Fiat Ducato',
          plate: 'AB123CD',
          currentKm: 50000,
          isOccupied: false,
          activeTripId: null,
          activeDriverId: null,
          activeDriverName: null,
          status: 'attivo',
        });
      });
    });

    it('Operatore avvia un viaggio su mezzo libero (CASO 1): CONSENTITO', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertSucceeds(
        updateDoc(doc(marioDb, 'vehicles', vehicleId), {
          isOccupied: true,
          activeTripId: 'usg_101',
          activeDriverId: operatorMario,
          activeDriverName: 'Mario Rossi',
          updatedAt: new Date().toISOString(),
        })
      );
    });

    it('Operatore tenta di occupare un mezzo già occupato da un altro: NEGATO', async () => {
      // Imposta il mezzo come occupato da Mario
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), 'vehicles', vehicleId), {
          isOccupied: true,
          activeTripId: 'usg_mario',
          activeDriverId: operatorMario,
          activeDriverName: 'Mario Rossi',
        });
      });

      const luigiDb = testEnv.authenticatedContext(operatorLuigi).firestore();
      await assertFails(
        updateDoc(doc(luigiDb, 'vehicles', vehicleId), {
          isOccupied: true,
          activeTripId: 'usg_luigi',
          activeDriverId: operatorLuigi,
          activeDriverName: 'Luigi Verdi',
        })
      );
    });

    it('Operatore tenta di liberare il mezzo di un collega: NEGATO', async () => {
      // Mezzo occupato da Mario
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), 'vehicles', vehicleId), {
          isOccupied: true,
          activeTripId: 'usg_mario',
          activeDriverId: operatorMario,
          activeDriverName: 'Mario Rossi',
        });
      });

      // Luigi prova a liberarlo
      const luigiDb = testEnv.authenticatedContext(operatorLuigi).firestore();
      await assertFails(
        updateDoc(doc(luigiDb, 'vehicles', vehicleId), {
          isOccupied: false,
          activeTripId: null,
          activeDriverId: null,
          activeDriverName: null,
          updatedAt: new Date().toISOString(),
        })
      );
    });

    it('Autista attivo conclude il proprio viaggio e libera il mezzo (CASO 2): CONSENTITO', async () => {
      // Mezzo occupato da Mario
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), 'vehicles', vehicleId), {
          isOccupied: true,
          activeTripId: 'usg_mario',
          activeDriverId: operatorMario,
          activeDriverName: 'Mario Rossi',
          currentKm: 50000,
        });
      });

      // Mario conclude il viaggio incrementando i km
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertSucceeds(
        updateDoc(doc(marioDb, 'vehicles', vehicleId), {
          isOccupied: false,
          activeTripId: null,
          activeDriverId: null,
          activeDriverName: null,
          currentKm: 50035,
          updatedAt: new Date().toISOString(),
        })
      );
    });

    it('Operatore tenta di modificare activeTripId senza una transizione coerente: NEGATO', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      // Mezzo è libero, ma Mario tenta di alterare activeTripId senza impostare isOccupied: true
      await assertFails(
        updateDoc(doc(marioDb, 'vehicles', vehicleId), {
          activeTripId: 'usg_arbitrario',
        })
      );
    });

    it('Operatore tenta di modificare activeDriverId intestando a terzi: NEGATO', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      // Mario tenta di occupare il mezzo intestandolo a Luigi
      await assertFails(
        updateDoc(doc(marioDb, 'vehicles', vehicleId), {
          isOccupied: true,
          activeTripId: 'usg_fake',
          activeDriverId: operatorLuigi,
          activeDriverName: 'Luigi Verdi',
        })
      );
    });

    it('Operatore tenta di diminuire i chilometri (km rollback): NEGATO', async () => {
      // Mezzo a 50000 km
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertFails(
        updateDoc(doc(marioDb, 'vehicles', vehicleId), {
          currentKm: 49000,
          updatedAt: new Date().toISOString(),
        })
      );
    });

    it('Amministratore effettua intervento autorizzato (es. reset stato o km): CONSENTITO', async () => {
      const adminDb = testEnv.authenticatedContext(adminUid).firestore();
      await assertSucceeds(
        updateDoc(doc(adminDb, 'vehicles', vehicleId), {
          name: 'Fiat Ducato Maxi Ristrutturato',
          currentKm: 48500, // Rettifica autorizzata da admin
          isOccupied: false,
          activeTripId: null,
        })
      );
    });
  });

  // =========================================================================
  // SEZIONE 3: TEST TRANSAZIONALI E ATOMICITÀ (startTrip & finishTrip)
  // =========================================================================
  describe('4. Test transazionali di concorrenza atomica', () => {
    const operatorMario = 'operatore_mario';
    const operatorLuigi = 'operatore_luigi';
    const vehicleId = 'veh_panda';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'vehicles', vehicleId), {
          id: vehicleId,
          name: 'Panda 4x4',
          plate: 'CD456EF',
          currentKm: 20000,
          isOccupied: false,
          activeTripId: null,
          activeDriverId: null,
          status: 'attivo',
        });
      });
    });

    it('Due operatori tentano contemporaneamente di occupare lo stesso mezzo: solo 1 ha successo', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      const luigiDb = testEnv.authenticatedContext(operatorLuigi).firestore();

      const runStart = (db: any, uid: string, name: string) => {
        return runTransaction(db, async (tx: any) => {
          const vRef = doc(db, 'vehicles', vehicleId);
          const vSnap = await tx.get(vRef);
          if (!vSnap.exists() || vSnap.data().isOccupied) {
            throw new Error('VEHICLE_BUSY');
          }
          const usageId = 'usg_' + uid;
          const uRef = doc(db, 'vehicleUsages', usageId);
          tx.set(uRef, {
            id: usageId,
            vehicleId,
            driverId: uid,
            driverName: name,
            status: 'in_corso',
            createdAt: new Date().toISOString(),
          });
          tx.update(vRef, {
            isOccupied: true,
            activeTripId: usageId,
            activeDriverId: uid,
            activeDriverName: name,
            updatedAt: new Date().toISOString(),
          });
        });
      };

      const results = await Promise.allSettled([
        runStart(marioDb, operatorMario, 'Mario'),
        runStart(luigiDb, operatorLuigi, 'Luigi'),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      // Verifica stato finale veicolo nel DB
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const finalSnap = await getDoc(doc(context.firestore(), 'vehicles', vehicleId));
        expect(finalSnap.data()?.isOccupied).toBe(true);
      });
    });
  });

  // =========================================================================
  // SEZIONE 4: TEST DEL PIN, PROFILI E RUOLI
  // =========================================================================
  describe('5. Test del PIN, lockout e autorizzazioni profilo', () => {
    const operatorMario = 'operatore_mario';
    const adminUid = 'admin_boss';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'admins', adminUid), { uid: adminUid });
        await setDoc(doc(db, 'users', operatorMario), {
          uid: operatorMario,
          displayName: 'Mario Rossi',
          role: 'operatore',
          status: 'attivo',
          failedPinAttempts: 0,
          lockUntil: null,
        });
      });
    });

    it('Operatore tenta di azzerare failedPinAttempts e lockUntil durante un blocco attivo (con Timestamp nativo): NEGATO', async () => {
      const futureLock = Timestamp.fromMillis(Date.now() + 5 * 60 * 1000); // bloccato per 5 min

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), 'users', operatorMario), {
          failedPinAttempts: 5,
          lockUntil: futureLock,
        });
      });

      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      // Mario prova a cancellare il blocco prima che il tempo sia trascorso
      await assertFails(
        updateDoc(doc(marioDb, 'users', operatorMario), {
          failedPinAttempts: 0,
          lockUntil: null,
        })
      );
    });

    it('Operatore tenta di anticipare lockUntil (con Timestamp nativo): NEGATO', async () => {
      const futureLock = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 min
      const soonerLock = Timestamp.fromMillis(Date.now() + 10 * 1000); // 10 sec

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), 'users', operatorMario), {
          failedPinAttempts: 5,
          lockUntil: futureLock,
        });
      });

      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertFails(
        updateDoc(doc(marioDb, 'users', operatorMario), {
          lockUntil: soonerLock,
        })
      );
    });

    it('Operatore tenta di modificare il proprio ruolo in amministratore: NEGATO', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertFails(
        updateDoc(doc(marioDb, 'users', operatorMario), {
          role: 'amministratore',
        })
      );
    });

    it('Operatore tenta di scrivere nel registro /admins: NEGATO', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertFails(
        setDoc(doc(marioDb, 'admins', operatorMario), {
          uid: operatorMario,
          role: 'amministratore',
        })
      );
    });

    it('Utente non autenticato tenta di leggere o scrivere dati protetti: NEGATO', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'vehicles', 'veh_ducato')));
      await assertFails(getDoc(doc(unauthDb, 'vehicleUsages', 'usg_101')));
      await assertFails(getDoc(doc(unauthDb, 'users', operatorMario)));
    });
  });

  // =========================================================================
  // SEZIONE 5: CORRECTION REQUESTS E AUDIT LOGS
  // =========================================================================
  describe('6. Test di CorrectionRequests e AuditLogs', () => {
    const operatorMario = 'operatore_mario';
    const adminUid = 'admin_boss';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'admins', adminUid), { uid: adminUid });
      });
    });

    it('Creazione correctionRequest con stato in_attesa: CONSENTITO', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertSucceeds(
        setDoc(doc(marioDb, 'correctionRequests', 'req_1'), {
          id: 'req_1',
          driverId: operatorMario,
          status: 'in_attesa',
          reason: 'Dimenticato di indicare rifornimento',
          createdAt: new Date().toISOString(),
        })
      );
    });

    it('Creazione correctionRequest direttamente con stato approvata: NEGATO', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertFails(
        setDoc(doc(marioDb, 'correctionRequests', 'req_hack'), {
          id: 'req_hack',
          driverId: operatorMario,
          status: 'approvata', // illecito
          reason: 'Auto approvazione',
        })
      );
    });

    it('Scrittura append-only di auditLog con proprio UID: CONSENTITO', async () => {
      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      await assertSucceeds(
        setDoc(doc(marioDb, 'auditLogs', 'log_1'), {
          id: 'log_1',
          userId: operatorMario,
          actionType: 'creazione',
          timestamp: new Date().toISOString(),
        })
      );
    });

    it('Modifica o cancellazione di auditLog: NEGATO PER CHIUNQUE', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'auditLogs', 'log_1'), {
          id: 'log_1',
          userId: operatorMario,
        });
      });

      const marioDb = testEnv.authenticatedContext(operatorMario).firestore();
      const adminDb = testEnv.authenticatedContext(adminUid).firestore();

      await assertFails(updateDoc(doc(marioDb, 'auditLogs', 'log_1'), { note: 'hacked' }));
      await assertFails(deleteDoc(doc(marioDb, 'auditLogs', 'log_1')));
      await assertFails(deleteDoc(doc(adminDb, 'auditLogs', 'log_1')));
    });
  });
});
