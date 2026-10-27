import React, { useState, useEffect } from 'react';
import { Send, X, AlertCircle, FileQuestion, CheckCircle2 } from 'lucide-react';
import { VehicleUsage, AppUser } from '../../types';
import { createCorrectionRequest } from '../../services/dbService';

interface CorrectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  usage: VehicleUsage | null;
  driver: AppUser;
  onSubmitted: () => void;
}

export const CorrectionRequestModal: React.FC<CorrectionRequestModalProps> = ({
  isOpen,
  onClose,
  usage,
  driver,
  onSubmitted,
}) => {
  const [reason, setReason] = useState('');
  const [desiredChanges, setDesiredChanges] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  if (!isOpen || !usage) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!reason.trim()) {
      setErrorMsg('Inserisci il motivo della richiesta.');
      return;
    }

    if (!desiredChanges.trim()) {
      setErrorMsg('Descrivi chiaramente i dati da correggere.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createCorrectionRequest({
        usage,
        driver,
        reason,
        desiredChanges,
      });

      setSuccess(true);
      setTimeout(() => {
        onSubmitted();
        onClose();
        setSuccess(false);
        setReason('');
        setDesiredChanges('');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante l\'invio della richiesta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Intestazione Compatta */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <FileQuestion className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                Richiesta di Rettifica
              </h3>
              <p className="text-[11px] text-slate-500">
                Finestra 30 min scaduta: inoltro all'amministrazione
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors tap-bounce"
            title="Chiudi finestra (Esc)"
            aria-label="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Modale Scorrevole */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Info registrazione */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-900">{usage.vehicleName} ({usage.vehiclePlate})</div>
            <div className="text-slate-600">
              Data: <strong>{usage.usageDate}</strong> · Ore {usage.startTime} - {usage.endTime || 'In corso'}
            </div>
            <div className="text-slate-600">
              Destinazione: {usage.destination} · Km percorsi: {usage.distanceKm || 0} km
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="my-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center animate-in zoom-in duration-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-1.5" />
              <h4 className="font-bold text-emerald-900 text-sm">Richiesta Inviata!</h4>
              <p className="text-[11px] text-emerald-700 mt-1">
                L'amministratore esaminerà la richiesta e applicherà la rettifica autorizzata.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="correction-form" className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo della richiesta *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Es. Errore di battitura chilometri finali..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descrizione modifiche desiderate *
                </label>
                <textarea
                  rows={2}
                  value={desiredChanges}
                  onChange={e => setDesiredChanges(e.target.value)}
                  placeholder="Indica i valori corretti da sostituire (es. Km finali effettivi 48.350 anziché 48.250)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  required
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer Fisso con Annulla + Invia */}
        {!success && (
          <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors tap-bounce"
            >
              Annulla
            </button>
            <button
              type="submit"
              form="correction-form"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5 tap-bounce disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-slate-950" />
              <span>{isSubmitting ? 'Invio...' : 'Invia all\'Amministrazione'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
