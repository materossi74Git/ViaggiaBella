import { Timestamp } from 'firebase/firestore';

/**
 * Estrae i millisecondi (Epoch ms) da qualsiasi rappresentazione temporale supportata:
 * - Firestore Timestamp (istanza con toMillis o toDate)
 * - Oggetto Timestamp serializzato ({ seconds, nanoseconds } o { _seconds, _nanoseconds })
 * - Oggetto Date standard di JavaScript
 * - Stringa ISO 8601 (es. '2026-10-31T12:00:00.000Z')
 * - Numero Epoch (secondi o millisecondi)
 * - null o undefined (restituisce null in modo sicuro)
 */
export function getTimestampMillis(val: unknown): number | null {
  if (val === null || val === undefined || val === '') {
    return null;
  }

  // 1. Timestamp nativo Firestore o oggetto con toMillis()
  if (typeof (val as any).toMillis === 'function') {
    try {
      const ms = (val as any).toMillis();
      if (typeof ms === 'number' && !isNaN(ms)) {
        return ms;
      }
    } catch {
      // Fallback
    }
  }

  // 2. Timestamp o oggetto con toDate()
  if (typeof (val as any).toDate === 'function') {
    try {
      const d = (val as any).toDate();
      if (d instanceof Date && !isNaN(d.getTime())) {
        return d.getTime();
      }
    } catch {
      // Fallback
    }
  }

  // 3. Oggetto serializzato Firestore ({ seconds, nanoseconds } o { _seconds, _nanoseconds })
  if (typeof val === 'object') {
    const obj = val as Record<string, any>;
    const sec = obj.seconds !== undefined ? obj.seconds : obj._seconds;
    const nano = obj.nanoseconds !== undefined ? obj.nanoseconds : obj._nanoseconds;

    if (typeof sec === 'number' && !isNaN(sec)) {
      const nanoMs = typeof nano === 'number' && !isNaN(nano) ? nano / 1000000 : 0;
      return Math.floor(sec * 1000 + nanoMs);
    }
  }

  // 4. Istanza Date nativa
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? null : t;
  }

  // 5. Numero Epoch (in millisecondi o secondi)
  if (typeof val === 'number') {
    if (isNaN(val)) return null;
    // Se è a 10 cifre (secondi Epoch standard, es. 1761928000), converti in millisecondi
    if (val > 0 && val < 100000000000) {
      return Math.floor(val * 1000);
    }
    return Math.floor(val);
  }

  // 6. Stringa (ISO 8601 o formati datari standard)
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) {
      return parsed;
    }
    // Prova se stringa numerica
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return getTimestampMillis(num);
    }
  }

  return null;
}

/**
 * Converte qualsiasi formato temporale valido in un Firestore Timestamp nativo.
 * Se già Timestamp, restituisce l'istanza intatta.
 */
export function toFirestoreTimestamp(val: unknown): Timestamp | null {
  if (val === null || val === undefined) {
    return null;
  }

  if (val instanceof Timestamp) {
    return val;
  }

  if (typeof (val as any).toMillis === 'function') {
    return Timestamp.fromMillis((val as any).toMillis());
  }

  const ms = getTimestampMillis(val);
  if (ms !== null) {
    return Timestamp.fromMillis(ms);
  }

  return null;
}

/**
 * Converte qualsiasi formato temporale in una stringa ISO 8601 standard.
 * Utile per compatibilità con campi stringa o log di audit.
 */
export function formatTimestampToIso(val: unknown): string | null {
  const ms = getTimestampMillis(val);
  if (ms === null) return null;
  return new Date(ms).toISOString();
}

/**
 * Formatta un timestamp in una stringa leggibile per la UI (es. '31/10/2026, 14:30:00').
 * Se il valore è nullo, assente o invalido, restituisce una stringa di fallback ('-').
 */
export function formatTimestampForDisplay(
  val: unknown,
  fallback = '-'
): string {
  const ms = getTimestampMillis(val);
  if (ms === null) {
    return fallback;
  }
  try {
    const d = new Date(ms);
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return fallback;
  }
}

/**
 * Verifica se un salvataggio definitivo rientra nella finestra dei 30 minuti.
 * Gestisce Timestamp Firestore nativi, stringhe ISO pregresse e numeri Epoch.
 */
export function isWithin30Minutes(firstSavedAt: unknown, referenceTimeMs?: number): boolean {
  if (!firstSavedAt) return true;
  const ms = getTimestampMillis(firstSavedAt);
  if (ms === null) return true;

  const now = referenceTimeMs ?? Date.now();
  const diffMinutes = (now - ms) / (1000 * 60);
  return diffMinutes <= 30;
}

/**
 * Calcola i minuti rimanenti entro la finestra di 30 minuti.
 */
export function getRemainingMinutes30(firstSavedAt: unknown, referenceTimeMs?: number): number {
  if (!firstSavedAt) return 30;
  const ms = getTimestampMillis(firstSavedAt);
  if (ms === null) return 30;

  const now = referenceTimeMs ?? Date.now();
  const diffMinutes = (now - ms) / (1000 * 60);
  return Math.max(0, Math.ceil(30 - diffMinutes));
}

/**
 * Verifica se un account ha un lockout PIN attualmente attivo.
 */
export function isLockActive(lockUntil: unknown, referenceTimeMs?: number): boolean {
  if (!lockUntil) return false;
  const ms = getTimestampMillis(lockUntil);
  if (ms === null) return false;

  const now = referenceTimeMs ?? Date.now();
  return ms > now;
}

/**
 * Calcola i secondi rimanenti di blocco PIN per il countdown UI.
 */
export function getRemainingLockSeconds(lockUntil: unknown, referenceTimeMs?: number): number {
  if (!lockUntil) return 0;
  const ms = getTimestampMillis(lockUntil);
  if (ms === null) return 0;

  const now = referenceTimeMs ?? Date.now();
  return Math.max(0, Math.ceil((ms - now) / 1000));
}
