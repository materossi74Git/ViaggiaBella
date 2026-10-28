export type UserRole = 'operatore' | 'amministratore';
export type UserStatus = 'attivo' | 'revocato';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  pinHash?: string;
  pinSalt?: string;
  quickUnlockEnabled?: boolean;
  failedPinAttempts?: number;
  lockUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VehicleType = 'auto' | 'furgone' | 'pulmino' | 'speciale';
export type VehicleStatus = 'attivo' | 'inattivo';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  brandModel: string;
  type: VehicleType;
  status: VehicleStatus;
  qrCodeId: string;
  nfcTagId?: string;
  currentKm: number;
  insuranceExpiry?: string; // YYYY-MM-DD
  insuranceCompany?: string;
  inspectionExpiry?: string; // YYYY-MM-DD
  inspectionNotes?: string;
  notes?: string;
  activeTripId?: string | null; // ID del viaggio attualmente in corso
  activeDriverId?: string | null; // UID del conducente attualmente in servizio
  activeDriverName?: string | null; // Nome del conducente attualmente in servizio
  isOccupied?: boolean; // True se il mezzo è attualmente in uso
  createdAt: string;
  updatedAt: string;
}

export type UsageStatus = 'in_corso' | 'completato' | 'da_verificare';
export type UsageMode = 'manuale' | 'pulsanti';

export interface VehicleUsage {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  usageDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime?: string; // HH:MM
  destination: string;
  reason: string;
  startKm?: number;
  endKm?: number;
  distanceKm?: number;
  // Punti GPS della lettura (dove l'operatore effettua la lettura con NFC/QR o pulsante)
  startGpsPoint?: string;
  startLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    timestamp?: string;
  };
  endGpsPoint?: string;
  endLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    timestamp?: string;
  };
  notes?: string;
  status: UsageStatus;
  mode: UsageMode;
  startRealTimestamp?: string;
  endRealTimestamp?: string;
  firstSavedAt?: string; // ISO String, base per il conteggio dei 30 minuti di modifica
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
  lastModifiedByName: string;
  hasAnomalies?: boolean;
  anomalyNotes?: string;
}

export type CorrectionStatus = 'in_attesa' | 'approvata' | 'rifiutata';

export interface CorrectionRequest {
  id: string;
  usageId: string;
  driverId: string;
  driverName: string;
  vehicleName: string;
  requestDate: string;
  reason: string;
  desiredChanges: string;
  status: CorrectionStatus;
  adminId?: string;
  adminName?: string;
  decisionDate?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditActionType =
  | 'creazione'
  | 'modifica_operatore'
  | 'completamento'
  | 'correzione_amministrativa'
  | 'annullamento';

export interface AuditLog {
  id: string;
  usageId: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  actionType: AuditActionType;
  summary: string;
  previousValues?: string; // JSON serializzato
  newValues?: string; // JSON serializzato
  adminAuthorizerId?: string;
  adminAuthorizerName?: string;
  reason?: string;
  technicalInfo?: string;
}

export interface AppSettings {
  companyName: string;
  autoLockMinutes: number;
  maxEditWindowMinutes: number;
  reasons: string[];
}
