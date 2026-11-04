import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp } from 'firebase/firestore';
import {
  auditUsageDocument,
  auditVehicleDocument,
  auditUserDocument,
  generateAuditReport,
  DocumentAuditResult,
} from '../utils/timestampAudit';

describe('Audit di sola lettura Consistenza Timestamp', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'viaggiabella-audit-test',
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

  it('Riconosce correttamente un viaggio con Timestamp nativo come conforme', () => {
    const usageDoc = {
      id: 'usg_native_1',
      vehicleId: 'veh_1',
      vehicleName: 'Doblò Solidarietà',
      vehiclePlate: 'BS 123 AB',
      driverId: 'driver_1',
      driverName: 'Mario Rossi',
      usageDate: '2026-10-31',
      status: 'completato',
      firstSavedAt: Timestamp.now(),
      createdAt: '2026-10-31T14:00:00.000Z',
      updatedAt: '2026-10-31T14:15:00.000Z',
    };

    const result = auditUsageDocument('usg_native_1', usageDoc);
    expect(result.isCompliant).toBe(true);
    const firstSavedField = result.fields.find(f => f.fieldName === 'firstSavedAt');
    expect(firstSavedField?.detectedType).toBe('native_timestamp');
    expect(firstSavedField?.isCompliantWithRules).toBe(true);
    expect(firstSavedField?.issueSeverity).toBe('none');
  });

  it('Identifica un viaggio storico con firstSavedAt in stringa ISO come non conforme e critico', () => {
    const usageDoc = {
      id: 'usg_iso_historic',
      vehicleId: 'veh_2',
      vehicleName: 'Ducato Pulmino',
      vehiclePlate: 'BS 999 ZZ',
      driverId: 'driver_2',
      driverName: 'Luca Bianchi',
      usageDate: '2026-10-25',
      status: 'completato',
      firstSavedAt: '2026-10-25T09:30:00.000Z', // Stringa ISO non compatibile CEL
      createdAt: '2026-10-25T09:00:00.000Z',
      updatedAt: '2026-10-25T09:30:00.000Z',
    };

    const result = auditUsageDocument('usg_iso_historic', usageDoc);
    expect(result.isCompliant).toBe(false);
    const firstSavedField = result.fields.find(f => f.fieldName === 'firstSavedAt');
    expect(firstSavedField?.detectedType).toBe('iso_string');
    expect(firstSavedField?.isCompliantWithRules).toBe(false);
    expect(firstSavedField?.issueSeverity).toBe('critical');
    expect(firstSavedField?.remediationAction).toContain('Convertire da stringa ISO a Timestamp');
  });

  it('Identifica un viaggio storico completato senza firstSavedAt (null o assente)', () => {
    const usageDoc = {
      id: 'usg_missing_timestamp',
      vehicleId: 'veh_3',
      vehicleName: 'Panda Servizi',
      vehiclePlate: 'BS 456 CD',
      driverId: 'driver_1',
      driverName: 'Mario Rossi',
      usageDate: '2026-10-20',
      status: 'completato',
      firstSavedAt: null,
      createdAt: '2026-10-20T10:00:00.000Z',
      updatedAt: '2026-10-20T10:45:00.000Z',
    };

    const result = auditUsageDocument('usg_missing_timestamp', usageDoc);
    expect(result.isCompliant).toBe(false);
    const firstSavedField = result.fields.find(f => f.fieldName === 'firstSavedAt');
    expect(firstSavedField?.detectedType).toBe('null_or_missing');
    expect(firstSavedField?.isCompliantWithRules).toBe(false);
    expect(firstSavedField?.issueSeverity).toBe('warning');
    expect(firstSavedField?.remediationAction).toContain('Popolare firstSavedAt');
  });

  it('Non segnala anomalie per viaggi in_corso (firstSavedAt viene valorizzato alla conclusione)', () => {
    const ongoingTrip = {
      id: 'usg_ongoing_now',
      vehicleId: 'veh_1',
      vehicleName: 'Doblò Solidarietà',
      driverId: 'driver_1',
      driverName: 'Mario Rossi',
      status: 'in_corso',
      firstSavedAt: null,
      createdAt: '2026-10-31T15:00:00.000Z',
    };

    const result = auditUsageDocument('usg_ongoing_now', ongoingTrip);
    expect(result.isCompliant).toBe(true);
  });

  it('Verifica la consistenza dei veicoli della flotta', () => {
    const vehicleDoc = {
      id: 'veh_doblo_1',
      name: 'Doblò Solidarietà',
      plate: 'BS 123 AB',
      currentKm: 124500,
      isOccupied: false,
      activeTripStartTime: null,
      updatedAt: '2026-10-31T12:00:00.000Z',
    };

    const result = auditVehicleDocument('veh_doblo_1', vehicleDoc);
    expect(result.isCompliant).toBe(true);
  });

  it('Identifica un utente con lockUntil salvato come stringa ISO', () => {
    const userDoc = {
      uid: 'user_locked_iso',
      email: 'operatore@clarabella.it',
      displayName: 'Operatore Test',
      role: 'operatore',
      failedPinAttempts: 5,
      lockUntil: '2026-10-31T15:30:00.000Z', // stringa ISO
    };

    const result = auditUserDocument('user_locked_iso', userDoc);
    expect(result.isCompliant).toBe(false);
    const lockField = result.fields.find(f => f.fieldName === 'lockUntil');
    expect(lockField?.detectedType).toBe('iso_string');
    expect(lockField?.isCompliantWithRules).toBe(false);
  });

  it('Genera un piano di bonifica strutturato e chiaro', () => {
    const sampleResults: DocumentAuditResult[] = [
      auditUsageDocument('usg_1', {
        id: 'usg_1',
        vehicleName: 'Mezzo 1',
        status: 'completato',
        firstSavedAt: '2026-10-20T10:00:00.000Z', // ISO
      }),
      auditUsageDocument('usg_2', {
        id: 'usg_2',
        vehicleName: 'Mezzo 2',
        status: 'completato',
        firstSavedAt: null, // mancante
      }),
      auditUserDocument('usr_1', {
        displayName: 'Operatore 1',
        lockUntil: '2026-10-31T15:00:00.000Z', // ISO
      }),
      auditUsageDocument('usg_3', {
        id: 'usg_3',
        vehicleName: 'Mezzo 3',
        status: 'completato',
        firstSavedAt: Timestamp.now(), // conforme
      }),
    ];

    const report = generateAuditReport(sampleResults);
    expect(report.totalAnalyzed).toBe(4);
    expect(report.totalCompliant).toBe(1);
    expect(report.totalInconsistent).toBe(3);
    expect(report.byCollection.vehicleUsages.isoString).toBe(1);
    expect(report.byCollection.vehicleUsages.missingFirstSavedAt).toBe(1);
    expect(report.byCollection.users.isoLockUntil).toBe(1);
    expect(report.remediationPlan.length).toBe(3);
    expect(report.remediationPlan[0]).toContain('BONIFICA 1');
    expect(report.remediationPlan[1]).toContain('BONIFICA 2');
    expect(report.remediationPlan[2]).toContain('BONIFICA 3');
  });
});
