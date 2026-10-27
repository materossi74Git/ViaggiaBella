/**
 * Servizio Web NFC per l'identificazione rapida dei mezzi tramite tag NFC (compatibile con Chrome Android).
 * Gestisce i controlli di compatibilità, autorizzazione e fallback trasparente.
 */

declare global {
  interface Window {
    NDEFReader?: new () => NDEFReaderInstance;
  }
  interface NDEFReaderInstance {
    scan: () => Promise<void>;
    write: (message: string | NDEFMessageInit) => Promise<void>;
    addEventListener: (type: 'reading' | 'readingerror', listener: (event: any) => void) => void;
    removeEventListener: (type: 'reading' | 'readingerror', listener: (event: any) => void) => void;
  }
  interface NDEFMessageInit {
    records: Array<{
      recordType: string;
      data: string | ArrayBuffer;
    }>;
  }
}

export const AAR_PACKAGE_NAME = 'it.coopclarabella.viaggiabella';

export interface NfcSupportStatus {
  supported: boolean;
  message: string;
}

export function checkNfcSupport(): NfcSupportStatus {
  if (typeof window === 'undefined') {
    return { supported: false, message: 'Ambiente non supportato' };
  }

  if (!('NDEFReader' in window)) {
    return {
      supported: false,
      message:
        'Web NFC non è disponibile su questo browser. Su iPhone o browser desktop puoi usare la comoda guida con l\'app gratuita NFC Tools per programmare le schede in 30 secondi, o la fotocamera per il QR Code.',
    };
  }

  return {
    supported: true,
    message: 'NFC disponibile. Puoi scrivere o leggere le schede direttamente con questo smartphone.',
  };
}

export const OFFICIAL_DOMAIN = 'https://viaggiabella.vercel.app';

/**
 * Genera l'URL universale ufficiale da programmare sul tag NFC o QR code.
 * Il dominio di riferimento ufficiale è https://viaggiabella.vercel.app/
 * Quando un utente tocca la scheda o inquadra il QR:
 * - Se ha l'APK installata, Android lancia subito l'app.
 * - Se non ha l'APK, apre la PWA/sito HTTPS ufficiale su Vercel.
 */
export function getVehicleNfcUrl(vehicleId: string, customOrigin?: string): string {
  // Se specificato esplicitamente un customOrigin, usalo; altrimenti usa il dominio ufficiale Vercel
  const origin = (customOrigin || OFFICIAL_DOMAIN).replace(/\/+$/, '');
  return `${origin}/?vehicleId=${encodeURIComponent(vehicleId.trim())}&source=nfc`;
}

/**
 * Genera l'URL universale per i codici QR cartacei stampabili.
 */
export function getVehicleQrUrl(vehicleId: string, customOrigin?: string): string {
  const origin = (customOrigin || OFFICIAL_DOMAIN).replace(/\/+$/, '');
  return `${origin}/?vehicleId=${encodeURIComponent(vehicleId.trim())}&source=qr`;
}

/**
 * Analizza e normalizza in sicurezza un testo, link o payload letto da QR / NFC / URL.
 * Riconosce formati:
 * - https://viaggiabella.vercel.app/?vehicleId=...
 * - https://.../?qr=... o nfc=...
 * - viaggiabella://vehicle/... o viaggiabella://...
 * - Codici ID grezzi (es. veh_ducato_01, coop-veh-01, nfc-ducato-01, FS 123 AB)
 */
export function parseVehicleIdentifier(rawInput: string): {
  vehicleId: string;
  source: 'nfc' | 'qr' | 'manual';
  rawInput: string;
} {
  if (!rawInput || typeof rawInput !== 'string') {
    return { vehicleId: '', source: 'manual', rawInput: '' };
  }

  let text = decodeURIComponent(rawInput.trim());
  let detectedSource: 'nfc' | 'qr' | 'manual' = 'manual';

  if (text.includes('source=nfc') || text.includes('nfc=')) {
    detectedSource = 'nfc';
  } else if (text.includes('source=qr') || text.includes('qr=')) {
    detectedSource = 'qr';
  }

  if (text.includes('vehicleId=')) {
    const match = text.match(/[?&]vehicleId=([^&#]+)/);
    if (match) {
      text = match[1];
    }
  } else if (text.includes('qr=')) {
    const match = text.match(/[?&]qr=([^&#]+)/);
    if (match) {
      text = match[1];
      detectedSource = 'qr';
    }
  } else if (text.includes('nfc=')) {
    const match = text.match(/[?&]nfc=([^&#]+)/);
    if (match) {
      text = match[1];
      detectedSource = 'nfc';
    }
  } else if (text.startsWith('viaggiabella://vehicle/')) {
    text = text.replace('viaggiabella://vehicle/', '');
  } else if (text.startsWith('viaggiabella://')) {
    text = text.replace('viaggiabella://', '');
  }

  return {
    vehicleId: text.trim(),
    source: detectedSource,
    rawInput,
  };
}

/**
 * Scrive una scheda NFC fisica (NTAG213, NTAG215, NTAG216) tramite Web NFC su Chrome Android.
 * Scrive l'URL universale e l'Android Application Record (AAR).
 */
export async function writeVehicleNfcTag(
  vehicleId: string,
  vehiclePlate: string = '',
  customOrigin?: string
): Promise<{ success: boolean; message: string }> {
  const support = checkNfcSupport();
  if (!support.supported) {
    return {
      success: false,
      message: support.message,
    };
  }

  const targetUrl = getVehicleNfcUrl(vehicleId, customOrigin);

  try {
    const ndef = new window.NDEFReader!();

    // Proviamo a scrivere entrambi i record (URL + AAR per avvio nativo istantaneo Android)
    try {
      await ndef.write({
        records: [
          {
            recordType: 'url',
            data: targetUrl,
          },
          {
            recordType: 'android.com:pkg',
            data: AAR_PACKAGE_NAME,
          },
        ],
      });
    } catch (aarError) {
      // Alcuni browser Chromium consentono solo record URL standard: eseguiamo fallback pulito
      console.warn('Scrittura AAR non supportata direttamente, fallback su solo record URL:', aarError);
      await ndef.write({
        records: [
          {
            recordType: 'url',
            data: targetUrl,
          },
        ],
      });
    }

    return {
      success: true,
      message: `Scheda NFC programmata con successo per ${vehiclePlate || vehicleId}! Ora puoi posizionarla a bordo del veicolo.`,
    };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return {
        success: false,
        message: 'Permesso NFC rifiutato. Abilita i permessi NFC per questo sito nelle impostazioni di Chrome.',
      };
    }
    return {
      success: false,
      message:
        err?.message ||
        'Impossibile scrivere la scheda NFC. Assicurati che il tag sia formattabile e posizionato fermamente sul retro del telefono.',
    };
  }
}

export async function startNfcScan(
  onTagRead: (serialOrPayload: string) => void,
  onError: (errorMsg: string) => void
): Promise<() => void> {
  const support = checkNfcSupport();
  if (!support.supported) {
    onError(support.message);
    return () => {};
  }

  try {
    const ndef = new window.NDEFReader!();
    await ndef.scan();

    const readingHandler = (event: any) => {
      let payload = event.serialNumber || '';
      if (event.message && event.message.records && event.message.records.length > 0) {
        for (const record of event.message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding || 'utf-8');
            payload = textDecoder.decode(record.data);
            break;
          } else if (record.recordType === 'url') {
            const textDecoder = new TextDecoder();
            payload = textDecoder.decode(record.data);
            break;
          }
        }
      }
      if (payload) {
        onTagRead(payload);
      }
    };

    const errorHandler = () => {
      onError('Impossibile leggere il tag NFC. Assicurati che il tag sia integro e riprova.');
    };

    ndef.addEventListener('reading', readingHandler);
    ndef.addEventListener('readingerror', errorHandler);

    return () => {
      ndef.removeEventListener('reading', readingHandler);
      ndef.removeEventListener('readingerror', errorHandler);
    };
  } catch (err: any) {
    onError(err?.message || 'Accesso al sensore NFC negato o non supportato.');
    return () => {};
  }
}
