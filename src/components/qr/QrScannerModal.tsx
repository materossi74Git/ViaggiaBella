import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertTriangle, CheckCircle2, Radio } from 'lucide-react';
import { Vehicle } from '../../types';

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-camera-stream';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsInitializing(true);
    setErrorMsg(null);
    setIdentifiedVehicle(null);

    const initScanner = async () => {
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
            if (!isMounted) return;
            handleDecodedText(decodedText);
          },
          () => {
            // Errori per frame senza QR ignorabili
          }
        );

        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (err: any) {
        console.error('Errore avvio fotocamera:', err);
        if (isMounted) {
          setIsInitializing(false);
          setErrorMsg(
            'Impossibile accedere alla fotocamera. Verifica i permessi o utilizza la selezione manuale del veicolo.'
          );
        }
      }
    };

    const timer = setTimeout(() => {
      initScanner();
    }, 200);

    // Inizializza anche il lettore Web NFC se supportato dal dispositivo (Chrome su Android)
    let nfcAbortController: AbortController | null = null;
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      try {
        const ndef = new (window as any).NDEFReader();
        nfcAbortController = new AbortController();
        ndef.scan({ signal: nfcAbortController.signal })
          .then(() => {
            ndef.onreading = (event: any) => {
              if (!isMounted) return;
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
      isMounted = false;
      clearTimeout(timer);
      if (nfcAbortController) {
        try {
          nfcAbortController.abort();
        } catch (e) {}
      }
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        }).catch(() => {});
      }
    };
  }, [isOpen]);

  const handleDecodedText = (text: string) => {
    // Il codice può contenere l'ID del veicolo, il qrCodeId, nfcTagId o un URL/Deep Link
    let target = text.trim();
    if (target.includes('vehicleId=')) {
      const match = target.match(/vehicleId=([^&]+)/);
      if (match) target = match[1];
    } else if (target.includes('qr=')) {
      const match = target.match(/qr=([^&]+)/);
      if (match) target = match[1];
    } else if (target.includes('nfc=')) {
      const match = target.match(/nfc=([^&]+)/);
      if (match) target = match[1];
    } else if (target.startsWith('viaggiabella://vehicle/')) {
      target = target.replace('viaggiabella://vehicle/', '');
    } else if (target.startsWith('viaggiabella://')) {
      target = target.replace('viaggiabella://', '');
    }

    // Cerca veicolo corrispondente
    const found = vehicles.find(
      v =>
        v.id === target ||
        v.qrCodeId === target ||
        v.nfcTagId === target ||
        v.plate.replace(/\s+/g, '').toUpperCase() === target.replace(/\s+/g, '').toUpperCase()
    );

    if (found) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }
      setIdentifiedVehicle(found);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      setTimeout(() => {
        onVehicleIdentified(found);
        onClose();
      }, 700);
    } else {
      setErrorMsg(`Codice letto: "${text}". Nessun mezzo registrato corrisponde a questo identificativo.`);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl text-white overflow-hidden relative my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-sm leading-tight">Riconoscimento Mezzo</h3>
              <div className="flex items-center space-x-1.5 text-[10px] text-teal-400 font-medium">
                <span>Fotocamera QR</span>
                <span>•</span>
                <span className="flex items-center gap-0.5"><Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> Sensore NFC</span>
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

        {/* Viewport fotocamera */}
        <div className="relative mt-4 rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border border-slate-800">
          <div id={readerElementId} className="w-full h-full object-cover" />

          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center p-4">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-2" />
              <p className="text-xs text-slate-300">Avvio fotocamera dello smartphone...</p>
            </div>
          )}

          {identifiedVehicle && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-center p-4 animate-in fade-in zoom-in duration-200">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-2" />
              <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">Mezzo Identificato</div>
              <div className="text-lg font-bold text-white mt-1">{identifiedVehicle.name}</div>
              <div className="text-xs text-emerald-200 mt-0.5">Targa: {identifiedVehicle.plate}</div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

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
    </div>
  );
};
