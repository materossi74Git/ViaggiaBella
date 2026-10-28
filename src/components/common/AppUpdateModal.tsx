import React, { useState } from 'react';
import { Download, Sparkles, X, CheckCircle2, ArrowRight, Smartphone, AlertCircle } from 'lucide-react';
import { RemoteVersionInfo, triggerApkDownload, APP_INFO } from '../../services/appUpdateService';
import { FriendlyVanMascot } from './FriendlyVanMascot';

interface AppUpdateModalProps {
  isOpen: boolean;
  updateInfo: RemoteVersionInfo | null;
  onClose: () => void;
  isMandatory?: boolean;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  updateInfo,
  onClose,
  isMandatory = false,
}) => {
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen || !updateInfo) return null;

  const handleDownload = () => {
    setDownloadStarted(true);
    triggerApkDownload(updateInfo.apkUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (!isMandatory && e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-slate-900">
        {/* Header con gradiente Cooperativa */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-5 text-white flex items-start justify-between relative overflow-hidden">
          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white shrink-0">
              <FriendlyVanMascot mood="driving" size="sm" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/40 mb-1">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span>Aggiornamento Disponibile</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white leading-tight">
                Nuova Versione {updateInfo.version}
              </h2>
            </div>
          </div>

          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors tap-bounce relative z-10"
              aria-label="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Corpo informativo */}
        <div className="p-5 space-y-4 text-xs">
          {/* Badge di versione */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Installata</span>
              <strong className="text-slate-700">v{APP_INFO.version} (build {APP_INFO.versionCode})</strong>
            </div>
            <ArrowRight className="w-4 h-4 text-teal-700 shrink-0" />
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase">Nuova</span>
              <strong className="text-teal-800 font-bold">v{updateInfo.version} (build {updateInfo.versionCode})</strong>
            </div>
          </div>

          {/* Note di rilascio */}
          {updateInfo.releaseNotes && (
            <div className="space-y-1.5">
              <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                Novità di questo aggiornamento:
              </div>
              <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl text-teal-950 text-xs leading-relaxed">
                {updateInfo.releaseNotes}
              </div>
            </div>
          )}

          {/* Guida semplice al download */}
          <div className="p-3.5 bg-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Smartphone className="w-3.5 h-3.5 text-teal-700" />
              <span>Come si aggiorna:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Tocca <strong>"Scarica e Aggiorna Ora"</strong> qui sotto.</li>
              <li>Quando il download termina, tocca la notifica o apri il file scaricato.</li>
              <li>Android mostrerà <em>"Vuoi installare un aggiornamento?"</em>: tocca <strong>Aggiorna</strong>. I tuoi viaggi e impostazioni rimarranno intatti!</li>
            </ol>
          </div>

          {downloadStarted && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Download avviato! Controlla la barra delle notifiche del telefono.</span>
            </div>
          )}
        </div>

        {/* Footer con pulsante di download */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center space-x-2.5">
          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors tap-bounce"
            >
              Più tardi
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 min-h-[46px] py-3 px-4 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-black text-xs sm:text-sm transition-all shadow-md shadow-teal-900/20 flex items-center justify-center space-x-2 tap-bounce"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{downloadStarted ? 'Scarica di Nuovo APK' : 'Scarica e Aggiorna Ora'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
