import React, { useState } from 'react';
import {
  Download,
  Sparkles,
  X,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { RemoteVersionInfo, triggerApkDownload, APP_INFO } from '../../services/appUpdateService';
import { FriendlyVanMascot } from './FriendlyVanMascot';

export type UpdateModalViewMode = 'idle' | 'checking' | 'update_available' | 'up_to_date' | 'error';

interface AppUpdateModalProps {
  isOpen: boolean;
  viewMode: UpdateModalViewMode;
  updateInfo: RemoteVersionInfo | null;
  currentVersion?: string;
  currentVersionCode?: number;
  checkedAt?: string;
  errorMessage?: string;
  isMandatory?: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  viewMode,
  updateInfo,
  currentVersion = APP_INFO.version,
  currentVersionCode = APP_INFO.versionCode,
  checkedAt,
  errorMessage,
  isMandatory = false,
  onClose,
  onRetry,
}) => {
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setDownloadStarted(true);
    triggerApkDownload(updateInfo?.apkUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (!isMandatory && viewMode !== 'checking' && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-slate-900">
        
        {/* ============================================================== */}
        {/* 1. STATO: VERIFICA IN CORSO (CHECKING)                         */}
        {/* ============================================================== */}
        {viewMode === 'checking' && (
          <div>
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-300 animate-spin" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">
                Verifica Aggiornamenti
              </h2>
              <p className="text-xs text-teal-100/90 mt-1">
                Connessione al server delle versioni in corso...
              </p>
            </div>

            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-slate-600">
                Stiamo controllando se è presente una nuova versione APK di <strong>ViaggiaBella</strong>.
              </p>
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px]">
                <span>Versione attuale: v{currentVersion} (build {currentVersionCode})</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. STATO: VERSIONE CORRENTE GIA' AGGIORNATA (UP_TO_DATE)       */}
        {/* ============================================================== */}
        {viewMode === 'up_to_date' && (
          <div>
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-5 text-white flex items-start justify-between relative overflow-hidden">
              <div className="flex items-center space-x-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                </div>
                <div>
                  <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/40 mb-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>Ultima Versione</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                    La versione corrente è già aggiornata
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors tap-bounce relative z-10"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl text-emerald-950 space-y-2">
                <div className="font-extrabold text-sm text-emerald-900 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Nessun aggiornamento necessario</span>
                </div>
                <p className="text-xs text-emerald-900/90 leading-relaxed">
                  Stai già utilizzando l'ultima versione disponibile di <strong>ViaggiaBella</strong> (<strong>v{currentVersion}</strong>, build {currentVersionCode}).
                </p>
              </div>

              {/* Dettagli della build attuale */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-slate-700">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Versione installata:</span>
                  <span className="font-bold text-slate-900">v{currentVersion}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Codice build:</span>
                  <span className="font-bold text-slate-900">build {currentVersionCode}</span>
                </div>
                {checkedAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Ultima verifica:</span>
                    <span className="text-slate-600 font-medium">Oggi, {checkedAt}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-normal text-center">
                Tutte le funzionalità di gestione viaggi, avvio immediato e sincronizzazione sono allineate.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all tap-bounce shadow-xs"
              >
                Perfetto, ho capito
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. STATO: AGGIORNAMENTO DISPONIBILE (UPDATE_AVAILABLE)          */}
        {/* ============================================================== */}
        {viewMode === 'update_available' && updateInfo && (
          <div>
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-5 text-white flex items-start justify-between relative overflow-hidden">
              <div className="flex items-center space-x-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white shrink-0">
                  <FriendlyVanMascot mood="driving" size="sm" />
                </div>
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/40 mb-1">
                    <Sparkles className="w-3 h-3 text-emerald-300" />
                    <span>Nuovo Aggiornamento</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                    Trovato nuovo aggiornamento disponibile!
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

            <div className="p-5 space-y-4 text-xs">
              {/* Confronto versioni */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Installata</span>
                  <strong className="text-slate-700">v{currentVersion} (build {currentVersionCode})</strong>
                </div>
                <ArrowRight className="w-4 h-4 text-teal-700 shrink-0" />
                <div className="text-right">
                  <span className="text-emerald-700 font-bold block text-[10px] uppercase">Nuova versione</span>
                  <strong className="text-teal-800 font-bold">v{updateInfo.version} (build {updateInfo.versionCode})</strong>
                </div>
              </div>

              {/* Note di rilascio */}
              {updateInfo.releaseNotes && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                    Novità di questa versione:
                  </div>
                  <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl text-teal-950 text-xs leading-relaxed">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              {/* Istruzioni aggiornamento */}
              <div className="p-3.5 bg-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-2">
                <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                  <span>Come installare l'aggiornamento:</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Tocca <strong>"Scarica e Aggiorna Ora"</strong> qui sotto.</li>
                  <li>Al termine del download, apri il file scaricato sul telefono.</li>
                  <li>Android chiederà <em>"Vuoi installare un aggiornamento?"</em>: tocca <strong>Aggiorna</strong>. I tuoi dati resteranno intatti nel cloud.</li>
                </ol>
                <div className="pt-1 border-t border-slate-200/80 text-[10.5px] text-amber-800 bg-amber-50/70 p-2 rounded-xl">
                  <strong>💡 Errore &quot;pacchetto in conflitto&quot;?</strong> Disinstalla prima la vecchia app dal telefono e poi tocca Installa. Nessun dato andrà perso perché viaggi e mezzi sono sincronizzati al sicuro su Firebase!
                </div>
              </div>

              {downloadStarted && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Download avviato! Controlla la barra delle notifiche di Android.</span>
                </div>
              )}
            </div>

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
        )}

        {/* ============================================================== */}
        {/* 4. STATO: ERRORE O SERVER NON RAGGIUNGIBILE (ERROR)            */}
        {/* ============================================================== */}
        {viewMode === 'error' && (
          <div>
            <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 p-5 text-white flex items-start justify-between relative overflow-hidden">
              <div className="flex items-center space-x-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-white shrink-0">
                  <AlertCircle className="w-7 h-7 text-amber-300" />
                </div>
                <div>
                  <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold border border-amber-400/40 mb-1">
                    <span>Avviso</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                    Impossibile verificare gli aggiornamenti
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors tap-bounce relative z-10"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                <div className="font-bold text-amber-900">
                  Connessione al server non riuscita
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  {errorMessage || 'Non è stato possibile contattare il server delle versioni. Potrebbe trattarsi di un calo momentaneo della rete o segnale assente.'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">Versione attualmente installata: </span>
                <span className="font-mono">v{currentVersion} (build {currentVersionCode})</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors tap-bounce"
              >
                Chiudi
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs transition-all flex items-center space-x-1.5 tap-bounce shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Riprova adesso</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
