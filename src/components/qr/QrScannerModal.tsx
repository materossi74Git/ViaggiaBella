import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Lock,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { Vehicle } from '../../types';
import { parseVehicleIdentifier } from '../../services/nfcService';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onVehicleIdentified: (vehicle: Vehicle) => void;
  onManualSelectRequested: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onVehicleIdentified,
  onManualSelectRequested,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [identifiedVehicle, setIdentifiedVehicle] = useState<Vehicle | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);
  const readerElementId = 'qr-camera-stream';

  const stopAndClearScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Errore arresto scanner:', e);
      }
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    await stopAndClearScanner();

    if (!isMountedRef.current) return;

    setIsInitializing(true);
    setErrorMsg(null);

    try {
      const scanner = new Html5Qrcode(readerElementId);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          if (!isMountedRef.current || isProcessingRef.current) return;
          handleDecodedText(decodedText);
        },
        () => {
          // Frame senza QR leggibile: nessun errore bloccante
        }
      );

      if (isMountedRef.current) {
        setIsInitializing(false);
        setIsRequestingPermission(false);
        setIsPermissionDenied(false);
        setErrorMsg(null);
      }
    } catch (err: any) {
      console.error('Errore avvio fotocamera:', err);
      if (!isMountedRef.current) return;

      setIsInitializing(false);
      setIsRequestingPermission(false);

      const errStr = String(err?.name || err?.message || err).toLowerCase();

      if (
        errStr.includes('notallowed') ||
        errStr.includes('denied') ||
        errStr.includes('permission') ||
        errStr.includes('notallowederror') ||
        errStr.includes('permissiondeniederror')
      ) {
        setIsPermissionDenied(true);
        setErrorMsg(
          'Permesso fotocamera non concesso o bloccato. Occorre consentire l\'accesso alla fotocamera per scansionare il QR Code.'
        );
      } else if (errStr.includes('notfound') || errStr.includes('devicesnotfound')) {
        setIsPermissionDenied(false);
        setErrorMsg('Nessuna fotocamera rilevata su questo dispositivo.');
      } else {
        setIsPermissionDenied(true);
        setErrorMsg(
          'Impossibile attivare il flusso video della fotocamera. Verifica i permessi o prova a riattivare la fotocamera.'
        );
      }
    }
  };

  // Tenta la richiesta esplicita di permessi via navigator.mediaDevices.getUserMedia
  const requestCameraPermissionAndStart = async () => {
    setIsRequestingPermission(true);
    setErrorMsg(null);

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        // Tenta di sollecitare il prompt nativo del browser/app per i permessi fotocamera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        // Chiudi subito lo stream di test in modo che Html5Qrcode possa acquisire il dispositivo
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err: any) {
      console.warn('Richiesta permessi getUserMedia fallita o rifiutata:', err);
      const errStr = String(err?.name || err?.message || err).toLowerCase();
      if (
        errStr.includes('notallowed') ||
        errStr.includes('denied') ||
        errStr.includes('permission')
      ) {
        setIsPermissionDenied(true);
        setIsRequestingPermission(false);
        setIsInitializing(false);
        setErrorMsg(
          'I permessi della fotocamera risultano bloccati. Consulta la guida qui sotto per abilitarli nelle impostazioni del browser o dello smartphone.'
        );
        setShowGuide(true);
        return;
      }
    }

    // Prosegui con l'avvio dello scanner
    await startScanner();
  };

  useEffect(() => {
    if (!isOpen) {
      isProcessingRef.current = false;
      return;
    }

    isMountedRef.current = true;
    isProcessingRef.current = false;
    setIsInitializing(true);
    setIsPermissionDenied(false);
    setIsRequestingPermission(false);
    setShowGuide(false);
    setErrorMsg(null);
    setIdentifiedVehicle(null);

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    // Inizializza anche il lettore Web NFC se supportato dal dispositivo (Chrome su Android)
    let nfcAbortController: AbortController | null = null;
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      try {
        const ndef = new (window as any).NDEFReader();
        nfcAbortController = new AbortController();
        ndef
          .scan({ signal: nfcAbortController.signal })
          .then(() => {
            ndef.onreading = (event: any) => {
              if (!isMountedRef.current || isProcessingRef.current) return;
              let tagData = event.serialNumber || '';
              if (event.message?.records) {
                for (const record of event.message.records) {
                  try {
                    const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                    const decoded = textDecoder.decode(record.data);
                    if (decoded) tagData = decoded;
                  } catch (e) {
                    console.warn('Errore decodifica record NFC:', e);
                  }
                }
              }
              if (tagData) {
                handleDecodedText(tagData);
              }
            };
          })
          .catch((err: any) => {
            console.log('Web NFC non attivo o permesso non concesso:', err);
          });
      } catch (e) {
        console.log('Inizializzazione NDEFReader non riuscita:', e);
      }
    }

    return () => {
      isMountedRef.current = false;
      isProcessingRef.current = false;
      clearTimeout(timer);
      if (nfcAbortController) {
        try {
          nfcAbortController.abort();
        } catch (e) {}
      }
      stopAndClearScanner();
    };
  }, [isOpen]);

  const handleDecodedText = (text: string) => {
    if (isProcessingRef.current) return;

    const { vehicleId: target } = parseVehicleIdentifier(text);
    if (!target) return;

    const cleanTarget = target.replace(/\s+/g, '').toUpperCase();

    // Cerca veicolo corrispondente nella flotta
    const found = vehicles.find(
      v =>
        v.id === target ||
        v.qrCodeId === target ||
        v.nfcTagId === target ||
        v.plate.replace(/\s+/g, '').toUpperCase() === cleanTarget
    );

    if (found) {
      // Controllo veicolo inattivo
      if (found.status === 'inattivo') {
        setErrorMsg(
          `Il veicolo "${found.name}" (${found.plate}) risulta fuori servizio/inattivo. Impossibile avviare un nuovo viaggio.`
        );
        return;
      }

      isProcessingRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(100);
        } catch {}
      }
      setIdentifiedVehicle(found);
      stopAndClearScanner();

      setTimeout(() => {
        onVehicleIdentified(found);
        onClose();
      }, 700);
    } else {
      setErrorMsg(
        `Codice letto: "${text}". Nessun mezzo registrato corrisponde a questo identificativo.`
      );
    }
  };

  // Chiudi con tasto Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl text-white overflow-hidden relative my-auto">
        {/* Header Modale */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-sm leading-tight">Riconoscimento Mezzo</h3>
              <div className="flex items-center space-x-1.5 text-[10px] text-teal-400 font-medium">
                <span>Fotocamera QR</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> Sensore NFC
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors tap-bounce"
            title="Chiudi finestra (Esc)"
            aria-label="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport fotocamera / Sovrapposizioni di Stato */}
        <div className="relative mt-4 rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border border-slate-800">
          <div id={readerElementId} className="w-full h-full object-cover" />

          {/* Stato: Inizializzazione / Richiesta Permessi */}
          {(isInitializing || isRequestingPermission) && !identifiedVehicle && !isPermissionDenied && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center p-4">
              <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mb-2" />
              <p className="text-xs text-slate-300 font-medium">
                {isRequestingPermission
                  ? 'Richiesta permessi fotocamera in corso...'
                  : 'Avvio fotocamera dello smartphone...'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Se richiesto dal browser o dallo smartphone, seleziona <strong>"Consenti"</strong>.
              </p>
            </div>
          )}

          {/* Stato: Permesso Negato o Fotocamera non Attiva */}
          {isPermissionDenied && !identifiedVehicle && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-4 z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                <CameraOff className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Fotocamera non attiva</h4>
              <p className="text-xs text-slate-300 mb-3 px-2">
                Occorre consentire l'accesso alla fotocamera per scansionare i QR Code.
              </p>
              <button
                type="button"
                onClick={requestCameraPermissionAndStart}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all tap-bounce flex items-center space-x-1.5 shadow-lg shadow-teal-900/30"
              >
                <Camera className="w-4 h-4" />
                <span>Consenti e Attiva Fotocamera</span>
              </button>
            </div>
          )}

          {/* Stato: Mezzo Identificato con successo */}
          {identifiedVehicle && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-center p-4 animate-in fade-in zoom-in duration-200 z-20">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-2" />
              <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                Mezzo Identificato
              </div>
              <div className="text-lg font-bold text-white mt-1">{identifiedVehicle.name}</div>
              <div className="text-xs text-emerald-200 mt-0.5">Targa: {identifiedVehicle.plate}</div>
            </div>
          )}
        </div>

        {/* Avviso Errore o Istruzioni Permessi */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
              {isPermissionDenied && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={requestCameraPermissionAndStart}
                    className="font-bold text-teal-300 hover:underline inline-flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-1 inline" />
                    <span>Riprova Permessi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-[11px] text-amber-200 hover:text-white inline-flex items-center space-x-1 font-semibold"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showGuide ? 'Nascondi guida' : 'Come sbloccare'}</span>
                    {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guida Passo-Passo per sbloccare i permessi nelle impostazioni */}
        {showGuide && isPermissionDenied && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center space-x-1.5 font-bold text-teal-300">
              <Lock className="w-4 h-4 text-teal-400" />
              <span>Come abilitare la fotocamera se risultasse bloccata:</span>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/60">
                <div className="font-semibold text-slate-100 flex items-center gap-1 mb-0.5">
                  <Settings className="w-3 h-3 text-amber-400" />
                  <span>Su Browser / PWA (Chrome, Safari, Edge)</span>
                </div>
                <p className="text-slate-300">
                  1. Tocca l'icona del <strong>lucchetto 🔒</strong> o delle impostazioni sito nella barra degli indirizzi in alto.
                  <br />
                  2. Clicca su <strong>"Impostazioni sito"</strong> o <strong>"Permessi"</strong>.
                  <br />
                  3. Imposta <strong>Fotocamera</strong> su <strong>"Consenti"</strong>.
                </p>
              </div>

              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/60">
                <div className="font-semibold text-slate-100 flex items-center gap-1 mb-0.5">
                  <ShieldAlert className="w-3 h-3 text-teal-400" />
                  <span>Su App Android (APK ViaggiaBella)</span>
                </div>
                <p className="text-slate-300">
                  1. Apri le <strong>Impostazioni</strong> dello smartphone.
                  <br />
                  2. Vai su <strong>Applicazioni</strong> &gt; <strong>ViaggiaBella</strong>.
                  <br />
                  3. Seleziona <strong>Permessi</strong> &gt; <strong>Fotocamera</strong> &gt; <strong>"Consenti solo mentre l'app è in uso"</strong>.
                </p>
              </div>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={requestCameraPermissionAndStart}
                className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs transition-colors"
              >
                Ho aggiornato le impostazioni • Riprova ora
              </button>
            </div>
          </div>
        )}

        {/* Footer con pulsanti di scelta e NFC info */}
        <div className="mt-3 pt-3 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 mb-2">
            Inquadra il QR con la fotocamera <strong>oppure</strong> appoggia il telefono al tag NFC del mezzo.
          </p>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors tap-bounce border border-slate-700"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onManualSelectRequested();
              }}
              className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition-colors tap-bounce"
            >
              Scegli da Lista
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
