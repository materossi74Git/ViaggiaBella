import React from 'react';
import {
  Globe,
  Smartphone,
  X,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { Vehicle } from '../../types';
import { FriendlyVanMascot } from './FriendlyVanMascot';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface NfcWelcomeInstallModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onProceedWeb: () => void;
  onClose: () => void;
}

export const NfcWelcomeInstallModal: React.FC<NfcWelcomeInstallModalProps> = ({
  vehicle,
  isOpen,
  onProceedWeb,
  onClose,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      // Se beforeinstallprompt non è disponibile, mostriamo le istruzioni immediate
      alert(
        "Per aggiungere ViaggiaBella alla schermata Home del telefono:\n\n1. Tocca i tre puntini (⋮) in alto a destra su Chrome\n2. Seleziona 'Installa app' oppure 'Aggiungi a schermata Home'\n3. Tocca 'Installa'"
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        {/* Header con mascotte */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 text-white flex items-start justify-between shrink-0 relative overflow-hidden">
          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
              <FriendlyVanMascot mood="driving" size="sm" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30 mb-0.5">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Scheda NFC Rilevata</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                {vehicle.name} • <span className="font-mono text-teal-300">{vehicle.plate}</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors tap-bounce relative z-10"
            aria-label="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messaggio contestuale */}
        <div className="px-5 py-3.5 bg-teal-50 border-b border-teal-100 text-xs text-teal-950 flex items-start space-x-2.5 shrink-0">
          <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Hai avvicinato il telefono al tag NFC di questo mezzo. Puoi iniziare subito a registrare il viaggio oppure installare l'app sulla schermata del telefono in 1 tocco!
          </p>
        </div>

        {/* Opzioni di Scelta */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* SCELTA 1: PROSEGUI SUBITO CON IL MEZZO */}
          <div className="p-4 rounded-2xl border-2 border-teal-600 bg-teal-50/50 space-y-3 relative overflow-hidden">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-md bg-teal-700 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1">
                Azione Immediata
              </span>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Apri e Registra Subito il Mezzo</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Accedi subito con la scheda di {vehicle.name} già caricata, pronta per registrare i km iniziali o finali.
              </p>
            </div>

            <button
              type="button"
              onClick={onProceedWeb}
              className="w-full py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-600 active:scale-98 text-white font-extrabold text-xs shadow-md shadow-teal-700/20 transition-all flex items-center justify-center space-x-2 tap-bounce"
            >
              <span>Continua con {vehicle.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* SCELTA 2: INSTALLA APP SULLA SCHERMATA HOME */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1">
                Installazione Rapida
              </span>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Installa l'App sullo Smartphone</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Aggiunge l'icona ufficiale di <em>ViaggiaBella</em> sulla schermata Home del telefono. Non richiede download di file esterni né permessi particolari.
              </p>
            </div>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 active:scale-98 text-slate-800 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 tap-bounce shadow-xs"
            >
              <Download className="w-4 h-4 text-teal-600" />
              <span>{isInstalled ? 'App Già Installata' : 'Aggiungi alla Schermata Home'}</span>
            </button>

            <p className="text-[11px] text-slate-500 text-center">
              Oppure tocca i <strong>tre puntini (⋮)</strong> di Chrome in alto a destra → <strong>Installa app</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Cooperativa Sociale Clarabella
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold tap-bounce"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
