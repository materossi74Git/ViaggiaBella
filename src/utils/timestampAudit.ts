import { Timestamp } from 'firebase/firestore';
import { formatTimestampForDisplay } from './timestamp';

export interface TimestampFieldAudit {
  fieldName: string;
  rawValue: unknown;
  detectedType: 'native_timestamp' | 'iso_string' | 'epoch_number' | 'serialized_timestamp' | 'null_or_missing' | 'unknown';
  isCompliantWithRules: boolean;
  issueSeverity: 'none' | 'warning' | 'critical';
  description: string;
  remediationAction: string;
}

export interface DocumentAuditResult {
  collectionName: 'vehicleUsages' | 'vehicles' | 'users';
  documentId: string;
  label: string; // Targa, nome autista, email
  status?: string;
  isCompliant: boolean;
  fields: TimestampFieldAudit[];
}

export interface AuditSummaryReport {
  timestamp: string;
  totalAnalyzed: number;
  totalCompliant: number;
  totalInconsistent: number;
  byCollection: {
    vehicleUsages: { total: number; compliant: number; isoString: number; missingFirstSavedAt: number };
    vehicles: { total: number; compliant: number; withIsoString: number };
    users: { total: number; compliant: number; isoLockUntil: number };
  };
  inconsistentDocs: DocumentAuditResult[];
  remediationPlan: string[];
}

/**
 * Classifica il tipo di dato di un campo temporale.
 */
export function classifyTimestampField(val: unknown): TimestampFieldAudit['detectedType'] {
  if (val === null || val === undefined) {
    return 'null_or_missing';
  }
  if (val instanceof Timestamp || (typeof (val as any).toMillis === 'function' && typeof (val as any).toDate === 'function')) {
    return 'native_timestamp';
  }
  if (typeof val === 'number') {
    return 'epoch_number';
  }
  if (typeof val === 'string') {
    if (val.includes('T') || val.includes('-') || !isNaN(Date.parse(val))) {
      return 'iso_string';
    }
  }
  if (typeof val === 'object') {
    const o = val as any;
    if ((o.seconds !== undefined || o._seconds !== undefined) && (o.nanoseconds !== undefined || o._nanoseconds !== undefined)) {
      return 'serialized_timestamp';
    }
  }
  return 'unknown';
}

/**
 * Esegue l'audit su un singolo documento di 'vehicleUsages'.
 */
export function auditUsageDocument(id: string, data: Record<string, any>): DocumentAuditResult {
  const fields: TimestampFieldAudit[] = [];
  const status = data.status || 'sconosciuto';
  const label = `${data.vehicleName || 'Mezzo'} (${data.vehiclePlate || 'N/D'}) - ${data.driverName || 'Autista'}`;

  // 1. Audit di firstSavedAt (il campo più critico per le Security Rules)
  const firstSavedAtType = classifyTimestampField(data.firstSavedAt);
  if (status === 'completato') {
    if (firstSavedAtType === 'native_timestamp' || firstSavedAtType === 'epoch_number') {
      fields.push({
        fieldName: 'firstSavedAt',
        rawValue: data.firstSavedAt,
        detectedType: firstSavedAtType,
        isCompliantWithRules: true,
        issueSeverity: 'none',
        description: 'Timestamp nativo Firestore. Pienamente conforme alla funzione isWithin30Minutes() delle Security Rules.',
        remediationAction: 'Nessuna azione richiesta.',
      });
    } else if (firstSavedAtType === 'iso_string') {
      fields.push({
        fieldName: 'firstSavedAt',
        rawValue: data.firstSavedAt,
        detectedType: 'iso_string',
        isCompliantWithRules: false,
        issueSeverity: 'critical',
        description: `Formato stringa ISO ("${data.firstSavedAt}"). Le Security Rules valutano "savedAt is timestamp || savedAt is number" e rigettano le modifiche da parte dell'operatore.`,
        remediationAction: 'Convertire da stringa ISO a Timestamp.fromDate(new Date(...)).',
      });
    } else if (firstSavedAtType === 'null_or_missing') {
      fields.push({
        fieldName: 'firstSavedAt',
        rawValue: null,
        detectedType: 'null_or_missing',
        isCompliantWithRules: false,
        issueSeverity: 'warning',
        description: 'Campo assente o nullo in viaggio completato. L\'operatore non può effettuare modifiche entro 30 minuti; solo l\'admin può aggiornare.',
        remediationAction: 'Popolare firstSavedAt con Timestamp.fromDate(new Date(createdAt || usageDate)).',
      });
    } else {
      fields.push({
        fieldName: 'firstSavedAt',
        rawValue: data.firstSavedAt,
        detectedType: firstSavedAtType,
        isCompliantWithRules: false,
        issueSeverity: 'critical',
        description: `Tipo inatteso (${firstSavedAtType}). Incompatibile con le Security Rules.`,
        remediationAction: 'Bonificare a Timestamp Firestore nativo.',
      });
    }
  } else {
    // Viaggio in corso: firstSavedAt è normalmente null finché non viene completato
    fields.push({
      fieldName: 'firstSavedAt',
      rawValue: data.firstSavedAt,
      detectedType: firstSavedAtType,
      isCompliantWithRules: true,
      issueSeverity: 'none',
      description: 'Viaggio attualmente in corso. firstSavedAt verrà generato come Timestamp nativo al completamento.',
      remediationAction: 'Nessuna azione richiesta.',
    });
  }

  // 2. Audit createdAt e updatedAt
  const createdAtType = classifyTimestampField(data.createdAt);
  const updatedAtType = classifyTimestampField(data.updatedAt);

  fields.push({
    fieldName: 'createdAt',
    rawValue: data.createdAt,
    detectedType: createdAtType,
    isCompliantWithRules: true,
    issueSeverity: 'none',
    description: `Data creazione: ${formatTimestampForDisplay(data.createdAt)} (${createdAtType}).`,
    remediationAction: 'Conservare come riferimento storico.',
  });

  fields.push({
    fieldName: 'updatedAt',
    rawValue: data.updatedAt,
    detectedType: updatedAtType,
    isCompliantWithRules: true,
    issueSeverity: 'none',
    description: `Data ultimo aggiornamento: ${formatTimestampForDisplay(data.updatedAt)} (${updatedAtType}).`,
    remediationAction: 'Conservare come riferimento storico.',
  });

  const isCompliant = fields.every(f => f.issueSeverity === 'none');

  return {
    collectionName: 'vehicleUsages',
    documentId: id,
    label,
    status,
    isCompliant,
    fields,
  };
}

/**
 * Esegue l'audit su un singolo documento di 'vehicles'.
 */
export function auditVehicleDocument(id: string, data: Record<string, any>): DocumentAuditResult {
  const fields: TimestampFieldAudit[] = [];
  const label = `${data.name || 'Mezzo'} (${data.plate || 'Senza targa'})`;

  // activeTripStartTime
  if (data.activeTripStartTime) {
    const tripStartTimeType = classifyTimestampField(data.activeTripStartTime);
    fields.push({
      fieldName: 'activeTripStartTime',
      rawValue: data.activeTripStartTime,
      detectedType: tripStartTimeType,
      isCompliantWithRules: true,
      issueSeverity: 'none',
      description: `Inizio viaggio attivo: ${data.activeTripStartTime} (${tripStartTimeType}).`,
      remediationAction: 'Allineare a formato coerente al rilascio del mezzo.',
    });
  }

  // createdAt / updatedAt
  const updatedType = classifyTimestampField(data.updatedAt);
  fields.push({
    fieldName: 'updatedAt',
    rawValue: data.updatedAt,
    detectedType: updatedType,
    isCompliantWithRules: true,
    issueSeverity: 'none',
    description: `Ultimo aggiornamento veicolo: ${data.updatedAt || 'N/D'} (${updatedType}).`,
    remediationAction: 'Nessuna azione richiesta.',
  });

  const isCompliant = fields.every(f => f.issueSeverity === 'none');

  return {
    collectionName: 'vehicles',
    documentId: id,
    label,
    status: data.isOccupied ? 'occupato' : 'libero',
    isCompliant,
    fields,
  };
}

/**
 * Esegue l'audit su un singolo documento di 'users'.
 */
export function auditUserDocument(id: string, data: Record<string, any>): DocumentAuditResult {
  const fields: TimestampFieldAudit[] = [];
  const label = `${data.displayName || 'Utente'} (${data.email || 'No email'})`;

  if (data.lockUntil) {
    const lockType = classifyTimestampField(data.lockUntil);
    if (lockType === 'native_timestamp' || lockType === 'epoch_number') {
      fields.push({
        fieldName: 'lockUntil',
        rawValue: data.lockUntil,
        detectedType: lockType,
        isCompliantWithRules: true,
        issueSeverity: 'none',
        description: 'Lockout PIN nativo. Conforme a isLockoutActive() nelle Security Rules.',
        remediationAction: 'Nessuna azione richiesta.',
      });
    } else {
      fields.push({
        fieldName: 'lockUntil',
        rawValue: data.lockUntil,
        detectedType: lockType,
        isCompliantWithRules: false,
        issueSeverity: 'warning',
        description: `lockUntil in formato "${lockType}". Nelle Security Rules isLockoutActive() richiede timestamp nativo o epoch ms.`,
        remediationAction: 'Convertire in Timestamp.fromMillis(...) o azzerare se scaduto.',
      });
    }
  }

  const isCompliant = fields.every(f => f.issueSeverity === 'none');

  return {
    collectionName: 'users',
    documentId: id,
    label,
    status: data.role || 'operatore',
    isCompliant,
    fields,
  };
}

/**
 * Genera il sommario analitico a partire dai risultati dell'audit.
 */
export function generateAuditReport(results: DocumentAuditResult[]): AuditSummaryReport {
  const inconsistent = results.filter(r => !r.isCompliant);
  const usages = results.filter(r => r.collectionName === 'vehicleUsages');
  const vehicles = results.filter(r => r.collectionName === 'vehicles');
  const users = results.filter(r => r.collectionName === 'users');

  const usageIso = usages.filter(u => u.fields.some(f => f.fieldName === 'firstSavedAt' && f.detectedType === 'iso_string')).length;
  const usageMissing = usages.filter(u => u.fields.some(f => f.fieldName === 'firstSavedAt' && f.detectedType === 'null_or_missing' && u.status === 'completato')).length;
  const userIsoLock = users.filter(u => u.fields.some(f => f.fieldName === 'lockUntil' && !f.isCompliantWithRules)).length;

  const remediationPlan: string[] = [];

  if (usageIso > 0) {
    remediationPlan.push(
      `BONIFICA 1: Trovati ${usageIso} viaggi completati con 'firstSavedAt' in stringa ISO. Eseguire script batch amministrativo che converta il valore in Timestamp.fromDate(new Date(doc.firstSavedAt)). Questo ripristina la leggibilità lato Security Rules.`
    );
  }

  if (usageMissing > 0) {
    remediationPlan.push(
      `BONIFICA 2: Trovati ${usageMissing} viaggi storici con status 'completato' privi di 'firstSavedAt'. Popolare con Timestamp.fromDate(new Date(doc.createdAt || doc.usageDate)).`
    );
  }

  if (userIsoLock > 0) {
    remediationPlan.push(
      `BONIFICA 3: Trovati ${userIsoLock} utenti con 'lockUntil' non nativo. Se la data di blocco è passata, azzerare a null; se futura, convertire in Timestamp.fromMillis().`
    );
  }

  if (remediationPlan.length === 0) {
    remediationPlan.push('Tutti i documenti analizzati risultano conformi ai vincoli di Timestamp nativo delle Security Rules. Nessuna bonifica necessaria.');
  }

  return {
    timestamp: new Date().toISOString(),
    totalAnalyzed: results.length,
    totalCompliant: results.length - inconsistent.length,
    totalInconsistent: inconsistent.length,
    byCollection: {
      vehicleUsages: {
        total: usages.length,
        compliant: usages.length - (usageIso + usageMissing),
        isoString: usageIso,
        missingFirstSavedAt: usageMissing,
      },
      vehicles: {
        total: vehicles.length,
        compliant: vehicles.length,
        withIsoString: 0,
      },
      users: {
        total: users.length,
        compliant: users.length - userIsoLock,
        isoLockUntil: userIsoLock,
      },
    },
    inconsistentDocs: inconsistent,
    remediationPlan,
  };
}
