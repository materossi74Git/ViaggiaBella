import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  X,
  Download,
  QrCode,
  CheckCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Radio,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import QRCode from 'qrcode';

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
  const [showStepDetails, setShowStepDetails] = useState(false);
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
        {/* Intestazione Principale Chiaro e Pulito */}
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
            <span>Guida Installazione • Cooperativa Clarabella</span>
          </div>

          <h2 id="android-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-white pr-8">
            App Android ViaggiaBella
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-lg leading-relaxed">
            Scegli come utilizzare l'applicazione sullo smartphone o tablet degli autisti: scaricando direttamente il file <strong>APK nativo</strong> o utilizzandola come <strong>Web App immediata</strong>.
          </p>
        </div>

        {/* Corpo Contenuto con Scrolling Interno Ottimizzato */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-700">
          {/* Opzione 1: Download Diretto Pacchetto APK (La più richiesta per Android) */}
          <div className="rounded-2xl border-2 border-teal-500 bg-gradient-to-b from-teal-50/70 to-teal-50/20 p-4 sm:p-5 relative shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-700 text-white text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-teal-200" />
                Opzione 1 • Consigliata per gli Autisti
              </span>
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                Apertura istantanea NFC
              </span>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Scarica il File APK per Android</span>
              <ShieldCheck className="w-4 h-4 text-teal-600" />
            </h3>

            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Installando il file APK, quando l'autista tocca con il telefono la scheda NFC sul cruscotto del mezzo, <strong>l'app si apre subito in automatico</strong> con il veicolo selezionato, pronta per inserire i km o iniziare il viaggio!
            </p>

            {/* Pulsante Download Grande */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <a
                href="/viaggiabella.apk"
                download="ViaggiaBella-Clarabella.apk"
                className="flex-1 py-3.5 px-5 rounded-2xl bg-teal-700 hover:bg-teal-600 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-teal-700/25 transition-all flex items-center justify-center space-x-2.5 tap-bounce"
              >
                <Download className="w-5 h-5 text-teal-200" />
                <span>Scarica Pacchetto APK (.apk)</span>
              </a>

              <button
                type="button"
                onClick={() => setShowStepDetails(!showStepDetails)}
                className="px-3.5 py-3 rounded-2xl bg-white border border-teal-300 hover:bg-teal-50 text-teal-900 text-xs font-bold transition-colors flex items-center justify-center space-x-1 tap-bounce"
              >
                <span>{showStepDetails ? 'Nascondi passaggi' : 'Come installarlo'}</span>
                {showStepDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Dettagli Installazione Guidata in 3 Passi */}
            {showStepDetails && (
              <div className="mt-3.5 p-3.5 bg-white rounded-xl border border-teal-200/80 text-xs text-slate-700 space-y-2.5 animate-in fade-in duration-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-teal-700" />
                  <span>3 semplici passaggi per installare il file scaricato:</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-slate-600">
                  <li>
                    Tocca <strong>"Scarica Pacchetto APK"</strong>. Al termine del download, tocca la notifica di Android oppure apri la cartella <strong>Download</strong> del telefono.
                  </li>
                  <li>
                    Se compare l'avviso di sicurezza <em>"Installazione da origini sconosciute"</em>, tocca <strong>Impostazioni</strong> e attiva la spunta <strong>"Consenti da questa fonte"</strong>.
                  </li>
                  <li>
                    Tocca <strong>Installa</strong>. L'icona <em>ViaggiaBella</em> compare tra le applicazioni dello smartphone con fotocamera e NFC abilitati.
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Opzione 2: Installazione Web App (PWA) - Nessun download di file */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 relative">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-800 text-white text-[10px] font-extrabold uppercase tracking-wider mb-2">
              Opzione 2 • Utilizzo Immediato da Browser (Zero Download)
            </span>

            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Web App Progressiva (PWA)
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Non vuoi scaricare nessun file APK? Puoi aprire ViaggiaBella direttamente da <strong>Google Chrome</strong> o dal browser dello smartphone.
                </p>
                <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    Come salvare l'icona sul telefono dal browser:
                  </p>
                  <p className="text-[11px] text-slate-500">
                    1. Apri il link con Chrome • 2. Tocca i tre pallini in alto a destra <strong>(⋮)</strong> • 3. Seleziona <strong>"Aggiungi a schermata Home"</strong> o <strong>"Installa app"</strong>.
                  </p>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-sm transition-all active:scale-95 tap-bounce"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Link Copiato negli Appunti!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-600" />
                        <span>Copia Link per gli Autisti</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono bg-white px-2 py-1.5 rounded-lg border border-slate-200 truncate max-w-xs">
                    {currentUrl}
                  </span>
                </div>
              </div>

              {/* QR Code per inquadratura con fotocamera */}
              {qrDataUrl && (
                <div className="hidden sm:flex flex-col items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                  <img src={qrDataUrl} alt="QR Code ViaggiaBella" className="w-24 h-24 rounded-lg" />
                  <span className="text-[10px] font-bold text-slate-600 mt-1.5 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-teal-600" /> Inquadra col telefono
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Opzione 3: Come funziona con le schede NFC sui cruscotti */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 sm:p-5">
            <div className="flex items-center space-x-2 text-indigo-900 mb-1.5">
              <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
              <h3 className="font-bold text-sm">
                Come Funziona con il Tag NFC sul Cruscotto del Mezzo
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Basta avvicinare il retro dello smartphone al bollino o scheda NFC posizionata a bordo veicolo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-emerald-200 text-emerald-950">
                <div className="font-bold flex items-center gap-1 text-emerald-900 mb-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Con l'APK installata:</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Android riconosce la scheda e apre l'applicazione all'istante, con il mezzo selezionato e le scelte per iniziare il viaggio o segnare i km.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-teal-200 text-teal-950">
                <div className="font-bold flex items-center gap-1 text-teal-900 mb-0.5">
                  <Info className="w-3.5 h-3.5 text-teal-600" />
                  <span>Senza l'APK (solo Web):</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Android apre la pagina web nel browser, offrendo di scaricare l'APK oppure di proseguire subito via Web.
                </p>
              </div>
            </div>
          </div>

          {/* Opzione Avanzata: PWABuilder online */}
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-800">Strumento Generazione PWABuilder (Avanzato):</span>
              <p className="text-[11px] text-slate-500">Per generare pacchetti Play Store (.aab / .apk) online con 1 click.</p>
            </div>
            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs tap-bounce shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>PWABuilder</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Footer con pulsante Chiudi chiaro e rassicurante */}
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
