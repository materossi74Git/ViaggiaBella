import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  X,
  CheckCircle2,
  Download,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { FriendlyVanMascot } from './FriendlyVanMascot';
import { getInstalledVersionDetails, InstalledAppVersionDetails, BUILD_DATE } from '../../services/deviceVersionService';
import { triggerApkDownload, APP_INFO } from '../../services/appUpdateService';

interface AppVersionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckUpdates?: () => void;
  isCheckingUpdates?: boolean;
}

export const AppVersionInfoModal: React.FC<AppVersionInfoModalProps> = ({
  isOpen,
  onClose,
  onCheckUpdates,
  isCheckingUpdates = false,
}) => {
  const [versionDetails, setVersionDetails] = useState<InstalledAppVersionDetails>({
    version: APP_INFO.version,
    versionCode: APP_INFO.versionCode,
    appName: APP_INFO.appName,
    buildDate: BUILD_DATE,
    isNativeApk: false,
    isPWA: false,
    platformLabel: 'Browser Web',
    environmentDescription: 'Applicazione in esecuzione',
  });

  useEffect(() => {
    if (isOpen) {
      getInstalledVersionDetails().then(setVersionDetails);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-version-title"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200 text-slate-900">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all tap-bounce"
            aria-label="Chiudi finestra informazioni versione"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-950/50 border border-teal-400/30 shrink-0">
              <FriendlyVanMascot size="sm" mood="idle" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30 uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Cooperativa Clarabella</span>
              </div>
              <h2 id="app-version-title" className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>ViaggiaBella</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-teal-500/30 text-teal-200 border border-teal-400/40">
                  v{versionDetails.version}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Registro digitale e gestione flotta mezzi cooperativa
              </p>
            </div>
          </div>
        </div>

        {/* Contenuto Dettagli Versione */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          
          {/* Card Principale Versione Installata */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/80 via-emerald-50/40 to-slate-50 border border-teal-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span className="font-bold text-slate-900 text-sm">Versione Attualmente Installata</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs shadow-xs">
                v{versionDetails.version}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-teal-100 text-[11px]">
              <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100/80">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Codice Build</span>
                <span className="font-mono font-bold text-slate-900 text-xs">build {versionDetails.versionCode}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100/80">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Data Compilazione</span>
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {versionDetails.buildDate}
                </span>
              </div>
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-teal-100 flex items-start space-x-2.5">
              <Smartphone className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 text-xs">Tipo Installazione: </span>
                <strong className="text-teal-900">{versionDetails.platformLabel}</strong>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {versionDetails.environmentDescription}
                </p>
              </div>
            </div>
          </div>

          {/* Novità e Funzionalità Attive in questa Release */}
          <div className="space-y-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Funzionalità attive in questa versione (v{versionDetails.version})</span>
            </span>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-2 text-[11px] leading-relaxed">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                <p>
                  <strong>Partenza Immediata a GPS Spento:</strong> Il viaggio può essere avviato sempre e subito, senza blocchi anche se il GPS è disattivato o il segnale è assente al coperto.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                <p>
                  <strong>Sblocco Rapido PIN & Login Google:</strong> Supporto completo per l'autenticazione con account Google e sblocco con codice a 4 cifre per evitare disconnessioni sul mezzo.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                <p>
                  <strong>Modalità Rapida Senza Km Cruscotto:</strong> Registra la partenza con un tocco, i chilometri finali si inseriscono a fine turno o automaticamente da cronologia.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                <p>
                  <strong>Verifica Aggiornamenti In-App:</strong> Notifica immediata se è disponibile un nuovo file APK con download diretto sul dispositivo.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer con Azioni */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => triggerApkDownload()}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors tap-bounce"
            title="Scarica direttamente il file APK di installazione"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Scarica Pacchetto APK</span>
          </button>

          <div className="flex items-center space-x-2">
            {onCheckUpdates && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCheckUpdates();
                }}
                disabled={isCheckingUpdates}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all tap-bounce"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                <span>{isCheckingUpdates ? 'Verifica in corso...' : 'Verifica Aggiornamenti'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors tap-bounce"
            >
              Chiudi
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
