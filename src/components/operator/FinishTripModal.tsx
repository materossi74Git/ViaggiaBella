import React, { useState, useEffect } from 'react';
import { CheckCircle2, X, AlertTriangle, Gauge } from 'lucide-react';
import { VehicleUsage, AppUser } from '../../types';
import { finishTripWithButtons } from '../../services/dbService';

interface FinishTripModalProps {
  usage: VehicleUsage | null;
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  onTripFinished: () => void;
}

export const FinishTripModal: React.FC<FinishTripModalProps> = ({
  usage,
  isOpen,
  onClose,
  user,
  onTripFinished,
}) => {
  const [endKm, setEndKm] = useState<number>(0);
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (usage) {
      setEndKm(usage.startKm);
      setDestination(usage.destination || '');
      setReason(usage.reason || '');
      setNotes(usage.notes || '');
      setErrorMsg(null);
    }
  }, [usage]);

  if (!isOpen || !usage) return null;

  const calculatedDistance = Math.max(0, Number(endKm) - usage.startKm);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (Number(endKm) < usage.startKm) {
      setErrorMsg(
        `I chilometri finali (${endKm}) non possono essere inferiori a quelli iniziali (${usage.startKm}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await finishTripWithButtons({
        usage,
        user,
        endKm: Number(endKm),
        destination,
        reason,
        notes,
      });

      onTripFinished();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante la chiusura del viaggio.');
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
              <CheckCircle2 className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                Termina Viaggio
              </h3>
              <p className="text-[11px] text-slate-500">
                Inserisci i chilometri al rientro
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
        <form onSubmit={handleFinish} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Riepilogo Sintetico Viaggio */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900">{usage.vehicleName}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {usage.vehiclePlate} · Partenza: {usage.startTime}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Km iniziali</span>
                <div className="font-mono font-bold text-slate-800">{usage.startKm} km</div>
              </div>
            </div>

            {/* Chilometri Finali con calcolo km percorsi */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-amber-950">
                  Km Finali da Contachilometri *
                </label>
                <span className="text-xs font-mono font-bold text-teal-800">
                  +{calculatedDistance} km percorsi
                </span>
              </div>
              <input
                type="number"
                value={endKm}
                onChange={e => setEndKm(Number(e.target.value))}
                min={usage.startKm}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-base text-slate-900 bg-white"
                required
              />
            </div>

            {/* Destinazione effettiva */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Destinazione
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                required
              />
            </div>

            {/* Note chiusura */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Note / Anomalie (Facoltativo)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Es. Rifornimento effettuato, spia olio..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
              />
            </div>
          </div>

          {/* Footer Fisso con Annulla + Termina Viaggio */}
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
              disabled={isSubmitting || Number(endKm) < usage.startKm}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5 tap-bounce disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{isSubmitting ? 'Chiusura...' : 'Conferma e Termina'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
