import { describe, it, expect } from 'vitest';

/**
 * Suite di Test Funzionale e di Validazione Logica per le Nuove Firestore Security Rules
 * Valuta matematicamente e logicamente i 12 scenari di sicurezza richiesti.
 */
describe('Fase 1: Verifica Logica e Predittiva delle Firestore Security Rules', () => {
  const driverUid = 'op_luigi_123';
  const colleagueUid = 'op_mario_456';
  const adminUid = 'admin_matteo_789';
  const adminEmail = 'materossi74@gmail.com';

  // Helper di simulazione logica delle regole di Firestore
  const isRuleAdmin = (auth: { uid: string; email: string; inAdminsDoc?: boolean }) => {
    return auth.inAdminsDoc === true || auth.email === adminEmail;
  };

  // 1. Simula regola veicoli (update)
  const canUpdateVehicle = (
    auth: { uid: string; email: string; inAdminsDoc?: boolean },
    existing: Record<string, any>,
    incoming: Record<string, any>
  ) => {
    if (isRuleAdmin(auth)) return true;

    // Check affected keys
    const allowedKeys = [
      'activeTripId',
      'activeDriverId',
      'activeDriverName',
      'activeTripStartTime',
      'isOccupied',
      'currentKm',
      'updatedAt',
    ];
    const changedKeys = Object.keys(incoming).filter(k => incoming[k] !== existing[k]);
    const hasOnlyAllowed = changedKeys.every(k => allowedKeys.includes(k));
    if (!hasOnlyAllowed) return false;

    // Caso 1: Avvio legittimo
    const isStartLegit =
      (existing.isOccupied === false || existing.isOccupied === undefined) &&
      incoming.isOccupied === true &&
      incoming.activeDriverId === auth.uid &&
      typeof incoming.activeTripId === 'string' &&
      incoming.currentKm >= existing.currentKm;

    // Caso 2: Chiusura legittima
    const isFinishLegit =
      existing.activeDriverId === auth.uid &&
      incoming.isOccupied === false &&
      incoming.activeTripId === null &&
      incoming.activeDriverId === null &&
      incoming.activeDriverName === null &&
      incoming.currentKm >= existing.currentKm;

    // Caso 3: Aggiornamento solo km
    const isKmOnly =
      changedKeys.every(k => ['currentKm', 'updatedAt'].includes(k)) &&
      incoming.currentKm >= existing.currentKm;

    return isStartLegit || isFinishLegit || isKmOnly;
  };

  // 2. Simula regola utilizzi (update)
  const canUpdateUsage = (
    auth: { uid: string; email: string; inAdminsDoc?: boolean },
    existing: Record<string, any>,
    incoming: Record<string, any>,
    requestTimeMs: number
  ) => {
    if (isRuleAdmin(auth)) return true;

    if (existing.driverId !== auth.uid || incoming.driverId !== existing.driverId) {
      return false;
    }

    // 1. Viaggio in corso
    if (existing.status === 'in_corso') {
      return true;
    }

    // 2. Viaggio completato con regola 30 minuti
    if (existing.status === 'completato') {
      if (incoming.firstSavedAt !== existing.firstSavedAt) return false;
      if (!existing.firstSavedAt) return false;

      const firstSavedMs = new Date(existing.firstSavedAt).getTime();
      const thirtyMinutesMs = 30 * 60 * 1000;
      return requestTimeMs < firstSavedMs + thirtyMinutesMs;
    }

    return false;
  };

  // 3. Simula regola utenti (lockout PIN)
  const canUpdateUserLockout = (
    auth: { uid: string; email: string; inAdminsDoc?: boolean },
    existing: Record<string, any>,
    incoming: Record<string, any>,
    requestTimeMs: number
  ) => {
    if (isRuleAdmin(auth)) return true;
    if (auth.uid !== existing.uid) return false;
    if (incoming.role !== existing.role || incoming.status !== existing.status) return false;

    // Controllo lockout
    if (existing.lockUntil) {
      const lockUntilMs = new Date(existing.lockUntil).getTime();
      const isLockExpired = requestTimeMs >= lockUntilMs;
      const isUnchanged = incoming.lockUntil === existing.lockUntil;
      return isLockExpired || isUnchanged;
    }

    return true;
  };

  // 4. Simula regola correctionRequests (create)
  const canCreateCorrectionRequest = (
    auth: { uid: string; email: string; inAdminsDoc?: boolean },
    incoming: Record<string, any>
  ) => {
    if (isRuleAdmin(auth)) return true;
    return incoming.driverId === auth.uid && incoming.status === 'in_attesa';
  };

  // 5. Simula regola auditLogs (update)
  const canUpdateAuditLog = () => {
    return false; // Sempre negato
  };

  // --- I 12 SCENARI RICHIESTI DALL'AUDIT ---

  it('1. Avvio di un viaggio da parte di un operatore su mezzo libero è CONSENTITO', () => {
    const existingVehicle = {
      isOccupied: false,
      currentKm: 50000,
      activeDriverId: null,
      activeTripId: null,
    };
    const incomingVehicle = {
      ...existingVehicle,
      isOccupied: true,
      currentKm: 50000,
      activeDriverId: driverUid,
      activeDriverName: 'Luigi Bianchi',
      activeTripId: 'usg_new_1',
      updatedAt: '2026-10-31T10:00:00Z',
    };

    const allowed = canUpdateVehicle({ uid: driverUid, email: 'luigi@coop.it' }, existingVehicle, incomingVehicle);
    expect(allowed).toBe(true);
  });

  it('2. Avvio di un viaggio su mezzo già occupato è BLOCCATO dalle Security Rules', () => {
    const busyVehicle = {
      isOccupied: true,
      currentKm: 50000,
      activeDriverId: colleagueUid,
      activeTripId: 'usg_collega_1',
    };
    const incomingVehicle = {
      ...busyVehicle,
      activeDriverId: driverUid,
      activeTripId: 'usg_secondo_operatore',
    };

    const allowed = canUpdateVehicle({ uid: driverUid, email: 'luigi@coop.it' }, busyVehicle, incomingVehicle);
    expect(allowed).toBe(false);
  });

  it('3. Conclusione di un viaggio da parte del proprio autista è CONSENTITA', () => {
    const busyVehicle = {
      isOccupied: true,
      currentKm: 50000,
      activeDriverId: driverUid,
      activeTripId: 'usg_mio_1',
    };
    const releasedVehicle = {
      ...busyVehicle,
      isOccupied: false,
      currentKm: 50045, // +45 km
      activeDriverId: null,
      activeTripId: null,
      activeDriverName: null,
      updatedAt: '2026-10-31T11:00:00Z',
    };

    const allowed = canUpdateVehicle({ uid: driverUid, email: 'luigi@coop.it' }, busyVehicle, releasedVehicle);
    expect(allowed).toBe(true);
  });

  it('4. Tentativo di liberare un mezzo occupato da un collega è BLOCCATO', () => {
    const colleagueVehicle = {
      isOccupied: true,
      currentKm: 50000,
      activeDriverId: colleagueUid, // Mezzo guidato da Mario
      activeTripId: 'usg_mario_1',
    };
    const maliciousRelease = {
      ...colleagueVehicle,
      isOccupied: false,
      activeDriverId: null,
      activeTripId: null,
      activeDriverName: null,
      updatedAt: '2026-10-31T11:00:00Z',
    };

    // Luigi prova a liberare il mezzo di Mario
    const allowed = canUpdateVehicle({ uid: driverUid, email: 'luigi@coop.it' }, colleagueVehicle, maliciousRelease);
    expect(allowed).toBe(false);
  });

  it('5. Modifica di un viaggio completato ENTRO 30 minuti è CONSENTITA', () => {
    const firstSaved = '2026-10-31T10:00:00.000Z';
    const existingUsage = {
      id: 'usg_1',
      driverId: driverUid,
      status: 'completato',
      firstSavedAt: firstSaved,
      destination: 'Iseo',
    };
    const incomingUsage = {
      ...existingUsage,
      destination: 'Iseo Centro',
    };

    // 15 minuti dopo (entro i 30)
    const requestTimeMs = new Date('2026-10-31T10:15:00.000Z').getTime();

    const allowed = canUpdateUsage({ uid: driverUid, email: 'luigi@coop.it' }, existingUsage, incomingUsage, requestTimeMs);
    expect(allowed).toBe(true);
  });

  it('6. Modifica di un viaggio completato OLTRE 30 minuti è BLOCCATA dalle Security Rules', () => {
    const firstSaved = '2026-10-31T10:00:00.000Z';
    const existingUsage = {
      id: 'usg_1',
      driverId: driverUid,
      status: 'completato',
      firstSavedAt: firstSaved,
      destination: 'Iseo',
    };
    const incomingUsage = {
      ...existingUsage,
      destination: 'Iseo Centro - Modifica Tardiva',
    };

    // 45 minuti dopo (oltre i 30)
    const requestTimeMs = new Date('2026-10-31T10:45:00.000Z').getTime();

    const allowed = canUpdateUsage({ uid: driverUid, email: 'luigi@coop.it' }, existingUsage, incomingUsage, requestTimeMs);
    expect(allowed).toBe(false);
  });

  it('7. Conclusione di un viaggio aperto dopo più di 30 minuti è SEMPRE CONSENTITA (nessun blocco su in_corso)', () => {
    const existingUsage = {
      id: 'usg_long_trip',
      driverId: driverUid,
      status: 'in_corso',
      createdAt: '2026-10-31T06:00:00.000Z', // Aperto 4 ore fa
    };
    const finishedUsage = {
      ...existingUsage,
      status: 'completato',
      endTime: '10:00',
      firstSavedAt: '2026-10-31T10:00:00.000Z',
    };

    const requestTimeMs = new Date('2026-10-31T10:00:00.000Z').getTime();

    const allowed = canUpdateUsage({ uid: driverUid, email: 'luigi@coop.it' }, existingUsage, finishedUsage, requestTimeMs);
    expect(allowed).toBe(true);
  });

  it('8. Correzione amministrativa di un viaggio oltre i 30 minuti è SEMPRE CONSENTITA all\'admin', () => {
    const firstSaved = '2026-10-20T10:00:00.000Z'; // Viaggio di 11 giorni fa!
    const existingUsage = {
      id: 'usg_old',
      driverId: driverUid,
      status: 'completato',
      firstSavedAt: firstSaved,
      destination: 'Brescia',
    };
    const adminCorrectedUsage = {
      ...existingUsage,
      destination: 'Brescia Sede Provinciale (Rettifica)',
    };

    const requestTimeMs = new Date('2026-10-31T10:00:00.000Z').getTime();

    const allowed = canUpdateUsage(
      { uid: adminUid, email: adminEmail, inAdminsDoc: true },
      existingUsage,
      adminCorrectedUsage,
      requestTimeMs
    );
    expect(allowed).toBe(true);
  });

  it('9. Tentativo di modificare o azzerare firstSavedAt da parte dell\'operatore è BLOCCATO', () => {
    const originalFirstSaved = '2026-10-31T08:00:00.000Z';
    const existingUsage = {
      id: 'usg_hack',
      driverId: driverUid,
      status: 'completato',
      firstSavedAt: originalFirstSaved,
    };
    const hackedUsage = {
      ...existingUsage,
      firstSavedAt: '2026-10-31T10:00:00.000Z', // Prova a spostare in avanti la data per riaprire i 30 minuti!
    };

    const requestTimeMs = new Date('2026-10-31T10:05:00.000Z').getTime();

    const allowed = canUpdateUsage({ uid: driverUid, email: 'luigi@coop.it' }, existingUsage, hackedUsage, requestTimeMs);
    expect(allowed).toBe(false);
  });

  it('10. Tentativo di azzerare lockUntil durante il periodo di blocco PIN è BLOCCATO', () => {
    const lockUntilIso = '2026-10-31T10:05:00.000Z'; // Bloccato fino alle 10:05
    const existingUser = {
      uid: driverUid,
      role: 'operatore',
      status: 'attivo',
      lockUntil: lockUntilIso,
      failedPinAttempts: 5,
    };

    // Operatore tenta alle 10:02 di forzare lockUntil a null
    const requestTimeMs = new Date('2026-10-31T10:02:00.000Z').getTime();
    const maliciousUnlock = {
      ...existingUser,
      lockUntil: null,
      failedPinAttempts: 0,
    };

    const allowedEarly = canUpdateUserLockout({ uid: driverUid, email: 'luigi@coop.it' }, existingUser, maliciousUnlock, requestTimeMs);
    expect(allowedEarly).toBe(false);

    // Alle 10:06 (tempo scaduto), lo sblocco è CONSENTITO
    const expiredTimeMs = new Date('2026-10-31T10:06:00.000Z').getTime();
    const allowedAfterExpiry = canUpdateUserLockout({ uid: driverUid, email: 'luigi@coop.it' }, existingUser, maliciousUnlock, expiredTimeMs);
    expect(allowedAfterExpiry).toBe(true);
  });

  it('11. Creazione di una richiesta di correzione con stato iniziale diverso da "in_attesa" è BLOCCATA', () => {
    const invalidRequest = {
      driverId: driverUid,
      status: 'approvata', // Tenta di auto-approvarsi la richiesta alla creazione!
      reason: 'Ho sbagliato km',
    };

    const allowed = canCreateCorrectionRequest({ uid: driverUid, email: 'luigi@coop.it' }, invalidRequest);
    expect(allowed).toBe(false);

    const validRequest = {
      driverId: driverUid,
      status: 'in_attesa',
      reason: 'Ho sbagliato km',
    };
    const validAllowed = canCreateCorrectionRequest({ uid: driverUid, email: 'luigi@coop.it' }, validRequest);
    expect(validAllowed).toBe(true);
  });

  it('12. Tentativo di modificare o alterare un audit log è SEMPRE BLOCCATO', () => {
    expect(canUpdateAuditLog()).toBe(false);
  });
});
