import React, { useState, useEffect } from 'react';
import { PlayCircle, X, AlertTriangle, MapPin, RefreshCw, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Vehicle, AppUser, AppSettings } from '../../types';
import { startTripWithButtons, getOngoingTripForVehicle } from '../../services/dbService';
import { getCurrentGpsPoint, GpsPoint, getGoogleMapsUrl } from '../../services/gpsService';

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
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeConflict, setActiveConflict] = useState<string | null>(null);

  // GPS State
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

  // Seleziona veicolo iniziale
  useEffect(() => {
    if (initialVehicle) {
      setSelectedVehicleId(initialVehicle.id);
    } else if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [initialVehicle, vehicles, selectedVehicleId]);

  // Rilevamento automatico punto GPS all'apertura
  useEffect(() => {
    if (isOpen) {
      detectGps();
    }
  }, [isOpen]);

  const detectGps = async () => {
    setIsLoadingGps(true);
    setGpsError(null);
    try {
      const pt = await getCurrentGpsPoint(8000);
      setGpsPoint(pt);
      // Suggerisci automaticamente se la destinazione è ancora vuota
      if (!destination && pt.address) {
        // Non sovrascriviamo se l'utente ha già digitato
      }
    } catch (err: any) {
      console.warn('Rilevamento GPS non riuscito:', err);
      setGpsError(err?.message || 'GPS non raggiungibile');
    } finally {
      setIsLoadingGps(false);
    }
  };

  useEffect(() => {
    const v = vehicles.find(item => item.id === selectedVehicleId);
    if (v) {
      if (v.isOccupied || (v.activeTripId && v.activeTripId.trim() !== '')) {
        setActiveConflict(
          `Attenzione: ${v.name} risulta già in viaggio con il conducente ${v.activeDriverName || 'un altro operatore'}.`
        );
      } else {
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
    }
  }, [selectedVehicleId, vehicles]);

  if (!isOpen) return null;

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const buttonLabel = currentVehicle
    ? `Inizia viaggio ora: ${currentVehicle.name}`
    : 'Inizia Viaggio ORA';

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
      const startGpsPointStr = gpsPoint
        ? `${gpsPoint.address || 'Punto GPS'} (${gpsPoint.latitude.toFixed(5)}, ${gpsPoint.longitude.toFixed(5)})`
        : undefined;

      await startTripWithButtons({
        vehicle: currentVehicle,
        driver,
        destination,
        reason,
        startKm: currentVehicle.currentKm || 0,
        startGpsPoint: startGpsPointStr,
        startLocation: gpsPoint || undefined,
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
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Intestazione Rapida e Chiara */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center shrink-0">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-[10px] font-bold border border-teal-400/30">
                <Sparkles className="w-3 h-3 text-teal-300" />
                <span>Modalità Rapida Senza Km Manuali</span>
              </div>
              <h3 className="font-black text-base text-white leading-tight mt-0.5">
                {currentVehicle ? `Inizia viaggio: ${currentVehicle.name}` : 'Avvia Viaggio'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors tap-bounce"
            title="Chiudi finestra (Esc)"
            aria-label="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Modale Scorrevole */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {activeConflict && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>{activeConflict}</span>
              </div>
            )}

            {/* SELEZIONE MEZZO */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[11px] tracking-wide">
                Mezzo Selezionato
              </label>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-bold text-sm bg-slate-50 text-slate-900"
              >
                {vehicles
                  .filter(v => v.status === 'attivo')
                  .map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate})
                    </option>
                  ))}
              </select>
            </div>

            {/* PUNTO GPS DELLA LETTURA (AUTOMATICO) */}
            <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-teal-900 font-bold text-xs">
                  <MapPin className="w-4 h-4 text-teal-700" />
                  <span>Punto GPS Lettura Partenza</span>
                </div>
                <button
                  type="button"
                  onClick={detectGps}
                  disabled={isLoadingGps}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-900 text-[11px] font-semibold transition-colors disabled:opacity-50"
                  title="Aggiorna punto GPS corrente"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingGps ? 'animate-spin' : ''}`} />
                  <span>{isLoadingGps ? 'Rilevamento...' : 'Rileva GPS'}</span>
                </button>
              </div>

              {isLoadingGps ? (
                <div className="flex items-center space-x-2 text-teal-800 text-xs py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Acquisizione coordinate GPS dal dispositivo in corso...</span>
                </div>
              ) : gpsPoint ? (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{gpsPoint.address || 'Punto GPS acquisito'}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                    <span>
                      Lat: {gpsPoint.latitude.toFixed(5)}, Lng: {gpsPoint.longitude.toFixed(5)} (±{gpsPoint.accuracy}m)
                    </span>
                    <a
                      href={getGoogleMapsUrl(gpsPoint.latitude, gpsPoint.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 font-bold hover:underline"
                    >
                      Mappa ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  {gpsError ? (
                    <span className="text-amber-700">{gpsError}</span>
                  ) : (
                    <span>Tocca "Rileva GPS" per memorizzare la posizione esatta della lettura.</span>
                  )}
                </div>
              )}
              <div className="text-[10px] text-teal-700/80 italic">
                * Non serve annotare i km dal cruscotto: il punto GPS registra la posizione della lettura.
              </div>
            </div>

            {/* DESTINAZIONE & MOTIVO */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px] uppercase tracking-wide">
                  Destinazione Servizio *
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="Es. Centro Diurno, Brescia, Ospedale, Sede..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px] uppercase tracking-wide">
                  Motivo Viaggio *
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs bg-white text-slate-800"
                >
                  {settings.reasons.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px] uppercase tracking-wide">
                  Note / Passeggeri (Facoltativo)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Annotazioni di servizio, utenti trasportati..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs"
                />
              </div>
            </div>

            {/* Conducente & Orario */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Conducente: <strong className="text-slate-800">{driver.displayName}</strong></span>
              <span className="text-emerald-700 font-semibold">Orario automatico al tocco</span>
            </div>
          </div>

          {/* Footer Fisso con Pulsante Inizia Viaggio Ora + Nome Mezzo */}
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
              disabled={isSubmitting || !!activeConflict}
              className="flex-1 min-h-[46px] py-3 px-4 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-black text-xs sm:text-sm transition-all shadow-md shadow-teal-900/20 flex items-center justify-center space-x-2 tap-bounce disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{isSubmitting ? 'Avvio...' : buttonLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
