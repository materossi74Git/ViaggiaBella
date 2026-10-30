import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Vehicle,
  VehicleUsage,
  CorrectionRequest,
  AuditLog,
  AppSettings,
  AppUser,
} from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Cooperativa Sociale Solidarietà',
  autoLockMinutes: 10,
  maxEditWindowMinutes: 30,
  reasons: [
    'Trasporto Utenti e Servizi Educativi',
    'Commissioni, Farmaci e Spesa',
    'Consegne Merci e Ritiro Materiali',
    'Manutenzione e Revisione Mezzo',
    'Accompagnamento Sanitario',
    'Attività Laboratoriali ed Esterne',
    'Emergenza o Altro Servizio',
  ],
};

/**
 * Pulisce ricorsivamente un oggetto per Firestore rimuovendo tutte le chiavi con valore `undefined`.
 * Questo previene in modo assoluto errori "Unsupported field value: undefined" sia su web che su mobile.
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = cleanFirestoreData(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ==========================================
// AUDIT LOG SERVICE
// ==========================================
export async function logAuditEvent(
  entry: Omit<AuditLog, 'id' | 'timestamp'>
): Promise<void> {
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const fullLog: AuditLog = {
    ...entry,
    id: logId,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'auditLogs', logId), fullLog);
  } catch (err) {
    console.error('Errore durante la scrittura del log di audit:', err);
    // Non interrompiamo il flusso primario se il logging incontra errori non bloccanti
  }
}

// ==========================================
// VEHICLES (MEZZI)
// ==========================================
export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const snap = await getDocs(collection(db, 'vehicles'));
    return snap.docs.map(d => d.data() as Vehicle);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'vehicles');
  }
}

export function subscribeVehicles(callback: (vehicles: Vehicle[]) => void): () => void {
  return onSnapshot(
    collection(db, 'vehicles'),
    snapshot => {
      const list = snapshot.docs.map(d => d.data() as Vehicle);
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'vehicles');
    }
  );
}

export async function saveVehicle(vehicle: Vehicle, user: AppUser): Promise<void> {
  try {
    const isNew = !vehicle.id;
    const vehicleId = vehicle.id || 'veh_' + Date.now();
    const dataToSave: Vehicle = {
      ...vehicle,
      id: vehicleId,
      updatedAt: new Date().toISOString(),
      createdAt: vehicle.createdAt || new Date().toISOString(),
    };

    await setDoc(doc(db, 'vehicles', vehicleId), dataToSave);

    await logAuditEvent({
      usageId: 'VEHICLE_' + vehicleId,
      userId: user.uid,
      userName: user.displayName,
      userRole: user.role,
      actionType: isNew ? 'creazione' : 'modifica_operatore',
      summary: `${isNew ? 'Creato' : 'Aggiornato'} mezzo: ${vehicle.name} (${vehicle.plate})`,
      newValues: JSON.stringify(dataToSave),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'vehicles');
  }
}

export async function deleteVehicle(vehicleId: string, user: AppUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'vehicles', vehicleId));
    await logAuditEvent({
      usageId: 'VEHICLE_' + vehicleId,
      userId: user.uid,
      userName: user.displayName,
      userRole: user.role,
      actionType: 'annullamento',
      summary: `Eliminato veicolo con ID ${vehicleId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `vehicles/${vehicleId}`);
  }
}

// ==========================================
// VEHICLE USAGES (UTILIZZI E VIAGGI)
// ==========================================
export function subscribeUsages(
  userRole: 'operatore' | 'amministratore',
  userId: string,
  callback: (usages: VehicleUsage[]) => void
): () => void {
  const colRef = collection(db, 'vehicleUsages');
  // Se operatore, sottoscrivi solo i propri viaggi; se admin, visualizza tutti
  const q =
    userRole === 'operatore'
      ? query(colRef, where('driverId', '==', userId))
      : query(colRef);

  return onSnapshot(
    q,
    snapshot => {
      const list = snapshot.docs.map(d => d.data() as VehicleUsage);
      // Ordina per data/ora decrescente
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'vehicleUsages');
    }
  );
}

/**
 * Controlla se il veicolo ha un viaggio attualmente in corso.
 * Legge direttamente lo stato atomico del veicolo (/vehicles/{vehicleId}) e,
 * se presente, recupera il documento del viaggio attivo.
 */
export async function getOngoingTripForVehicle(
  vehicleId: string,
  excludeUsageId?: string
): Promise<VehicleUsage | null> {
  try {
    // 1. Verifica prima dal documento veicolo (accessibile a tutti gli operatori autenticati)
    const vSnap = await getDoc(doc(db, 'vehicles', vehicleId));
    if (vSnap.exists()) {
      const vData = vSnap.data() as Vehicle;
      if (vData.activeTripId && vData.activeTripId !== excludeUsageId) {
        try {
          const uSnap = await getDoc(doc(db, 'vehicleUsages', vData.activeTripId));
          if (uSnap.exists()) {
            const u = uSnap.data() as VehicleUsage;
            if (u.status === 'in_corso') {
              return u;
            }
          }
        } catch {
          // Se la regola di lettura di vehicleUsages impedisce la lettura completa (es. altro guidatore),
          // restituiamo un oggetto sintetico sicuro basato sul veicolo per prevenire conflitti
          return {
            id: vData.activeTripId,
            vehicleId: vData.id,
            vehicleName: vData.name,
            vehiclePlate: vData.plate,
            driverId: vData.activeDriverId || '',
            driverName: vData.activeDriverName || 'Altro operatore',
            usageDate: new Date().toISOString().split('T')[0],
            startTime: '',
            destination: '',
            reason: '',
            startKm: vData.currentKm || 0,
            status: 'in_corso',
            mode: 'pulsanti',
            createdAt: vData.updatedAt || new Date().toISOString(),
            updatedAt: vData.updatedAt || new Date().toISOString(),
            lastModifiedBy: '',
            lastModifiedByName: '',
          };
        }
      }
    }

    // 2. Fallback su query per compatibilità con dati storici
    const q = query(
      collection(db, 'vehicleUsages'),
      where('vehicleId', '==', vehicleId),
      where('status', '==', 'in_corso')
    );
    const snap = await getDocs(q);
    const docs = snap.docs
      .map(d => d.data() as VehicleUsage)
      .filter(u => u.id !== excludeUsageId);
    return docs.length > 0 ? docs[0] : null;
  } catch (error) {
    // Non interrompere il flusso se la query globale viene ristretta dalle regole ABAC
    return null;
  }
}

/**
 * Controlla se il conducente ha un proprio viaggio attualmente in corso.
 */
export async function getOngoingTripForDriver(driverId: string): Promise<VehicleUsage | null> {
  try {
    const q = query(
      collection(db, 'vehicleUsages'),
      where('driverId', '==', driverId),
      where('status', '==', 'in_corso')
    );
    const snap = await getDocs(q);
    return snap.docs.length > 0 ? (snap.docs[0].data() as VehicleUsage) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'vehicleUsages');
  }
}

/**
 * Avvia un nuovo viaggio in MODALITÀ B (Pulsante INIZIA UTILIZZO)
 * ESEGUE UNA TRANSAZIONE ATOMICA SU FIRESTORE:
 * 1. Legge il veicolo verificando che esista e che status == 'attivo'.
 * 2. Verifica che il mezzo NON sia già impegnato (isOccupied != true e activeTripId nullo).
 * 3. Crea il record in vehicleUsages con status: 'in_corso'.
 * 4. Blocca il mezzo impostando isOccupied: true, activeTripId, activeDriverId, activeDriverName.
 * Impedisce matematicamente doppie aperture concorrenti anche con clic simultanei di più operatori.
 */
export async function startTripWithButtons(
  params: {
    vehicle: Vehicle;
    driver: AppUser;
    destination?: string;
    reason?: string;
    startKm?: number;
    startGpsPoint?: string;
    startLocation?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
      timestamp?: string;
    };
    notes?: string;
  }
): Promise<VehicleUsage> {
  const { vehicle, driver, destination, reason, startKm, startGpsPoint, startLocation, notes } = params;

  if (!driver || !driver.uid) {
    throw new Error('Operatore non autenticato. Effettua l\'accesso prima di iniziare.');
  }

  if (driver.status === 'revocato') {
    throw new Error('Utenza non autorizzata o revocata.');
  }

  const cleanDestination = (destination && destination.trim()) ? destination.trim() : 'Servizio cooperativa';
  const cleanReason = (reason && reason.trim()) ? reason.trim() : 'Trasporto Utenti e Servizi Educativi';

  const now = new Date();
  const usageId = 'usg_' + now.getTime() + '_' + Math.random().toString(36).substring(2, 6);
  const nowIso = now.toISOString();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const startTimeStr = `${hours}:${minutes}`;
  const usageDateStr = nowIso.split('T')[0];

  const vehicleRef = doc(db, 'vehicles', vehicle.id);
  const usageRef = doc(db, 'vehicleUsages', usageId);

  try {
    const createdUsage = await runTransaction(db, async (transaction) => {
      // 1. Lettura atomica del mezzo
      const vehicleSnap = await transaction.get(vehicleRef);
      if (!vehicleSnap.exists()) {
        throw new Error(`Il veicolo "${vehicle.name}" (${vehicle.plate}) non è stato trovato nel database.`);
      }

      const vehicleData = vehicleSnap.data() as Vehicle;

      // 2. Controllo stato attivo
      if (vehicleData.status === 'inattivo') {
        throw new Error(`Il veicolo ${vehicleData.name} (${vehicleData.plate}) risulta disattivato o fuori servizio.`);
      }

      // 3. Controllo atomico occupazione veicolo
      if (vehicleData.isOccupied || (vehicleData.activeTripId && vehicleData.activeTripId.trim() !== '')) {
        // Verifica se l'eventuale viaggio registrato esiste davvero ed è effettivamente 'in_corso'
        let isRealTripActive = true;
        if (vehicleData.activeTripId) {
          try {
            const activeUsageSnap = await transaction.get(doc(db, 'vehicleUsages', vehicleData.activeTripId));
            if (activeUsageSnap.exists()) {
              const activeUsageData = activeUsageSnap.data() as VehicleUsage;
              if (activeUsageData.status !== 'in_corso') {
                // Il viaggio precedente risulta già concluso nel DB!
                isRealTripActive = false;
              }
            } else {
              // Documento del viaggio non trovato nel DB (orfano)
              isRealTripActive = false;
            }
          } catch {
            // Se le regole impediscono la lettura di altri conducenti, ci basiamo sullo stato registrato nel veicolo
          }
        }

        if (isRealTripActive) {
          const busyBy = vehicleData.activeDriverName || 'un altro operatore';
          const isSameDriver = vehicleData.activeDriverId === driver.uid;
          if (isSameDriver) {
            throw new Error(`Attenzione: hai già un viaggio attivo aperto con questo mezzo (${vehicleData.name}). Concludi prima il viaggio in corso.`);
          } else {
            throw new Error(`Attenzione: il mezzo ${vehicleData.name} (${vehicleData.plate}) risulta già in uso da ${busyBy}.`);
          }
        }
      }

      const effectiveStartKm = startKm !== undefined && startKm !== null && !isNaN(startKm)
        ? Math.max(0, startKm)
        : (vehicleData.currentKm || 0);

      const usagePayload: Record<string, any> = {
        id: usageId,
        vehicleId: vehicleData.id,
        vehicleName: vehicleData.name,
        vehiclePlate: vehicleData.plate,
        driverId: driver.uid,
        driverName: driver.displayName,
        usageDate: usageDateStr,
        startTime: startTimeStr,
        destination: cleanDestination,
        reason: cleanReason,
        startKm: effectiveStartKm,
        notes: notes?.trim() || '',
        status: 'in_corso',
        mode: 'pulsanti',
        startRealTimestamp: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastModifiedBy: driver.uid,
        lastModifiedByName: driver.displayName,
      };

      if (startGpsPoint && startGpsPoint.trim()) {
        usagePayload.startGpsPoint = startGpsPoint.trim();
      }
      if (startLocation && typeof startLocation.latitude === 'number' && typeof startLocation.longitude === 'number') {
        usagePayload.startLocation = cleanFirestoreData({
          latitude: startLocation.latitude,
          longitude: startLocation.longitude,
          accuracy: startLocation.accuracy,
          address: startLocation.address,
          timestamp: startLocation.timestamp || nowIso,
        });
      }

      const finalUsageDoc = cleanFirestoreData(usagePayload) as VehicleUsage;

      // 4. Scrittura atomica combinata di viaggio e blocco mezzo
      transaction.set(usageRef, finalUsageDoc);
      transaction.update(
        vehicleRef,
        cleanFirestoreData({
          isOccupied: true,
          activeTripId: usageId,
          activeDriverId: driver.uid,
          activeDriverName: driver.displayName,
          updatedAt: nowIso,
        })
      );

      return finalUsageDoc;
    });

    await logAuditEvent({
      usageId,
      userId: driver.uid,
      userName: driver.displayName,
      userRole: driver.role,
      actionType: 'creazione',
      summary: `Inizio viaggio con pulsanti (atomico): ${vehicle.name} (${vehicle.plate}) - Destinazione: ${cleanDestination}${startGpsPoint ? ` - GPS: ${startGpsPoint}` : ''}`,
      newValues: JSON.stringify(createdUsage),
    });

    return createdUsage;
  } catch (error: any) {
    if (error?.message && (
      error.message.includes('risulta già in uso') ||
      error.message.includes('hai già un viaggio attivo') ||
      error.message.includes('disattivato') ||
      error.message.includes('non è stato trovato') ||
      error.message.includes('non autorizzata')
    )) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `vehicleUsages/${usageId}`);
  }
}

/**
 * Sblocca lo stato di occupazione di un mezzo (es. in caso di viaggio terminato in modo anomalo o disconnessione).
 */
export async function forceReleaseVehicleLock(vehicleId: string, user: AppUser): Promise<void> {
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  const nowIso = new Date().toISOString();
  await updateDoc(
    vehicleRef,
    cleanFirestoreData({
      isOccupied: false,
      activeTripId: null,
      activeDriverId: null,
      activeDriverName: null,
      updatedAt: nowIso,
    })
  );

  await logAuditEvent({
    usageId: 'RESET_' + vehicleId,
    userId: user.uid,
    userName: user.displayName,
    userRole: user.role,
    actionType: 'correzione_amministrativa',
    summary: `Sblocco forzato stato occupazione mezzo ${vehicleId}`,
  });
}

/**
 * Conclude un viaggio in corso in MODALITÀ B (Pulsante TERMINA UTILIZZO)
 * ESEGUE UNA TRANSAZIONE ATOMICA SU FIRESTORE:
 * 1. Legge il viaggio e il veicolo.
 * 2. Verifica che il viaggio sia effettivamente 'in_corso' (previene doppi clic).
 * 3. Verifica autorizzazione (operatore conducente o amministratore).
 * 4. Valida endKm (se inserito) >= startKm.
 * 5. Imposta status: 'completato', orario, punto GPS di lettura chiusura e parametri opzionali.
 * 6. Rilascia l'occupazione del mezzo (isOccupied: false, activeTripId: null).
 */
export async function finishTripWithButtons(
  params: {
    usage: VehicleUsage;
    user: AppUser;
    endKm?: number;
    endGpsPoint?: string;
    endLocation?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
      timestamp?: string;
    };
    destination?: string;
    reason?: string;
    notes?: string;
  }
): Promise<VehicleUsage> {
  const { usage, user, endKm, endGpsPoint, endLocation, destination, reason, notes } = params;

  if (endKm !== undefined && endKm !== null && !isNaN(endKm) && usage.startKm !== undefined && endKm < usage.startKm) {
    throw new Error('Il chilometraggio finale non può essere inferiore a quello iniziale.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const endTimeStr = `${hours}:${minutes}`;

  const hasEndKm = endKm !== undefined && endKm !== null && !isNaN(endKm);
  const distance = hasEndKm && usage.startKm !== undefined ? Math.max(0, endKm - usage.startKm) : undefined;

  const usageRef = doc(db, 'vehicleUsages', usage.id);
  const vehicleRef = doc(db, 'vehicles', usage.vehicleId);

  try {
    const updatedUsage = await runTransaction(db, async (transaction) => {
      // 1. Letture atomiche preliminari
      const usageSnap = await transaction.get(usageRef);
      if (!usageSnap.exists()) {
        throw new Error('Il viaggio specificato non esiste o è stato rimosso.');
      }

      const vehicleSnap = await transaction.get(vehicleRef);
      if (!vehicleSnap.exists()) {
        throw new Error('Il veicolo associato al viaggio non è stato trovato.');
      }

      const existingUsage = usageSnap.data() as VehicleUsage;
      const vehicleData = vehicleSnap.data() as Vehicle;

      // 2. Prevenzione doppia conclusione
      if (existingUsage.status !== 'in_corso') {
        throw new Error('Questo viaggio risulta già concluso.');
      }

      // 3. Verifica autorizzazione (solo conducente o amministratore)
      if (user.role !== 'amministratore' && existingUsage.driverId !== user.uid) {
        throw new Error('Non sei autorizzato a concludere il viaggio di un altro operatore.');
      }

      // 4. Validazione chilometri opzionale (solo se specificati)
      if (hasEndKm && existingUsage.startKm !== undefined && endKm < existingUsage.startKm) {
        throw new Error(`I chilometri finali (${endKm}) non possono essere inferiori a quelli iniziali (${existingUsage.startKm}).`);
      }

      // 5. Coerenza tra viaggio e veicolo
      if (existingUsage.vehicleId !== vehicleData.id) {
        throw new Error('Incongruenza tra il veicolo registrato nel viaggio e il veicolo nel database.');
      }

      const completedUsagePayload: Record<string, any> = {
        ...existingUsage,
        status: 'completato',
        endTime: endTimeStr,
        endRealTimestamp: nowIso,
        notes: notes !== undefined ? notes.trim() : (existingUsage.notes || ''),
        firstSavedAt: existingUsage.firstSavedAt || nowIso,
        updatedAt: nowIso,
        lastModifiedBy: user.uid,
        lastModifiedByName: user.displayName,
      };

      if (hasEndKm) {
        completedUsagePayload.endKm = endKm;
      }
      if (distance !== undefined) {
        completedUsagePayload.distanceKm = distance;
      }
      if (endGpsPoint && endGpsPoint.trim()) {
        completedUsagePayload.endGpsPoint = endGpsPoint.trim();
      }
      if (endLocation && typeof endLocation.latitude === 'number' && typeof endLocation.longitude === 'number') {
        completedUsagePayload.endLocation = cleanFirestoreData({
          latitude: endLocation.latitude,
          longitude: endLocation.longitude,
          accuracy: endLocation.accuracy,
          address: endLocation.address,
          timestamp: endLocation.timestamp || nowIso,
        });
      }
      if (destination && destination.trim()) {
        completedUsagePayload.destination = destination.trim();
      }
      if (reason && reason.trim()) {
        completedUsagePayload.reason = reason.trim();
      }

      const finalCompletedDoc = cleanFirestoreData(completedUsagePayload) as VehicleUsage;

      const newKm = hasEndKm
        ? Math.max(vehicleData.currentKm || 0, endKm)
        : (vehicleData.currentKm || 0);

      // 6. Scritture atomiche
      transaction.set(usageRef, finalCompletedDoc);
      transaction.update(
        vehicleRef,
        cleanFirestoreData({
          currentKm: newKm,
          isOccupied: false,
          activeTripId: null,
          activeDriverId: null,
          activeDriverName: null,
          updatedAt: nowIso,
        })
      );

      return finalCompletedDoc;
    });

    await logAuditEvent({
      usageId: usage.id,
      userId: user.uid,
      userName: user.displayName,
      userRole: user.role,
      actionType: 'completamento',
      summary: `Viaggio concluso (atomico): ${usage.vehicleName}${endGpsPoint ? ` - GPS Chiusura: ${endGpsPoint}` : ''}${distance !== undefined ? ` - Percorsi ${distance} km` : ''}`,
      previousValues: JSON.stringify(usage),
      newValues: JSON.stringify(updatedUsage),
    });

    return updatedUsage;
  } catch (error: any) {
    if (error?.message && (
      error.message.includes('già concluso') ||
      error.message.includes('non possono essere inferiori') ||
      error.message.includes('Non sei autorizzato') ||
      error.message.includes('non esiste') ||
      error.message.includes('non è stato trovato') ||
      error.message.includes('Incongruenza')
    )) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `vehicleUsages/${usage.id}`);
  }
}

/**
 * Salva una registrazione completa in MODALITÀ A (Inserimento Manuale)
 */
export async function saveManualUsage(
  usage: Partial<VehicleUsage>,
  driver: AppUser
): Promise<VehicleUsage> {
  const isNew = !usage.id;
  const now = new Date();
  const nowIso = now.toISOString();
  const usageId = usage.id || 'usg_' + now.getTime() + '_' + Math.random().toString(36).substring(2, 6);

  if (!usage.vehicleId || !usage.destination || !usage.reason || !usage.startTime) {
    throw new Error('Tutti i campi obbligatori devono essere compilati.');
  }

  const startKm = Number(usage.startKm) || 0;
  const endKm = usage.endKm !== undefined && usage.endKm !== null ? Number(usage.endKm) : undefined;

  if (endKm !== undefined && endKm < startKm) {
    throw new Error('Il chilometraggio finale non può essere inferiore a quello iniziale.');
  }

  const distanceKm = endKm !== undefined ? Math.max(0, endKm - startKm) : undefined;
  const isCompleted = !!usage.endTime;

  // Se completato e non ha ancora firstSavedAt, viene impostato ad adesso
  const firstSavedAt = usage.firstSavedAt || (isCompleted ? nowIso : undefined);

  const fullUsage: VehicleUsage = {
    id: usageId,
    vehicleId: usage.vehicleId,
    vehicleName: usage.vehicleName || 'Mezzo',
    vehiclePlate: usage.vehiclePlate || '',
    driverId: usage.driverId || driver.uid,
    driverName: usage.driverName || driver.displayName,
    usageDate: usage.usageDate || nowIso.split('T')[0],
    startTime: usage.startTime,
    endTime: usage.endTime || '',
    destination: usage.destination.trim(),
    reason: usage.reason.trim(),
    startKm,
    endKm,
    distanceKm,
    notes: usage.notes?.trim() || '',
    status: isCompleted ? 'completato' : 'in_corso',
    mode: 'manuale',
    firstSavedAt,
    createdAt: usage.createdAt || nowIso,
    updatedAt: nowIso,
    lastModifiedBy: driver.uid,
    lastModifiedByName: driver.displayName,
    hasAnomalies: usage.hasAnomalies || false,
    anomalyNotes: usage.anomalyNotes || '',
  };

  try {
    await setDoc(doc(db, 'vehicleUsages', usageId), fullUsage);

    if (endKm !== undefined && usage.vehicleId) {
      try {
        const vSnap = await getDoc(doc(db, 'vehicles', usage.vehicleId));
        if (vSnap.exists()) {
          const vData = vSnap.data() as Vehicle;
          const newKm = Math.max(vData.currentKm || 0, endKm);
          await updateDoc(doc(db, 'vehicles', usage.vehicleId), {
            currentKm: newKm,
            ...(isCompleted && vData.activeTripId === usageId ? {
              isOccupied: false,
              activeTripId: null,
              activeDriverId: null,
              activeDriverName: null,
            } : {}),
            updatedAt: nowIso,
          });
        }
      } catch (err) {
        console.warn('Aggiornamento km veicolo da inserimento manuale:', err);
      }
    }

    await logAuditEvent({
      usageId,
      userId: driver.uid,
      userName: driver.displayName,
      userRole: driver.role,
      actionType: isNew ? 'creazione' : 'modifica_operatore',
      summary: `${isNew ? 'Nuovo' : 'Aggiornato'} utilizzo manuale: ${fullUsage.vehicleName} (${fullUsage.usageDate})`,
      newValues: JSON.stringify(fullUsage),
    });

    return fullUsage;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `vehicleUsages/${usageId}`);
  }
}

/**
 * Modifica di una registrazione esistente con controllo ferreo dei 30 MINUTI.
 * Le modifiche successive NON rinnovano il conteggio dei 30 minuti.
 */
export async function updateUsageWith30MinRule(
  updatedUsage: VehicleUsage,
  user: AppUser,
  reasonForAdminEdit?: string
): Promise<VehicleUsage> {
  const usageRef = doc(db, 'vehicleUsages', updatedUsage.id);
  const snap = await getDoc(usageRef);

  if (!snap.exists()) {
    throw new Error('La registrazione richiesta non esiste.');
  }

  const existing = snap.data() as VehicleUsage;
  const now = new Date();
  const nowIso = now.toISOString();

  // Se l'utente è un operatore (non amministratore)
  if (user.role !== 'amministratore') {
    // 1. Non può modificare registrazioni altrui
    if (existing.driverId !== user.uid) {
      throw new Error('Non sei autorizzato a modificare i viaggi di altri colleghi.');
    }

    // 2. Se il viaggio era già completato, controlla la finestra dei 30 minuti
    if (existing.status === 'completato' && existing.firstSavedAt) {
      const firstSavedTime = new Date(existing.firstSavedAt).getTime();
      const diffMinutes = (now.getTime() - firstSavedTime) / (1000 * 60);

      if (diffMinutes > 30) {
        throw new Error(
          `Finestra di modifica scaduta: sono trascorsi ${Math.round(
            diffMinutes
          )} minuti dal primo salvataggio. Le modifiche sono consentite solo per 30 minuti. Invia una richiesta di correzione all'amministratore.`
        );
      }
    }
  }

  // IMPORTANTE: Mantieni inalterato firstSavedAt per impedire il riavvio della finestra!
  const finalFirstSavedAt = existing.firstSavedAt || updatedUsage.firstSavedAt || nowIso;

  const startKm = Number(updatedUsage.startKm) || 0;
  const endKm = updatedUsage.endKm !== undefined && updatedUsage.endKm !== null ? Number(updatedUsage.endKm) : undefined;
  const distanceKm = endKm !== undefined ? Math.max(0, endKm - startKm) : undefined;

  const toSave: VehicleUsage = {
    ...updatedUsage,
    firstSavedAt: finalFirstSavedAt,
    startKm,
    endKm,
    distanceKm,
    updatedAt: nowIso,
    lastModifiedBy: user.uid,
    lastModifiedByName: user.displayName,
  };

  try {
    await setDoc(usageRef, toSave);

    await logAuditEvent({
      usageId: toSave.id,
      userId: user.uid,
      userName: user.displayName,
      userRole: user.role,
      actionType: user.role === 'amministratore' ? 'correzione_amministrativa' : 'modifica_operatore',
      summary: `${user.role === 'amministratore' ? 'Correzione amministrativa' : 'Modifica operatore'} per viaggio ${toSave.vehicleName}`,
      previousValues: JSON.stringify(existing),
      newValues: JSON.stringify(toSave),
      adminAuthorizerId: user.role === 'amministratore' ? user.uid : undefined,
      adminAuthorizerName: user.role === 'amministratore' ? user.displayName : undefined,
      reason: reasonForAdminEdit || (user.role === 'amministratore' ? 'Rettifica dati da pannello' : 'Modifica ordinaria nei 30 minuti'),
    });

    return toSave;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `vehicleUsages/${updatedUsage.id}`);
  }
}

// ==========================================
// CORRECTION REQUESTS (RICHIESTE DI CORREZIONE)
// ==========================================
export async function createCorrectionRequest(
  params: {
    usage: VehicleUsage;
    driver: AppUser;
    reason: string;
    desiredChanges: string;
  }
): Promise<CorrectionRequest> {
  const { usage, driver, reason, desiredChanges } = params;
  const now = new Date().toISOString();
  const id = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const req: CorrectionRequest = {
    id,
    usageId: usage.id,
    driverId: driver.uid,
    driverName: driver.displayName,
    vehicleName: `${usage.vehicleName} (${usage.vehiclePlate})`,
    requestDate: now,
    reason: reason.trim(),
    desiredChanges: desiredChanges.trim(),
    status: 'in_attesa',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'correctionRequests', id), req);

    await logAuditEvent({
      usageId: usage.id,
      userId: driver.uid,
      userName: driver.displayName,
      userRole: driver.role,
      actionType: 'modifica_operatore',
      summary: `Inviata richiesta di correzione per viaggio ${usage.vehicleName}`,
      reason,
      newValues: JSON.stringify(req),
    });

    return req;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `correctionRequests/${id}`);
  }
}

export function subscribeCorrectionRequests(
  userRole: 'operatore' | 'amministratore',
  userId: string,
  callback: (reqs: CorrectionRequest[]) => void
): () => void {
  const colRef = collection(db, 'correctionRequests');
  const q =
    userRole === 'operatore'
      ? query(colRef, where('driverId', '==', userId))
      : query(colRef);

  return onSnapshot(
    q,
    snap => {
      const list = snap.docs.map(d => d.data() as CorrectionRequest);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'correctionRequests');
    }
  );
}

export async function resolveCorrectionRequest(
  requestId: string,
  decision: 'approvata' | 'rifiutata',
  admin: AppUser,
  adminNotes: string,
  appliedUsageData?: Partial<VehicleUsage>
): Promise<void> {
  const reqRef = doc(db, 'correctionRequests', requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) {
    throw new Error('Richiesta non trovata');
  }

  const req = snap.data() as CorrectionRequest;
  const now = new Date().toISOString();

  try {
    await updateDoc(reqRef, {
      status: decision,
      adminId: admin.uid,
      adminName: admin.displayName,
      decisionDate: now,
      adminNotes: adminNotes.trim(),
      updatedAt: now,
    });

    // Se approvata e sono stati forniti dati aggiornati, applica la modifica alla registrazione
    if (decision === 'approvata' && appliedUsageData && req.usageId) {
      const usageRef = doc(db, 'vehicleUsages', req.usageId);
      const usageSnap = await getDoc(usageRef);
      if (usageSnap.exists()) {
        const oldUsage = usageSnap.data() as VehicleUsage;
        const newUsage: VehicleUsage = {
          ...oldUsage,
          ...appliedUsageData,
          updatedAt: now,
          lastModifiedBy: admin.uid,
          lastModifiedByName: admin.displayName,
        };
        await setDoc(usageRef, newUsage);

        await logAuditEvent({
          usageId: req.usageId,
          userId: admin.uid,
          userName: admin.displayName,
          userRole: admin.role,
          actionType: 'correzione_amministrativa',
          summary: `Approvata richiesta e applicata correzione amministrativa per ${req.vehicleName}`,
          previousValues: JSON.stringify(oldUsage),
          newValues: JSON.stringify(newUsage),
          adminAuthorizerId: admin.uid,
          adminAuthorizerName: admin.displayName,
          reason: `Richiesta approvata: ${req.reason}. Note admin: ${adminNotes}`,
        });
      }
    } else {
      await logAuditEvent({
        usageId: req.usageId,
        userId: admin.uid,
        userName: admin.displayName,
        userRole: admin.role,
        actionType: 'correzione_amministrativa',
        summary: `Richiesta di correzione ${decision}: ${req.vehicleName}`,
        reason: adminNotes,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `correctionRequests/${requestId}`);
  }
}

// ==========================================
// APP SETTINGS
// ==========================================
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const snap = await getDoc(doc(db, 'appSettings', 'global'));
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
    // Salva impostazioni di default
    await setDoc(doc(db, 'appSettings', 'global'), DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: AppSettings, admin: AppUser): Promise<void> {
  try {
    await setDoc(doc(db, 'appSettings', 'global'), settings);
    await logAuditEvent({
      usageId: 'SETTINGS_GLOBAL',
      userId: admin.uid,
      userName: admin.displayName,
      userRole: admin.role,
      actionType: 'correzione_amministrativa',
      summary: 'Aggiornamento parametri globali applicazione',
      newValues: JSON.stringify(settings),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appSettings/global');
  }
}

// ==========================================
// AUDIT LOGS SUBSCRIPTION
// ==========================================
export function subscribeAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
  const colRef = collection(db, 'auditLogs');
  return onSnapshot(
    colRef,
    snap => {
      const list = snap.docs.map(d => d.data() as AuditLog);
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    }
  );
}

// ==========================================
// USERS MANAGEMENT
// ==========================================
export function subscribeUsers(callback: (users: AppUser[]) => void): () => void {
  return onSnapshot(
    collection(db, 'users'),
    snap => {
      const list = snap.docs.map(d => d.data() as AppUser);
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

export async function updateUserRoleOrStatus(
  targetUid: string,
  updates: Partial<Pick<AppUser, 'role' | 'status' | 'displayName'>>,
  admin: AppUser
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (updates.role === 'amministratore') {
      await setDoc(doc(db, 'admins', targetUid), {
        email: updates.displayName || 'admin',
        grantedAt: new Date().toISOString(),
      });
    } else if (updates.role === 'operatore') {
      await deleteDoc(doc(db, 'admins', targetUid)).catch(() => {});
    }

    await logAuditEvent({
      usageId: 'USER_' + targetUid,
      userId: admin.uid,
      userName: admin.displayName,
      userRole: admin.role,
      actionType: 'correzione_amministrativa',
      summary: `Aggiornato profilo utente ${targetUid}: ${JSON.stringify(updates)}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
  }
}
