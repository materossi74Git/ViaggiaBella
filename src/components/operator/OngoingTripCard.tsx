import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Gauge, CheckCircle2, ChevronRight, Navigation } from 'lucide-react';
import { VehicleUsage } from '../../types';
import { FriendlyVanMascot } from '../common/FriendlyVanMascot';

interface OngoingTripCardProps {
  usage: VehicleUsage;
  onFinishClick: (usage: VehicleUsage) => void;
}

export const OngoingTripCard: React.FC<OngoingTripCardProps> = ({ usage, onFinishClick }) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      const startTime = usage.startRealTimestamp
        ? new Date(usage.startRealTimestamp).getTime()
        : new Date(usage.createdAt).getTime();
      const diffMin = Math.max(0, Math.floor((Date.now() - startTime) / (1000 * 60)));
      setElapsedMinutes(diffMin);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 15000); // aggiorna ogni 15s
    return () => clearInterval(interval);
  }, [usage.startRealTimestamp, usage.createdAt]);

  const formatHoursMinutes = (totalMin: number) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-teal-900 border-2 border-teal-500/60 rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-teal-950/30 relative overflow-hidden animate-in fade-in duration-200">
      {/* Luce decorativa di sfondo sottile */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 space-y-4">
          {/* Header con badge di stato e Mascotte in movimento */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 animate-pulse" />
                <span>Viaggio in Corso Attivo</span>
              </span>
            </div>

            <div className="hidden sm:block">
              <FriendlyVanMascot mood="driving" size="sm" />
            </div>
          </div>

          {/* Nome Mezzo & Targa */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {usage.vehicleName}
            </h2>
            <span className="self-start font-mono text-xs font-black bg-white/10 px-2.5 py-1 rounded-xl border border-white/20 text-teal-200 tracking-wider">
              {usage.vehiclePlate}
            </span>
          </div>

          {/* Metadati di Viaggio (Unboxed text con icone e separatori puliti) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <div className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider flex items-center">
                <Clock className="w-3 h-3 mr-1 text-teal-400" />
                Inizio
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {usage.startTime}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <div className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider flex items-center">
                <MapPin className="w-3 h-3 mr-1 text-teal-400" />
                Punto GPS Partenza
              </div>
              <div className="text-xs font-bold text-white mt-0.5 truncate" title={usage.startGpsPoint || 'Acquisito alla partenza'}>
                {usage.startGpsPoint || (usage.startKm ? `${usage.startKm} km` : 'Rilevato')}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <div className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider flex items-center">
                <Navigation className="w-3 h-3 mr-1 text-teal-400" />
                Tempo Trascorso
              </div>
              <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
                {formatHoursMinutes(elapsedMinutes)}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <div className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider flex items-center truncate">
                <Navigation className="w-3 h-3 mr-1 text-teal-400 shrink-0" />
                Destinazione
              </div>
              <div className="text-sm font-bold text-white truncate mt-0.5" title={usage.destination}>
                {usage.destination}
              </div>
            </div>
          </div>

          <div className="text-xs text-teal-200/90 flex items-center space-x-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Al tuo rientro, premi il pulsante per registrare la lettura GPS di arrivo e chiudere il viaggio.</span>
          </div>
        </div>

        {/* Pulsante Principale Grande Ergonomico: TERMINA VIAGGIO */}
        <div className="md:self-center shrink-0">
          <button
            type="button"
            onClick={() => onFinishClick(usage)}
            className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide rounded-2xl shadow-xl shadow-amber-950/20 transition-all flex items-center justify-center space-x-3 tap-bounce border border-amber-300"
          >
            <Clock className="w-5 h-5 text-slate-950" />
            <span>TERMINA VIAGGIO ORA</span>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      </div>
    </div>
  );
};
