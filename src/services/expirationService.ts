import { Vehicle } from '../types';

export type ExpiryStatusType = 'scaduto' | 'imminente' | 'regolare' | 'non_impostato';

export interface ExpiryEvaluation {
  status: ExpiryStatusType;
  daysLeft: number | null;
  formattedDate: string;
  badgeLabel: string;
  badgeClass: string;
  isUrgent: boolean; // True se scaduto o entro 30 giorni
}

/**
 * Calcola i giorni rimanenti rispetto alla data odierna.
 * Se negativo, la scadenza è già superata.
 */
export function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Valuta lo stato di una scadenza (Assicurazione o Revisione).
 * Soglia di preavviso predefinita: 30 giorni (almeno un mese prima).
 */
export function evaluateExpiry(
  dateStr?: string,
  typeName: 'Assicurazione' | 'Revisione' = 'Assicurazione'
): ExpiryEvaluation {
  if (!dateStr) {
    return {
      status: 'non_impostato',
      daysLeft: null,
      formattedDate: 'Non impostata',
      badgeLabel: 'Non definita',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      isUrgent: false,
    };
  }

  const daysLeft = getDaysUntil(dateStr);
  if (daysLeft === null) {
    return {
      status: 'non_impostato',
      daysLeft: null,
      formattedDate: dateStr,
      badgeLabel: 'Non valida',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      isUrgent: false,
    };
  }

  // Formatta data in formato italiano DD/MM/YYYY
  const parts = dateStr.split('-');
  const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;

  if (daysLeft < 0) {
    const expiredDays = Math.abs(daysLeft);
    return {
      status: 'scaduto',
      daysLeft,
      formattedDate,
      badgeLabel: `SCADUTA (${expiredDays} gg fa)`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
      isUrgent: true,
    };
  } else if (daysLeft === 0) {
    return {
      status: 'scaduto',
      daysLeft: 0,
      formattedDate,
      badgeLabel: 'SCADE OGGI!',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
      isUrgent: true,
    };
  } else if (daysLeft <= 30) {
    return {
      status: 'imminente',
      daysLeft,
      formattedDate,
      badgeLabel: `Scade tra ${daysLeft} gg`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      isUrgent: true,
    };
  } else {
    return {
      status: 'regolare',
      daysLeft,
      formattedDate,
      badgeLabel: `Regolare (${formattedDate})`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      isUrgent: false,
    };
  }
}

export interface VehicleAlertSummary {
  vehicle: Vehicle;
  insurance: ExpiryEvaluation;
  inspection: ExpiryEvaluation;
  hasUrgentAlert: boolean;
  maxUrgencyScore: number; // Più alto = più urgente (scaduti hanno punteggio massimo)
}

export function evaluateVehicleAlerts(vehicle: Vehicle): VehicleAlertSummary {
  const insurance = evaluateExpiry(vehicle.insuranceExpiry, 'Assicurazione');
  const inspection = evaluateExpiry(vehicle.inspectionExpiry, 'Revisione');

  const hasUrgentAlert = insurance.isUrgent || inspection.isUrgent;

  // Calcolo score di urgenza:
  // Se scaduto: 1000 + giorni scaduti
  // Se imminente: 100 - giorni rimanenti
  let score = 0;
  if (insurance.status === 'scaduto') score = Math.max(score, 1000 + Math.abs(insurance.daysLeft || 0));
  else if (insurance.status === 'imminente') score = Math.max(score, 100 - (insurance.daysLeft || 0));

  if (inspection.status === 'scaduto') score = Math.max(score, 1000 + Math.abs(inspection.daysLeft || 0));
  else if (inspection.status === 'imminente') score = Math.max(score, 100 - (inspection.daysLeft || 0));

  return {
    vehicle,
    insurance,
    inspection,
    hasUrgentAlert,
    maxUrgencyScore: score,
  };
}

/**
 * Restituisce l'elenco dei veicoli con allerte attive o imminenti ordinati per gravità.
 */
export function getFleetExpiryAlerts(vehicles: Vehicle[]): VehicleAlertSummary[] {
  return vehicles
    .map(evaluateVehicleAlerts)
    .filter(item => item.hasUrgentAlert)
    .sort((a, b) => b.maxUrgencyScore - a.maxUrgencyScore);
}
