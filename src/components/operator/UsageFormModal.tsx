import React, { useState, useEffect } from 'react';
import { FileEdit, X, AlertTriangle, Clock, Calendar, Gauge, Check } from 'lucide-react';
import { VehicleUsage, Vehicle, AppUser, AppSettings } from '../../types';
import { saveManualUsage, updateUsageWith30MinRule } from '../../services/dbService';

interface UsageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageToEdit?: VehicleUsage | null;
  initialVehicle?: Vehicle | null;
  vehicles: Vehicle[];
  user: AppUser;
  settings: AppSettings;
  onSaved: () => void;
}

export const UsageFormModal: React.FC<UsageFormModalProps> = ({
  isOpen,
  onClose,
  usageToEdit,
  initialVehicle,
  vehicles,
  user,
  settings,
  onSaved,
}) => {
  if (!isOpen) return null;

  const isEditing = !!usageToEdit;
  const isAdmin = user.role === 'amministratore';

  // Stato campi
  const [vehicleId, setVehicleId] = useState<string>('');
  const [usageDate, setUsageDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [startKm, setStartKm] = useState<number>(0);
  const [endKm, setEndKm] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [adminCorrectionReason, setAdminCorrectionReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcolo tempo rimasto per la finestra di 30 minuti
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (usageToEdit) {
      setVehicleId(usageToEdit.vehicleId);
      setUsageDate(usageToEdit.usageDate);
      setStartTime(usageToEdit.startTime);
      setEndTime(usageToEdit.endTime || '');
      setDestination(usageToEdit.destination);
      setReason(usageToEdit.reason);
      setStartKm(usageToEdit.startKm);
      setEndKm(usageToEdit.endKm !== undefined ? usageToEdit.endKm : '');
      setNotes(usageToEdit.notes || '');

      // Calcola tempo rimanente per la modifica
      if (usageToEdit.firstSavedAt && !isAdmin) {
        const firstTime = new Date(usageToEdit.firstSavedAt).getTime();
        const updateRemaining = () => {
          const elapsed = (Date.now() - firstTime) / (1000 * 60);
          const rem = Math.max(0, Math.ceil(30 - elapsed));
          setRemainingMinutes(rem);
        };
        updateRemaining();
        const interval = setInterval(updateRemaining, 10000);
        return () => clearInterval(interval);
      } else {
        setRemainingMinutes(null);
      }
    } else {
      // Inizializza nuovo viaggio manuale
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const defaultVehicle = initialVehicle || vehicles[0];

      setVehicleId(defaultVehicle?.id || '');
      setUsageDate(now.toISOString().split('T')[0]);
      setStartTime(`${hours}:${minutes}`);
      setEndTime('');
      setDestination('');
      setReason(settings.reasons[0] || 'Trasporto Utenti');
      setStartKm(defaultVehicle?.currentKm || 0);
      setEndKm('');
      setNotes('');
      setRemainingMinutes(null);
    }
  }, [usageToEdit, initialVehicle, vehicles, settings.reasons, isAdmin]);

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  // Auto aggiornamento Km iniziali quando si cambia mezzo in modalità creazione
  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    if (!isEditing) {
      const v = vehicles.find(item => item.id === id);
      if (v) {
        setStartKm(v.currentKm || 0);
      }
    }
  };

  const calculatedDistance =
    endKm !== '' && Number(endKm) >= startKm ? Number(endKm) - startKm : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!vehicleId || !destination.trim() || !reason.trim() || !startTime) {
      setErrorMsg('Compilare tutti i campi obbligatori contrassegnati con asterisco (*).');
      return;
    }

    if (endTime && endTime < startTime && usageDate === new Date().toISOString().split('T')[0]) {
      // Nota: consentito se a cavallo della mezzanotte, ma avvisa se palesemente incoerente
      // Controlliamo coerenza km
    }

    if (endKm !== '' && Number(endKm) < startKm) {
      setErrorMsg(`I km finali (${endKm}) non possono essere inferiori ai km iniziali (${startKm}).`);
      return;
    }

    if (isEditing && isAdmin && !adminCorrectionReason.trim()) {
      setErrorMsg('L\'amministratore deve specificare la motivazione della correzione.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing && usageToEdit) {
        const updated: VehicleUsage = {
          ...usageToEdit,
          vehicleId,
          vehicleName: selectedVehicle?.name || usageToEdit.vehicleName,
          vehiclePlate: selectedVehicle?.plate || usageToEdit.vehiclePlate,
          usageDate,
          startTime,
          endTime: endTime || undefined,
          destination: destination.trim(),
          reason: reason.trim(),
          startKm: Number(startKm),
          endKm: endKm !== '' ? Number(endKm) : undefined,
          distanceKm: endKm !== '' ? calculatedDistance : undefined,
          notes: notes.trim(),
          status: endTime ? 'completato' : usageToEdit.status,
        };

        await updateUsageWith30MinRule(updated, user, adminCorrectionReason);
      } else {
        await saveManualUsage(
          {
            vehicleId,
            vehicleName: selectedVehicle?.name || 'Mezzo',
            vehiclePlate: selectedVehicle?.plate || '',
            usageDate,
            startTime,
            endTime: endTime || undefined,
            destination,
            reason,
            startKm: Number(startKm),
            endKm: endKm !== '' ? Number(endKm) : undefined,
            notes,
          },
          user
        );
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante il salvataggio dei dati.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <FileEdit className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                {isEditing ? 'Modifica Registrazione' : 'Nuovo Viaggio Manuale'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditing
                  ? 'Modifica consentita entro 30 min dal salvataggio'
                  : 'Inserimento manuale dati di viaggio'}
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

        {/* Banner 30 minuti se in modifica */}
        {isEditing && remainingMinutes !== null && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
              remainingMinutes > 5
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : remainingMinutes > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                {remainingMinutes > 0
                  ? `Finestra di modifica attiva: ancora ~${remainingMinutes} min rimanenti.`
                  : 'Finestra scaduta. È necessaria l\'autorizzazione dell\'amministratore.'}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border">
              Regola 30 min
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Selezione Veicolo */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mezzo della Cooperativa *
              </label>
            <select
              value={vehicleId}
              onChange={e => handleVehicleChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm bg-white"
              required
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate}) {v.status === 'inattivo' ? '[NON ATTIVO]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Data e Orari */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Utilizzo *
              </label>
              <input
                type="date"
                value={usageDate}
                onChange={e => setUsageDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ora Inizio *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ora Fine (se concluso)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* Destinazione e Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destinazione *
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Es. Sede operativa, Ospedale..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo del Viaggio *
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                required
              >
                {settings.reasons.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chilometri Iniziali e Finali con calcolo automatico */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Km Iniziali *
                </label>
                <input
                  type="number"
                  value={startKm}
                  onChange={e => setStartKm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Km Finali
                </label>
                <input
                  type="number"
                  value={endKm}
                  onChange={e => setEndKm(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Opzionale se in corso"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white"
                />
              </div>
              <div className="text-center sm:text-right pt-2 sm:pt-0">
                <span className="block text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Chilometri Percorsi
                </span>
                <span className="text-xl font-extrabold text-blue-700 font-mono">
                  {calculatedDistance} km
                </span>
              </div>
            </div>
          </div>

          {/* Note facoltative */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note (Facoltative)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Annotazioni di viaggio..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Se amministratore che autorizza correzione */}
          {isEditing && isAdmin && (
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
              <label className="block text-xs font-bold text-purple-900 mb-1">
                Motivo della Correzione Amministrativa *
              </label>
              <input
                type="text"
                value={adminCorrectionReason}
                onChange={e => setAdminCorrectionReason(e.target.value)}
                placeholder="Es. Rettifica km su richiesta telefonica operatore..."
                className="w-full px-3 py-2 rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs bg-white"
                required
              />
              <p className="text-[10px] text-purple-700 mt-1">
                Questa motivazione verrà registrata in modo permanente e non cancellabile nell'Audit Log.
              </p>
            </div>
          )}
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
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5 tap-bounce disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvataggio...' : 'Salva Registrazione'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
