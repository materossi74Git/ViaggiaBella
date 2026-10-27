import React, { useState, useEffect } from 'react';
import { PlayCircle, X, AlertTriangle, Car, Compass } from 'lucide-react';
import { Vehicle, AppUser, AppSettings } from '../../types';
import { startTripWithButtons, getOngoingTripForVehicle } from '../../services/dbService';

interface StartTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  initialVehicle?: Vehicle | null;
  driver: AppUser;
  settings: AppSettings;
  onTripStarted: () => void;
}

export const StartTripModal: React.FC<StartTripModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  initialVehicle,
  driver,
  settings,
  onTripStarted,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState(settings.reasons[0] || 'Trasporto Utenti');
  const [startKm, setStartKm] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeConflict, setActiveConflict] = useState<string | null>(null);

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
    if (initialVehicle) {
      setSelectedVehicleId(initialVehicle.id);
      setStartKm(initialVehicle.currentKm || 0);
    } else if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
      setStartKm(vehicles[0].currentKm || 0);
    }
  }, [initialVehicle, vehicles, selectedVehicleId]);

  useEffect(() => {
    const v = vehicles.find(item => item.id === selectedVehicleId);
    if (v) {
      setStartKm(v.currentKm || 0);
      getOngoingTripForVehicle(v.id).then(ongoing => {
        if (ongoing) {
          setActiveConflict(
            `Attenzione: ${v.name} risulta già in viaggio con il conducente ${ongoing.driverName}.`
          );
        } else {
          setActiveConflict(null);
        }
      });
    }
  }, [selectedVehicleId, vehicles]);

  if (!isOpen) return null;

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!currentVehicle) {
      setErrorMsg('Seleziona un mezzo valido per iniziare.');
      return;
    }

    if (!destination.trim()) {
      setErrorMsg('Specifica la destinazione del viaggio.');
      return;
    }

    if (activeConflict) {
      setErrorMsg(activeConflict);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await startTripWithButtons({
        vehicle: currentVehicle,
        driver,
        destination,
        reason,
        startKm: Number(startKm),
        notes,
      });

      onTripStarted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante l\'avvio del viaggio.');
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
        {/* Intestazione Compatta con Pulsante Chiudi Facile e Visibile */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                Avvia Viaggio
              </h3>
              <p className="text-[11px] text-slate-500">
                Registrazione immediata partenza
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {activeConflict && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>{activeConflict}</span>
              </div>
            )}

            {/* Selezione Veicolo */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mezzo della Cooperativa *
              </label>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium text-xs bg-white text-slate-800"
              >
                {vehicles
                  .filter(v => v.status === 'attivo')
                  .map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate}) · {v.currentKm} km
                    </option>
                  ))}
              </select>
            </div>

            {/* Destinazione e Motivo affiancati */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destinazione *
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="Es. Centro Diurno, Ospedale..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo Viaggio *
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs bg-white text-slate-800"
                >
                  {settings.reasons.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chilometri Iniziali */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Km Iniziali da Contachilometri *
                </label>
                {currentVehicle && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Registrati: {currentVehicle.currentKm} km
                  </span>
                )}
              </div>
              <input
                type="number"
                value={startKm}
                onChange={e => setStartKm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-sm font-mono font-bold text-slate-900 bg-white"
                required
              />
            </div>

            {/* Note opzionali */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Note (Facoltative)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Utenti a bordo, annotazioni..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
              />
            </div>

            {/* Badge Conducente compatto */}
            <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Conducente: <strong className="text-slate-800">{driver.displayName}</strong></span>
              <span className="text-emerald-700 font-medium">Orario rilevato all'invio</span>
            </div>
          </div>

          {/* Footer Fisso con Pulsante Annulla + Conferma */}
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
              disabled={isSubmitting || !!activeConflict}
              className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5 tap-bounce disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Avvio...' : 'Avvia Viaggio Ora'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
