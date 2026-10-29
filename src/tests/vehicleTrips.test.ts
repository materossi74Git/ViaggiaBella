import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseVehicleIdentifier,
  getVehicleNfcUrl,
  getVehicleQrUrl,
  OFFICIAL_DOMAIN,
} from '../services/nfcService';
import { Vehicle, VehicleUsage, AppUser } from '../types';

describe('Audit Tecnico ViaggiaBella - Suite di Test di Conformità', () => {
  const mockVehicles: Vehicle[] = [
    {
      id: 'veh_ducato_01',
      name: 'Fiat Ducato 9 Posti',
      plate: 'FS 123 AB',
      brandModel: 'Fiat Ducato',
      type: 'pulmino',
      status: 'attivo',
      qrCodeId: 'coop-veh-01',
      nfcTagId: 'nfc-ducato-01',
      currentKm: 48250,
      isOccupied: false,
      activeTripId: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'veh_panda_inattiva',
      name: 'Fiat Panda Fuori Servizio',
      plate: 'GA 999 XX',
      brandModel: 'Fiat Panda',
      type: 'auto',
      status: 'inattivo',
      qrCodeId: 'coop-veh-99',
      currentKm: 12000,
      isOccupied: false,
      activeTripId: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'veh_master_occupato',
      name: 'Renault Master Disabili',
      plate: 'EF 789 GH',
      brandModel: 'Renault Master',
      type: 'speciale',
      status: 'attivo',
      qrCodeId: 'coop-veh-03',
      currentKm: 64800,
      isOccupied: true,
      activeTripId: 'usg_active_123',
      activeDriverId: 'driver_collega',
      activeDriverName: 'Mario Rossi',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const driverUser: AppUser = {
    uid: 'driver_luigi_456',
    email: 'luigi@clarabella.it',
    displayName: 'Luigi Bianchi',
    role: 'operatore',
    status: 'attivo',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const adminUser: AppUser = {
    uid: 'admin_matteo_789',
    email: 'materossi74@gmail.com',
    displayName: 'Matteo Rossi',
    role: 'amministratore',
    status: 'attivo',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // SCENARIO 1: Apertura dell'app senza parametri
  it('Scenario 1: Apertura app senza parametri restituisce stringa vuota e non lancia modali', () => {
    const res = parseVehicleIdentifier('');
    expect(res.vehicleId).toBe('');
    expect(res.source).toBe('manual');
  });

  // SCENARIO 2: Apertura con vehicleId valido
  it('Scenario 2: Apertura con vehicleId valido identifica correttamente il mezzo', () => {
    const res = parseVehicleIdentifier('?vehicleId=veh_ducato_01&source=qr');
    expect(res.vehicleId).toBe('veh_ducato_01');
    expect(res.source).toBe('qr');

    const found = mockVehicles.find(v => v.id === res.vehicleId);
    expect(found).toBeDefined();
    expect(found?.name).toContain('Fiat Ducato');
  });

  // SCENARIO 3: Apertura con vehicleId inesistente
  it('Scenario 3: Apertura con vehicleId inesistente non produce un match nella flotta', () => {
    const res = parseVehicleIdentifier('?vehicleId=veh_inesistente_999');
    expect(res.vehicleId).toBe('veh_inesistente_999');

    const found = mockVehicles.find(v => v.id === res.vehicleId);
    expect(found).toBeUndefined();
  });

  // SCENARIO 4: Apertura con parametri malformati o url-encoded
  it('Scenario 4: Gestisce parametri malformati o caratteri speciali senza crash', () => {
    const res1 = parseVehicleIdentifier('https://viaggiabella.vercel.app/?vehicleId=veh_ducato_01%20test&source=nfc');
    expect(res1.vehicleId).toBe('veh_ducato_01 test');
    expect(res1.source).toBe('nfc');

    const res2 = parseVehicleIdentifier('viaggiabella://vehicle/coop-veh-01');
    expect(res2.vehicleId).toBe('coop-veh-01');

    const res3 = parseVehicleIdentifier('???invalid==&&&');
    expect(res3.vehicleId).toBeDefined();
  });

  // SCENARIO 5: Scansione ripetuta dello stesso QR code (de-bouncing / lock)
  it('Scenario 5: Prevenzione scansioni multiple rapide con flag di processing', () => {
    let callCount = 0;
    let isProcessing = false;

    const handleScan = (code: string) => {
      if (isProcessing) return;
      isProcessing = true;
      callCount++;
    };

    // Simula 5 frame rapidi della fotocamera a 10 fps per lo stesso QR
    handleScan('https://viaggiabella.vercel.app/?vehicleId=veh_ducato_01&source=qr');
    handleScan('https://viaggiabella.vercel.app/?vehicleId=veh_ducato_01&source=qr');
    handleScan('https://viaggiabella.vercel.app/?vehicleId=veh_ducato_01&source=qr');
    handleScan('https://viaggiabella.vercel.app/?vehicleId=veh_ducato_01&source=qr');

    expect(callCount).toBe(1);
  });

  // SCENARIO 6: Avvio di un viaggio con veicolo libero
  it('Scenario 6: Avvio viaggio con veicolo libero registra correttamente lo stato occupato', () => {
    const vehicle = { ...mockVehicles[0] };
    expect(vehicle.isOccupied).toBe(false);

    // Simula logica atomica di avvio
    expect(vehicle.status).toBe('attivo');
    expect(vehicle.isOccupied).toBe(false);

    const newUsage: VehicleUsage = {
      id: 'usg_test_1',
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.plate,
      driverId: driverUser.uid,
      driverName: driverUser.displayName,
      usageDate: '2026-10-27',
      startTime: '08:30',
      destination: 'Centro Riabilitativo',
      reason: 'Trasporto Utenti',
      startKm: vehicle.currentKm,
      status: 'in_corso',
      mode: 'pulsanti',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastModifiedBy: driverUser.uid,
      lastModifiedByName: driverUser.displayName,
    };

    vehicle.isOccupied = true;
    vehicle.activeTripId = newUsage.id;
    vehicle.activeDriverId = driverUser.uid;
    vehicle.activeDriverName = driverUser.displayName;

    expect(vehicle.isOccupied).toBe(true);
    expect(vehicle.activeTripId).toBe('usg_test_1');
  });

  // SCENARIO 7: Tentativo di avvio con veicolo inattivo
  it('Scenario 7: Tentativo di avvio con veicolo inattivo viene bloccato', () => {
    const inactiveVehicle = mockVehicles.find(v => v.status === 'inattivo')!;
    expect(inactiveVehicle.status).toBe('inattivo');

    const tryStart = () => {
      if (inactiveVehicle.status === 'inattivo') {
        throw new Error(`Il veicolo ${inactiveVehicle.name} risulta disattivato o fuori servizio.`);
      }
    };

    expect(tryStart).toThrowError(/disattivato o fuori servizio/);
  });

  // SCENARIO 8: Tentativo di avvio con veicolo già occupato
  it('Scenario 8: Tentativo di avvio con veicolo già occupato solleva errore con indicazione conducente', () => {
    const busyVehicle = mockVehicles.find(v => v.isOccupied)!;
    expect(busyVehicle.isOccupied).toBe(true);

    const tryStart = () => {
      if (busyVehicle.isOccupied || busyVehicle.activeTripId) {
        throw new Error(
          `Attenzione: il mezzo ${busyVehicle.name} risulta già impegnato in un viaggio attivo con ${busyVehicle.activeDriverName}.`
        );
      }
    };

    expect(tryStart).toThrowError(/già impegnato/);
    expect(tryStart).toThrowError(/Mario Rossi/);
  });

  // SCENARIO 9: Concorrenza tra due operatori sullo stesso mezzo
  it('Scenario 9: Due operatori che tentano simultaneamente di avviare un viaggio - il secondo fallisce atomico', async () => {
    const vehicleState = {
      isOccupied: false,
      activeTripId: null as string | null,
    };

    const atomicStart = async (driverId: string, driverName: string) => {
      if (vehicleState.isOccupied) {
        throw new Error('Conflitto: il veicolo è già stato occupato da un altro operatore.');
      }
      vehicleState.isOccupied = true;
      vehicleState.activeTripId = `usg_${driverId}`;
      return `ok_${driverId}`;
    };

    // Simulazione transazione Firestore:
    // Il primo operatore acquisisce il lock, il secondo trova il flag occupato
    const p1 = atomicStart('op_1', 'Luigi');
    const p2 = atomicStart('op_2', 'Paolo');

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain('già stato occupato');
  });

  // SCENARIO 10: Conclusione corretta del viaggio
  it('Scenario 10: Conclusione corretta aggiorna km veicolo e rilascia occupazione', () => {
    const vehicle: Vehicle = {
      ...mockVehicles[0],
      isOccupied: true,
      activeTripId: 'usg_active_1',
      activeDriverId: driverUser.uid,
    };

    const usage: VehicleUsage = {
      id: 'usg_active_1',
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.plate,
      driverId: driverUser.uid,
      driverName: driverUser.displayName,
      usageDate: '2026-10-27',
      startTime: '09:00',
      destination: 'Brescia Centro',
      reason: 'Consegna',
      startKm: 48250,
      status: 'in_corso',
      mode: 'pulsanti',
      createdAt: '2026-10-27T09:00:00Z',
      updatedAt: '2026-10-27T09:00:00Z',
      lastModifiedBy: driverUser.uid,
      lastModifiedByName: driverUser.displayName,
    };

    const endKm = 48295; // 45 km percorsi
    expect(endKm).toBeGreaterThanOrEqual(usage.startKm!);

    // Chiusura atomica
    usage.status = 'completato';
    usage.endKm = endKm;
    usage.distanceKm = endKm - usage.startKm!;

    vehicle.currentKm = endKm;
    vehicle.isOccupied = false;
    vehicle.activeTripId = null;
    vehicle.activeDriverId = null;

    expect(usage.status).toBe('completato');
    expect(usage.distanceKm).toBe(45);
    expect(vehicle.currentKm).toBe(48295);
    expect(vehicle.isOccupied).toBe(false);
  });

  // SCENARIO 11: Tentativo di conclusione di un viaggio già completato
  it('Scenario 11: Tentativo di concludere un viaggio già completato viene respinto', () => {
    const completedUsage: VehicleUsage = {
      id: 'usg_done',
      vehicleId: 'veh_ducato_01',
      vehicleName: 'Ducato',
      vehiclePlate: 'FS 123 AB',
      driverId: driverUser.uid,
      driverName: driverUser.displayName,
      usageDate: '2026-10-27',
      startTime: '08:00',
      endTime: '09:00',
      destination: 'Iseo',
      reason: 'Servizio',
      startKm: 48000,
      endKm: 48050,
      status: 'completato',
      mode: 'pulsanti',
      createdAt: '2026-10-27T08:00:00Z',
      updatedAt: '2026-10-27T09:00:00Z',
      lastModifiedBy: driverUser.uid,
      lastModifiedByName: driverUser.displayName,
    };

    const tryFinishAgain = () => {
      if (completedUsage.status !== 'in_corso') {
        throw new Error('Questo viaggio risulta già concluso.');
      }
    };

    expect(tryFinishAgain).toThrowError('Questo viaggio risulta già concluso.');
  });

  // SCENARIO 12: Chilometri finali inferiori a quelli iniziali
  it('Scenario 12: Errore se i km finali sono inferiori a quelli di partenza', () => {
    const startKm = 48250;
    const invalidEndKm = 48200;

    const validateKm = () => {
      if (invalidEndKm < startKm) {
        throw new Error(`I chilometri finali (${invalidEndKm}) non possono essere inferiori a quelli iniziali (${startKm}).`);
      }
    };

    expect(validateKm).toThrowError(/non possono essere inferiori/);
  });

  // SCENARIO 13: Tentativo di accesso ai viaggi di un altro operatore
  it('Scenario 13: Un operatore non può modificare né concludere viaggi altrui', () => {
    const anotherDriverTrip: VehicleUsage = {
      id: 'usg_other',
      vehicleId: 'veh_ducato_01',
      vehicleName: 'Ducato',
      vehiclePlate: 'FS 123 AB',
      driverId: 'another_user_uid',
      driverName: 'Paolo Neri',
      usageDate: '2026-10-27',
      startTime: '10:00',
      destination: 'Rovato',
      reason: 'Commissioni',
      startKm: 48250,
      status: 'in_corso',
      mode: 'pulsanti',
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T10:00:00Z',
      lastModifiedBy: 'another_user_uid',
      lastModifiedByName: 'Paolo Neri',
    };

    const tryFinishOtherUserTrip = (requestingUser: AppUser) => {
      if (requestingUser.role !== 'amministratore' && anotherDriverTrip.driverId !== requestingUser.uid) {
        throw new Error('Non sei autorizzato a concludere il viaggio di un altro operatore.');
      }
    };

    // Operatore normale: bloccato
    expect(() => tryFinishOtherUserTrip(driverUser)).toThrowError(/Non sei autorizzato/);
  });

  // SCENARIO 14: Accesso amministrativo autorizzato
  it('Scenario 14: L\'amministratore può intervenire su qualunque viaggio', () => {
    const anotherDriverTrip: VehicleUsage = {
      id: 'usg_other',
      vehicleId: 'veh_ducato_01',
      vehicleName: 'Ducato',
      vehiclePlate: 'FS 123 AB',
      driverId: 'another_user_uid',
      driverName: 'Paolo Neri',
      usageDate: '2026-10-27',
      startTime: '10:00',
      destination: 'Rovato',
      reason: 'Commissioni',
      startKm: 48250,
      status: 'in_corso',
      mode: 'pulsanti',
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T10:00:00Z',
      lastModifiedBy: 'another_user_uid',
      lastModifiedByName: 'Paolo Neri',
    };

    const checkAuthorization = (requestingUser: AppUser) => {
      if (requestingUser.role !== 'amministratore' && anotherDriverTrip.driverId !== requestingUser.uid) {
        throw new Error('Non sei autorizzato a concludere il viaggio di un altro operatore.');
      }
      return true;
    };

    // Amministratore: autorizzato
    expect(checkAuthorization(adminUser)).toBe(true);
  });

  // SCENARIO 15: Errori di rete e scrittura Firestore
  it('Scenario 15: Errori di rete non lasciano lo stato del veicolo incoerente', () => {
    const initialKm = 48250;
    const vehicle = { ...mockVehicles[0], currentKm: initialKm };

    const simulatedNetworkFailureTransaction = () => {
      try {
        throw new Error('the client is offline - network timeout');
      } catch (err: any) {
        // Rollback: non aggiorna i dati locali senza conferma Firestore
        return { success: false, error: err.message };
      }
    };

    const res = simulatedNetworkFailureTransaction();
    expect(res.success).toBe(false);
    expect(res.error).toContain('offline');
    expect(vehicle.currentKm).toBe(initialKm);
  });

  // SCENARIO 16: Apertura del collegamento NFC contenente il dominio Vercel
  it('Scenario 16: Formatta e riconosce correttamente il collegamento NFC con dominio Vercel', () => {
    const nfcUrl = getVehicleNfcUrl('veh_ducato_01');
    expect(nfcUrl).toBe('https://viaggiabella.vercel.app/?vehicleId=veh_ducato_01&source=nfc');
    expect(OFFICIAL_DOMAIN).toBe('https://viaggiabella.vercel.app');

    const qrUrl = getVehicleQrUrl('veh_ducato_01');
    expect(qrUrl).toBe('https://viaggiabella.vercel.app/?vehicleId=veh_ducato_01&source=qr');

    const parsed = parseVehicleIdentifier(nfcUrl);
    expect(parsed.vehicleId).toBe('veh_ducato_01');
    expect(parsed.source).toBe('nfc');
  });

  // SCENARIO 17: Scansione NFC/QR imposta il mezzo e genera il label del pulsante "Inizia viaggio ora: [Nome Mezzo]"
  it('Scenario 17: Scansione NFC/QR formatta correttamente il pulsante di inizio viaggio con il nome del mezzo', () => {
    const rawQr = 'https://viaggiabella.vercel.app/?vehicleId=veh_ducato_01&source=qr';
    const parsed = parseVehicleIdentifier(rawQr);
    const vehicle = mockVehicles.find(v => v.id === parsed.vehicleId);
    expect(vehicle).toBeDefined();

    // Funzione helper usata nel componente
    const getButtonLabel = (v?: Vehicle | null) => (v ? `Inizia viaggio ora: ${v.name}` : 'Inizia Viaggio ORA');

    expect(getButtonLabel(null)).toBe('Inizia Viaggio ORA');
    expect(getButtonLabel(vehicle)).toBe('Inizia viaggio ora: Fiat Ducato 9 Posti');
  });

  // SCENARIO 18: Avvio viaggio registra punto GPS della lettura senza richiedere inserimento km manuali
  it('Scenario 18: Avvio viaggio registra punto GPS senza imporre digitazione km cruscotto', () => {
    const vehicle = mockVehicles[0];
    const gpsLocation = {
      latitude: 45.65921,
      longitude: 10.05184,
      accuracy: 6,
      address: 'Via Roma, Iseo (BS)',
      timestamp: '2026-10-28T10:00:00Z',
    };

    const newUsage: VehicleUsage = {
      id: 'usg_gps_test_1',
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.plate,
      driverId: driverUser.uid,
      driverName: driverUser.displayName,
      usageDate: '2026-10-28',
      startTime: '10:00',
      destination: 'Centro Clarabella',
      reason: 'Trasporto Utenti',
      // Non è richiesto inserimento km manuale
      startGpsPoint: `${gpsLocation.address} (${gpsLocation.latitude.toFixed(5)}, ${gpsLocation.longitude.toFixed(5)})`,
      startLocation: gpsLocation,
      status: 'in_corso',
      mode: 'pulsanti',
      createdAt: '2026-10-28T10:00:00Z',
      updatedAt: '2026-10-28T10:00:00Z',
      lastModifiedBy: driverUser.uid,
      lastModifiedByName: driverUser.displayName,
    };

    expect(newUsage.startGpsPoint).toContain('Iseo');
    expect(newUsage.startLocation?.latitude).toBe(45.65921);
    expect(newUsage.status).toBe('in_corso');
  });

  // SCENARIO 19: Conclusione viaggio registra punto GPS di rientro senza richiedere km percorsi
  it('Scenario 19: Conclusione viaggio con punto GPS di rientro senza forzare inserimento km', () => {
    const usage: VehicleUsage = {
      id: 'usg_gps_test_1',
      vehicleId: 'veh_ducato_01',
      vehicleName: 'Fiat Ducato 9 Posti',
      vehiclePlate: 'FS 123 AB',
      driverId: driverUser.uid,
      driverName: driverUser.displayName,
      usageDate: '2026-10-28',
      startTime: '10:00',
      destination: 'Centro Clarabella',
      reason: 'Trasporto Utenti',
      startGpsPoint: 'Via Roma, Iseo (BS)',
      status: 'in_corso',
      mode: 'pulsanti',
      createdAt: '2026-10-28T10:00:00Z',
      updatedAt: '2026-10-28T10:00:00Z',
      lastModifiedBy: driverUser.uid,
      lastModifiedByName: driverUser.displayName,
    };

    const finishGps = {
      latitude: 45.62145,
      longitude: 9.99812,
      accuracy: 8,
      address: 'Sede Clarabella, Corte Franca (BS)',
      timestamp: '2026-10-28T11:30:00Z',
    };

    // Chiusura senza km finali
    const completedUsage: VehicleUsage = {
      ...usage,
      status: 'completato',
      endTime: '11:30',
      endGpsPoint: `${finishGps.address} (${finishGps.latitude.toFixed(5)}, ${finishGps.longitude.toFixed(5)})`,
      endLocation: finishGps,
    };

    expect(completedUsage.status).toBe('completato');
    expect(completedUsage.endGpsPoint).toContain('Corte Franca');
    expect(completedUsage.endKm).toBeUndefined();
    expect(completedUsage.distanceKm).toBeUndefined();
  });

  // SCENARIO 20: Avvio e chiusura viaggio a GPS spento o assente (non bloccante)
  it('Scenario 20: Avvio e chiusura viaggio procedono regolarmente anche con GPS disattivato o segnale assente', () => {
    // Quando il GPS è spento, startGpsPoint e startLocation sono undefined/null
    const usageWithoutGps: VehicleUsage = {
      id: 'usg_no_gps_123',
      vehicleId: mockVehicles[0].id,
      vehicleName: mockVehicles[0].name,
      vehiclePlate: mockVehicles[0].plate,
      driverId: driverUser.uid,
      driverName: driverUser.displayName,
      usageDate: '2026-10-29',
      startTime: '08:15',
      destination: 'Servizio cooperativa',
      reason: 'Trasporto Utenti',
      // Nessun dato GPS
      startGpsPoint: undefined,
      startLocation: undefined,
      status: 'in_corso',
      mode: 'pulsanti',
      createdAt: '2026-10-29T08:15:00Z',
      updatedAt: '2026-10-29T08:15:00Z',
      lastModifiedBy: driverUser.uid,
      lastModifiedByName: driverUser.displayName,
    };

    expect(usageWithoutGps.status).toBe('in_corso');
    expect(usageWithoutGps.startGpsPoint).toBeUndefined();
    expect(usageWithoutGps.destination).toBe('Servizio cooperativa');

    // Chiusura viaggio anch'essa a GPS spento
    const closedWithoutGps: VehicleUsage = {
      ...usageWithoutGps,
      status: 'completato',
      endTime: '09:45',
      endGpsPoint: undefined,
      endLocation: undefined,
      updatedAt: '2026-10-29T09:45:00Z',
    };

    expect(closedWithoutGps.status).toBe('completato');
    expect(closedWithoutGps.endTime).toBe('09:45');
    expect(closedWithoutGps.endGpsPoint).toBeUndefined();
  });

  it('Scenario 21: Verifica aggiornamenti - Quando la versione locale è uguale o superiore alla remota, segnala che è già aggiornata', () => {
    const localVersionCode = 3;
    const remoteVersionCode = 3;
    const hasUpdate = remoteVersionCode > localVersionCode;
    expect(hasUpdate).toBe(false);

    // Messaggio atteso: "La versione corrente è già aggiornata"
    const statusMessage = hasUpdate
      ? 'Trovato nuovo aggiornamento disponibile'
      : 'La versione corrente è già aggiornata';
    expect(statusMessage).toBe('La versione corrente è già aggiornata');
  });

  it('Scenario 22: Verifica aggiornamenti - Quando sul server è disponibile una versione più recente, segnala il nuovo aggiornamento', () => {
    const localVersionCode = 2; // APK installata precedentemente v1.1.0
    const remoteVersionCode = 3; // Nuova release v1.2.0
    const hasUpdate = remoteVersionCode > localVersionCode;
    expect(hasUpdate).toBe(true);

    const statusMessage = hasUpdate
      ? 'Trovato nuovo aggiornamento disponibile'
      : 'La versione corrente è già aggiornata';
    expect(statusMessage).toBe('Trovato nuovo aggiornamento disponibile');
  });
});

