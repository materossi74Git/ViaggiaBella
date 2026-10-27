import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  X,
  QrCode,
  CheckCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Radio,
  Layers,
  Sparkles,
  Info,
  Download,
  AlertTriangle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface AndroidAppGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppGuideModal: React.FC<AndroidAppGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Genera QR Code per la condivisione istantanea
  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [isOpen, currentUrl]);

  // Blocca lo scroll del body quando la modale è aperta
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Gestione chiusura con tasto ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTriggerInstall = async () => {
    if (isInstallable) {
      await install();
    }
  };

  const pwaBuilderUrl = `https://www.pwabuilder.com?site=${encodeURIComponent(currentUrl)}`;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-modal-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Intestazione */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-5 sm:p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all tap-bounce"
            aria-label="Chiudi finestra guida Android"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 mb-2.5">
            <Smartphone className="w-3.5 h-3.5 text-teal-400" />
            <span>Guida Installazione Android • Cooperativa Clarabella</span>
          </div>

          <h2 id="android-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-white pr-8">
            Installazione di ViaggiaBella sullo Smartphone
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-lg leading-relaxed">
            Come installare l'applicazione in 2 secondi sul telefono degli autisti con supporto completo a NFC e fotocamera QR.
          </p>
        </div>

        {/* Corpo Contenuto con Scrolling Interno */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-700">
          
          {/* Box Informativo: Spiegazione Errore Analisi Pacchetto APK */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-2">
            <div className="flex items-center space-x-2 font-extrabold text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Ti è comparso l'avviso "Errore durante l'analisi del pacchetto"?</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Questo errore accade su Android quando si tenta di aprire un file scaricato manualmente non compilato o non autorizzato dal sistema operativo. 
              <strong> Non serve scaricare nessun file APK manuale!</strong> ViaggiaBella è progettata per installarsi direttamente e in sicurezza da Google Chrome in 2 secondi tramite la procedura ufficiale qui sotto.
            </p>
          </div>

          {/* Metodo Ufficiale e Consigliato: Installazione PWA Diretta da Chrome */}
          <div className="rounded-2xl border-2 border-teal-500 bg-gradient-to-b from-teal-50/60 to-white p-4 sm:p-5 relative shadow-sm space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-700 text-white text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-teal-200" />
                Procedura Ufficiale Consigliata (100% Funzionante)
              </span>
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                Nessun errore di sistema
              </span>
            </div>

            <h3 className="text-base font-extrabold text-slate-900">
              Aggiungi ViaggiaBella alla Schermata Home di Android
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              L'applicazione viene installata sul telefono come app nativa vera e propria: compare l'icona sul drawer, funziona a schermo intero senza barre del browser e riceve aggiornamenti automatici senza dover reinstallare nulla.
            </p>

            {/* Pulsante Installazione Rapida se supportato dal browser */}
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={handleTriggerInstall}
                className="w-full py-3.5 px-5 rounded-2xl bg-teal-700 hover:bg-teal-600 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-teal-700/25 transition-all flex items-center justify-center space-x-2.5 tap-bounce"
              >
                <Download className="w-5 h-5 text-teal-200" />
                <span>Tocca qui per Installare l'App su questo Dispositivo</span>
              </button>
            )}

            {isInstalled && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>L'applicazione risulta già installata come app sul dispositivo!</span>
              </div>
            )}

            {/* Istruzioni Passo-Passo per Chrome */}
            <div className="p-4 bg-white rounded-xl border border-teal-200 text-xs text-slate-700 space-y-2.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-teal-700" />
                <span>Come fare dallo smartphone con Google Chrome (in 10 secondi):</span>
              </div>
              <ol className="list-decimal pl-5 space-y-2 text-[12px] text-slate-700">
                <li>
                  Apri il link di ViaggiaBella sul browser <strong>Google Chrome</strong> dello smartphone.
                </li>
                <li>
                  Tocca il menu in alto a destra con i <strong>tre puntini verticali (⋮)</strong> di Chrome.
                </li>
                <li>
                  Seleziona la voce <strong>"Installa app"</strong> (oppure <strong>"Aggiungi a schermata Home"</strong>).
                </li>
                <li>
                  Conferma con <strong>Installa</strong>. L'icona <em>ViaggiaBella</em> apparirà subito tra le applicazioni del telefono.
                </li>
              </ol>
            </div>

            {/* Condivisione link e QR */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-teal-100">
              <div className="flex-1">
                <span className="text-[11px] font-bold text-slate-700">Invia il link agli autisti:</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-xs transition-all active:scale-95 tap-bounce"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Link Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Copia Link</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono bg-white px-2 py-1 rounded-lg border border-slate-200 truncate max-w-[200px] sm:max-w-xs">
                    {currentUrl}
                  </span>
                </div>
              </div>

              {qrDataUrl && (
                <div className="hidden sm:flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200 shadow-xs shrink-0">
                  <img src={qrDataUrl} alt="QR Code ViaggiaBella" className="w-16 h-16 rounded-md" />
                  <div className="text-[10px] text-slate-600 leading-tight">
                    <p className="font-bold flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-teal-600" /> Inquadra col telefono
                    </p>
                    <p className="text-slate-400 mt-0.5">per aprirlo subito in Chrome</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Come funziona il tocco della scheda NFC */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 sm:p-5 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-900">
              <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
              <h3 className="font-bold text-sm">
                Cosa succede quando l'autista tocca la scheda NFC del mezzo?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Una volta aggiunta l'app alla schermata Home, quando l'autista tocca con il retro dello smartphone la scheda NFC programmata sul cruscotto:
            </p>
            <div className="p-3 bg-white rounded-xl border border-indigo-100 text-xs text-slate-700">
              <span className="font-bold text-indigo-950">Apertura immediata del mezzo:</span> lo smartphone rileva il tag e apre direttamente la schermata di <em>ViaggiaBella</em> con il veicolo e la targa già selezionati, pronto per registrare i km iniziali o avviare il viaggio.
            </div>
          </div>

          {/* Opzione Sviluppatori / PWABuilder */}
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-800">Vuoi comunque un file APK compilato per Google Play Store?</span>
              <p className="text-[11px] text-slate-500">
                Puoi generare un file .apk o pacchetto .aab con 1 click tramite lo strumento ufficiale PWABuilder di Microsoft.
              </p>
            </div>
            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs tap-bounce shrink-0 shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Apri PWABuilder</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Cooperativa Sociale Clarabella • ViaggiaBella
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs shadow-sm transition-all tap-bounce"
          >
            Chiudi Finestra
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
