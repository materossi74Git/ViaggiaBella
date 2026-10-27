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
 */
export async function getOngoingTripForVehicle(
  vehicleId: string,
  excludeUsageId?: string
): Promise<VehicleUsage | null> {
  try {
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
    handleFirestoreError(error, OperationType.GET, 'vehicleUsages');
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
 */
export async function startTripWithButtons(
  params: {
    vehicle: Vehicle;
    driver: AppUser;
    destination: string;
    reason: string;
    startKm: number;
    notes?: string;
  }
): Promise<VehicleUsage> {
  const { vehicle, driver, destination, reason, startKm, notes } = params;

  // Verifica se esiste già un viaggio aperto per lo stesso veicolo
  const existingActive = await getOngoingTripForVehicle(vehicle.id);
  if (existingActive) {
    throw new Error(
      `Attenzione: il mezzo ${vehicle.name} (${vehicle.plate}) risulta già in uso da ${existingActive.driverName}. Concludere il viaggio precedente prima di avviarne uno nuovo.`
    );
  }

  const now = new Date();
  const usageId = 'usg_' + now.getTime() + '_' + Math.random().toString(36).substring(2, 6);
  const nowIso = now.toISOString();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const startTimeStr = `${hours}:${minutes}`;
  const usageDateStr = nowIso.split('T')[0];

  const newUsage: VehicleUsage = {
    id: usageId,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehiclePlate: vehicle.plate,
    driverId: driver.uid,
    driverName: driver.displayName,
    usageDate: usageDateStr,
    startTime: startTimeStr,
    destination: destination.trim(),
    reason: reason.trim(),
    startKm,
    notes: notes?.trim() || '',
    status: 'in_corso',
    mode: 'pulsanti',
    startRealTimestamp: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastModifiedBy: driver.uid,
    lastModifiedByName: driver.displayName,
  };

  try {
    await setDoc(doc(db, 'vehicleUsages', usageId), newUsage);

    await logAuditEvent({
      usageId,
      userId: driver.uid,
      userName: driver.displayName,
      userRole: driver.role,
      actionType: 'creazione',
      summary: `Inizio viaggio con pulsanti: ${vehicle.name} - Destinazione: ${destination}`,
      newValues: JSON.stringify(newUsage),
    });

    return newUsage;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `vehicleUsages/${usageId}`);
  }
}

/**
 * Conclude un viaggio in corso in MODALITÀ B (Pulsante TERMINA UTILIZZO)
 */
export async function finishTripWithButtons(
  params: {
    usage: VehicleUsage;
    user: AppUser;
    endKm: number;
    destination?: string;
    reason?: string;
    notes?: string;
  }
): Promise<VehicleUsage> {
  const { usage, user, endKm, destination, reason, notes } = params;

  if (endKm < usage.startKm) {
    throw new Error('Il chilometraggio finale non può essere inferiore a quello iniziale.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const endTimeStr = `${hours}:${minutes}`;
  const distance = Math.max(0, endKm - usage.startKm);

  const updatedUsage: VehicleUsage = {
    ...usage,
    status: 'completato',
    endTime: endTimeStr,
    endRealTimestamp: nowIso,
    endKm,
    distanceKm: distance,
    destination: destination ? destination.trim() : usage.destination,
    reason: reason ? reason.trim() : usage.reason,
    notes: notes !== undefined ? notes.trim() : usage.notes,
    firstSavedAt: usage.firstSavedAt || nowIso, // Fissa l'inizio della finestra dei 30 minuti
    updatedAt: nowIso,
    lastModifiedBy: user.uid,
    lastModifiedByName: user.displayName,
  };

  try {
    await setDoc(doc(db, 'vehicleUsages', usage.id), updatedUsage);

    // Aggiorna anche il chilometraggio corrente del veicolo
    await updateDoc(doc(db, 'vehicles', usage.vehicleId), {
      currentKm: endKm,
      updatedAt: nowIso,
    }).catch(err => console.warn('Aggiornamento km veicolo non critico:', err));

    await logAuditEvent({
      usageId: usage.id,
      userId: user.uid,
      userName: user.displayName,
      userRole: user.role,
      actionType: 'completamento',
      summary: `Viaggio concluso: ${usage.vehicleName} - Percorsi ${distance} km`,
      previousValues: JSON.stringify(usage),
      newValues: JSON.stringify(updatedUsage),
    });

    return updatedUsage;
  } catch (error) {
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
      await updateDoc(doc(db, 'vehicles', usage.vehicleId), {
        currentKm: endKm,
        updatedAt: nowIso,
      }).catch(err => console.warn('Aggiornamento km veicolo non critico:', err));
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
