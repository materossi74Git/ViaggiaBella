import React, { useState, useEffect } from 'react';
import { CheckCircle2, X, AlertTriangle, MapPin, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { VehicleUsage, AppUser } from '../../types';
import { finishTripWithButtons } from '../../services/dbService';
import { getCurrentGpsPoint, GpsPoint, getGoogleMapsUrl } from '../../services/gpsService';

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
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [optionalEndKm, setOptionalEndKm] = useState<string>('');
  const [showOptionalKm, setShowOptionalKm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GPS state
  const [gpsPoint, setGpsPoint] = useState<GpsPoint | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

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
    if (usage && isOpen) {
      setDestination(usage.destination || '');
      setReason(usage.reason || '');
      setNotes(usage.notes || '');
      setOptionalEndKm(usage.startKm ? String(usage.startKm) : '');
      setErrorMsg(null);
      detectGps();
    }
  }, [usage, isOpen]);

  const detectGps = async () => {
    setIsLoadingGps(true);
    setGpsError(null);
    try {
      const pt = await getCurrentGpsPoint(8000);
      setGpsPoint(pt);
    } catch (err: any) {
      console.warn('Rilevamento GPS chiusura:', err);
      setGpsError(err?.message || 'GPS non raggiungibile');
    } finally {
      setIsLoadingGps(false);
    }
  };

  if (!isOpen || !usage) return null;

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let parsedKm: number | undefined = undefined;
    if (optionalEndKm.trim()) {
      const num = Number(optionalEndKm);
      if (!isNaN(num)) {
        if (usage.startKm !== undefined && num < usage.startKm) {
          setErrorMsg(
            `I chilometri finali (${num}) non possono essere inferiori a quelli iniziali (${usage.startKm}).`
          );
          return;
        }
        parsedKm = num;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const endGpsPointStr = gpsPoint
        ? `${gpsPoint.address || 'Punto GPS Chiusura'} (${gpsPoint.latitude.toFixed(5)}, ${gpsPoint.longitude.toFixed(5)})`
        : undefined;

      await finishTripWithButtons({
        usage,
        user,
        endKm: parsedKm,
        endGpsPoint: endGpsPointStr,
        endLocation: gpsPoint || undefined,
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
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Intestazione Rapida */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center text-white shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/20 text-amber-100 text-[10px] font-bold border border-white/25">
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>Rientro Mezzo con Punto GPS</span>
              </div>
              <h3 className="font-black text-base text-white leading-tight mt-0.5">
                Termina Viaggio: {usage.vehicleName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-amber-100 hover:text-white flex items-center justify-center transition-colors tap-bounce"
            title="Chiudi finestra (Esc)"
            aria-label="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Modale Scorrevole */}
        <form onSubmit={handleFinish} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Scheda Sintesi Mezzo in Viaggio */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-slate-900">{usage.vehicleName}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Targa: <strong className="text-slate-800">{usage.vehiclePlate}</strong> · Partenza: {usage.startTime}
                </div>
                {usage.startGpsPoint && (
                  <div className="text-[10px] text-teal-800 mt-1 flex items-center space-x-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">Partito da: {usage.startGpsPoint}</span>
                  </div>
                )}
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-bold text-[11px]">
                In Corso
              </span>
            </div>

            {/* PUNTO GPS DI RIENTRO / CHIUSURA LETTURA (AUTOMATICO) */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs">
                  <MapPin className="w-4 h-4 text-amber-700" />
                  <span>Punto GPS Lettura Rientro</span>
                </div>
                <button
                  type="button"
                  onClick={detectGps}
                  disabled={isLoadingGps}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[11px] font-semibold transition-colors disabled:opacity-50"
                  title="Aggiorna punto GPS corrente"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingGps ? 'animate-spin' : ''}`} />
                  <span>{isLoadingGps ? 'Rilevamento...' : 'Rileva GPS'}</span>
                </button>
              </div>

              {isLoadingGps ? (
                <div className="flex items-center space-x-2 text-amber-900 text-xs py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                  <span>Rilevamento punto GPS di arrivo in corso...</span>
                </div>
              ) : gpsPoint ? (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{gpsPoint.address || 'Punto GPS registrato'}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 flex items-center justify-between">
                    <span>
                      Lat: {gpsPoint.latitude.toFixed(5)}, Lng: {gpsPoint.longitude.toFixed(5)} (±{gpsPoint.accuracy}m)
                    </span>
                    <a
                      href={getGoogleMapsUrl(gpsPoint.latitude, gpsPoint.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-800 font-bold hover:underline"
                    >
                      Mappa ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  {gpsError ? (
                    <span className="text-rose-700">{gpsError}</span>
                  ) : (
                    <span>Tocca "Rileva GPS" per memorizzare il punto di chiusura del servizio.</span>
                  )}
                </div>
              )}
              <div className="text-[10px] text-amber-900/80 italic">
                * Non occorre inserire i km percorsi: la lettura GPS traccia la posizione e chiusura del viaggio.
              </div>
            </div>

            {/* Destinazione / Fermate */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[11px] uppercase tracking-wide">
                Destinazione Effettiva / Percorso
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                required
              />
            </div>

            {/* Note / Anomalie */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[11px] uppercase tracking-wide">
                Note / Anomalie Mezzo (Facoltativo)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Es. Rifornimento effettuato, pulizia completata, nessuna anomalia..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
              />
            </div>

            {/* Campo KM Opzionale (Nascosto di default, non richiesto) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowOptionalKm(!showOptionalKm)}
                className="text-[11px] text-slate-500 hover:text-slate-700 underline flex items-center space-x-1"
              >
                <span>{showOptionalKm ? 'Nascondi campo chilometri' : '+ Desideri inserire anche i km del contachilometri? (Facoltativo)'}</span>
              </button>
              {showOptionalKm && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 animate-in fade-in">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Km Finali Cruscotto (Opzionale)
                  </label>
                  <input
                    type="number"
                    value={optionalEndKm}
                    onChange={e => setOptionalEndKm(e.target.value)}
                    placeholder={usage.startKm ? `Iniziali: ${usage.startKm}` : 'Es. 48300'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Fisso con Termina Viaggio + Nome Mezzo */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors tap-bounce"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[46px] py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md shadow-amber-950/20 flex items-center justify-center space-x-2 tap-bounce disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
              <span className="truncate">
                {isSubmitting ? 'Chiusura...' : `Termina Viaggio: ${usage.vehicleName}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
