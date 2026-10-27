import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  X,
  Download,
  QrCode,
  CheckCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
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
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

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

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const pwaBuilderUrl = `https://www.pwabuilder.com?site=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 mb-2">
            <Smartphone className="w-3.5 h-3.5 text-teal-400" />
            <span>Versione Mobile • Cooperativa Clarabella</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            ViaggiaBella su Smartphone Android
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            Hai a disposizione sia la <strong>Web App accessibile da browser</strong> (perfetta per il backoffice su PC) sia l'<strong>App installabile</strong> per gli autisti.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-700">
          {/* Opzione 1: Installazione Istantanea PWA (Raccomandata per gli autisti) */}
          <div className="rounded-2xl border-2 border-teal-500/30 bg-teal-50/40 p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                  Metodo 1 • Più Veloce (Nessun APK da inviare)
                </span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Installazione Immediata PWA (Progressive Web App)</span>
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  L'autista apre il link dal browser dello smartphone (Chrome/Samsung Internet) e tocca <strong>"Installa applicazione"</strong>. L'icona <em>ViaggiaBella</em> compare nella schermata delle app, funziona a schermo intero e si aggiorna da sola in tempo reale.
                </p>
              </div>

              {qrDataUrl && (
                <div className="hidden sm:flex flex-col items-center bg-white p-2.5 rounded-xl border border-teal-200 shadow-sm shrink-0">
                  <img src={qrDataUrl} alt="QR Code ViaggiaBella" className="w-24 h-24 rounded-lg" />
                  <span className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                    <QrCode className="w-3 h-3" /> Inquadra
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-teal-200/60 flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleCopyLink}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-teal-300 hover:bg-teal-100/50 text-teal-900 font-bold text-xs shadow-sm transition-all active:scale-95"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Link Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-teal-700" />
                    <span>Copia Link per gli Autisti</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-slate-500 font-mono bg-white/70 px-2.5 py-1.5 rounded-lg border border-teal-200/50 truncate max-w-xs">
                {currentUrl}
              </span>
            </div>
          </div>

          {/* Opzione 2: Pacchetto APK Standalone per Android */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-800 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
              Metodo 2 • Pacchetto APK Nativo
            </span>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Generazione del Pacchetto APK Android</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Il progetto è ora configurato con <strong>Capacitor</strong> e la cartella nativa Android (<code>/android</code>) con package <code>it.coopclarabella.viaggiabella</code>, fotocamera e NFC inclusi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {/* Opzione 2A: Download Diretto APK */}
              <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>Download Diretto APK Android</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Scarica direttamente il file <code className="font-mono bg-slate-100 px-1 rounded">ViaggiaBella-Clarabella.apk</code> pronto per l'installazione su qualsiasi smartphone Android.
                  </p>
                </div>
                <a
                  href="/viaggiabella.apk"
                  download="ViaggiaBella-Clarabella.apk"
                  className="mt-3 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-colors tap-bounce"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica File APK (.apk)</span>
                </a>
              </div>

              {/* Opzione 2B: PWABuilder (1-Click APK Online) */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Generazione Online (PWABuilder)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Genera il pacchetto APK firmato o Google Play Store pronto online in 1 minuto.
                  </p>
                </div>
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  <span>Genera su PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Opzione 3: Configurazione Tag NFC per Apertura Automatica e Download */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 sm:p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-700 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
              Automazione NFC • Apertura al Tocco & Download
            </span>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Come Scrivere le Schede NFC e Come Funzionano</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Acquista normali adesivi NFC (formato <strong>NTAG213, NTAG215 o NTAG216</strong>, costo ~0,50€ l'uno). Puoi scriverli direttamente dalla schermata <strong>Parco Mezzi</strong> cliccando <strong>"Scrivi NFC"</strong> oppure con l'app gratuita <strong>NFC Tools</strong>.
            </p>
            <div className="mt-3 bg-white p-3.5 rounded-xl border border-indigo-100 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-semibold text-slate-900">Formato Universale Scritto sulla Scheda:</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">URL + AAR</span>
              </div>
              <div className="font-mono text-[11px] bg-slate-900 text-indigo-300 p-2 rounded-lg break-all select-all">
                {currentUrl}/?vehicleId=ID_MEZZO&source=nfc
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <strong>✅ Se l'APK è già installata:</strong>
                  <p className="mt-0.5 text-emerald-800">
                    Android lancia all'istante l'app col mezzo selezionato, mostrando subito la scelta <em>"Inizia Viaggio ORA"</em> o <em>"Inserisci Utilizzo manuale"</em>!
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-950">
                  <strong>📥 Se l'APK non è installata:</strong>
                  <p className="mt-0.5 text-teal-800">
                    Android apre la pagina web chiedendo all'autista se vuole <em>scaricare l'APK</em> oppure <em>proseguire con la modalità Web (PWA)</em>!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sintesi Architetturale */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
            <div className="font-bold flex items-center gap-1.5 text-emerald-900 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Sincronizzazione Unificata al 100%</span>
            </div>
            Sia che gli operatori aprano la <strong>Web App da computer</strong>, installino la <strong>PWA dal browser del cellulare</strong> o installino il <strong>pacchetto APK</strong>, il database Firestore utilizzato è il medesimo: tutti i dati su km, uscite, rientri e scadenze sono sincronizzati all'istante per tutti!
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
