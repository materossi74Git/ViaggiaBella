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

/**
 * Genera l'URL universale da programmare sul tag NFC o QR code.
 * Quando un utente tocca la scheda:
 * - Se ha l'APK installata, Android lancia subito l'app.
 * - Se non ha l'APK, apre la pagina web chiedendo se vuole scaricarla o proseguire in modalità PWA.
 */
export function getVehicleNfcUrl(vehicleId: string, customOrigin?: string): string {
  const origin =
    customOrigin ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-pnx3ml3kq6jkfy7r2hlltb-258029693457.europe-west1.run.app');
  return `${origin}/?vehicleId=${encodeURIComponent(vehicleId)}&source=nfc`;
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
