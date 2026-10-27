import React, { useState } from 'react';
import {
  Download,
  Globe,
  Smartphone,
  X,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Vehicle } from '../../types';
import { FriendlyVanMascot } from './FriendlyVanMascot';

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
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const pwaBuilderUrl = `https://www.pwabuilder.com?site=${encodeURIComponent(currentOrigin)}`;
  const deepLink = `viaggiabella://vehicle/${encodeURIComponent(vehicle.id)}`;

  const handleDownloadApk = () => {
    setDownloadStarted(true);
    setShowInstallGuide(true);
    // Avvia il download del pacchetto APK configurato
    const link = document.createElement('a');
    link.href = '/viaggiabella.apk';
    link.download = `ViaggiaBella-Clarabella.apk`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInInstalledApp = () => {
    // Prova ad aprire lo schema nativo dell'app installata
    window.location.href = deepLink;
    setTimeout(() => {
      // Se dopo 1,5 secondi siamo ancora qui, informiamo l'utente
      alert("Se l'app non si apre, significa che il file APK non è ancora installato su questo smartphone. Puoi scaricarlo dal pulsante verde.");
    }, 1500);
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
        {/* Header con mascotte amichevole */}
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
            Hai appoggiato il telefono sulla scheda NFC del mezzo. Al momento stai navigando tramite browser. <strong>Come preferisci proseguire?</strong>
          </p>
        </div>

        {/* Opzioni di Scelta: APK vs Web PWA */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* SCELTA 1: SCARICA APK ANDROID (Richiesta specifica dell'utente) */}
          <div className="p-4 rounded-2xl border-2 border-teal-600 bg-teal-50/40 space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-teal-700 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  Consigliato per apertura istantanea
                </span>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span>Scarica e Installa l'App Android (APK)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  Installando l'applicazione sul telefono, al prossimo tocco della scheda NFC sul cruscotto <strong>l'app si aprirà da sola al volo</strong> senza più passare dal browser!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadApk}
              className="w-full py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-600 active:scale-98 text-white font-extrabold text-xs shadow-md shadow-teal-700/20 transition-all flex items-center justify-center space-x-2 tap-bounce"
            >
              <Download className="w-4 h-4" />
              <span>{downloadStarted ? 'Scarica Nuovamente APK' : 'Scarica File APK per Android'}</span>
            </button>

            {downloadStarted && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Download avviato! Controlla la tendina delle notifiche del telefono.</span>
              </div>
            )}

            {/* Toggle Guida Installazione 3 Passaggi */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowInstallGuide(!showInstallGuide)}
                className="text-[11px] font-bold text-teal-800 hover:text-teal-950 flex items-center space-x-1"
              >
                <span>{showInstallGuide ? 'Nascondi istruzioni' : 'Come installare il file scaricato in 3 passaggi'}</span>
                {showInstallGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showInstallGuide && (
                <div className="mt-2.5 p-3 rounded-xl bg-white border border-teal-200 text-xs text-slate-700 space-y-2 animate-in fade-in">
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                    <li>
                      Apri il file scaricato <code className="font-mono bg-slate-100 px-1 rounded font-bold">ViaggiaBella-Clarabella.apk</code> dalle notifiche di Android o dalla cartella Download.
                    </li>
                    <li>
                      Se Android mostra <em>"Installazione da fonti sconosciute bloccata"</em>, tocca <strong>Impostazioni</strong> e spunta <strong>"Consenti da questa fonte"</strong> (Chrome).
                    </li>
                    <li>
                      Tocca <strong>Installa</strong>. Fatto! L'icona ViaggiaBella sarà pronta sul tuo telefono.
                    </li>
                  </ol>
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span>In alternativa: pacchetto online</span>
                    <a
                      href={pwaBuilderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-teal-700 hover:underline flex items-center gap-0.5"
                    >
                      <span>Genera su PWABuilder</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SCELTA 2: PROSEGUI CON MODALITÀ WEB (PWA) */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors space-y-2.5">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1">
                Subito Pronto • Zero Download
              </span>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Prosegui con la modalità Web (PWA)</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Accedi subito con il mezzo selezionato senza installare file esterni. Potrai anche salvarla come icona sulla schermata Home quando vuoi.
              </p>
            </div>

            <button
              type="button"
              onClick={onProceedWeb}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs transition-all flex items-center justify-center space-x-1.5 tap-bounce shadow-sm"
            >
              <span>Continua via Web con {vehicle.name}</span>
              <ArrowRight className="w-4 h-4 text-teal-300" />
            </button>
          </div>

          {/* SCELTA 3: HAI GIÀ L'APP INSTALLATA? */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Hai già l'APK sul telefono?</span>
              <div className="text-[11px] text-slate-500">Apri subito l'applicazione nativa</div>
            </div>
            <button
              type="button"
              onClick={handleOpenInInstalledApp}
              className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 tap-bounce"
            >
              Apri nell'App
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">Cooperativa Clarabella</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs tap-bounce transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
