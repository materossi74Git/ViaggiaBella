import React from 'react';
import {
  PlayCircle,
  FileEdit,
  CheckCircle2,
  X,
  Truck,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Flag,
  AlertTriangle,
} from 'lucide-react';
import { Vehicle, VehicleUsage } from '../../types';
import { FriendlyVanMascot } from './FriendlyVanMascot';

interface VehicleIdentifiedActionModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onStartTrip: (vehicle: Vehicle) => void;
  onManualForm: (vehicle: Vehicle) => void;
  ongoingTripForVehicle?: VehicleUsage | null;
  onFinishOngoingTrip?: (usage: VehicleUsage) => void;
  identifiedVia?: 'nfc' | 'qr' | 'manual';
}

export const VehicleIdentifiedActionModal: React.FC<VehicleIdentifiedActionModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onStartTrip,
  onManualForm,
  ongoingTripForVehicle,
  onFinishOngoingTrip,
  identifiedVia = 'nfc',
}) => {
  if (!isOpen || !vehicle) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header con gradiente Cooperativa */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-5 text-white flex items-start justify-between shrink-0 relative overflow-hidden">
          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white shrink-0">
              <FriendlyVanMascot mood="driving" size="sm" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-[10px] font-bold border border-teal-400/30 mb-0.5">
                <Sparkles className="w-3 h-3 text-teal-300" />
                <span>
                  {identifiedVia === 'nfc'
                    ? 'Mezzo Identificato via Scheda NFC'
                    : identifiedVia === 'qr'
                    ? 'Mezzo Identificato via QR Code'
                    : 'Mezzo Selezionato'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                {vehicle.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors tap-bounce relative z-10"
            aria-label="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scheda Sintetica del Veicolo */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-black bg-slate-900 text-white px-3 py-1 rounded-xl shadow-xs tracking-wider">
              {vehicle.plate}
            </span>
            <div className="text-right">
              <div className="text-xs text-slate-500">Chilometraggio</div>
              <div className="font-mono text-sm font-bold text-slate-900">
                {vehicle.currentKm.toLocaleString('it-IT')} km
              </div>
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
            <span>{vehicle.brandModel || 'Modello Clarabella'} • <span className="capitalize">{vehicle.type}</span></span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              vehicle.status === 'attivo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {vehicle.status === 'attivo' ? 'Disponibile' : 'Non Attivo'}
            </span>
          </div>

          {vehicle.notes && (
            <p className="mt-2 text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-200/80">
              "{vehicle.notes}"
            </p>
          )}
        </div>

        {/* Scelte Operative: Inizia Viaggio vs Inserisci Utilizzo */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Cosa desideri fare con questo mezzo?
          </div>

          {/* Caso speciale: se c'è già un viaggio aperto da questo utente su questo mezzo */}
          {ongoingTripForVehicle && onFinishOngoingTrip && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                <Flag className="w-4 h-4 text-amber-700" />
                <span>Hai già un viaggio in corso su questo furgone!</span>
              </div>
              <p className="text-xs text-amber-800">
                Partito alle {ongoingTripForVehicle.startTime} con {ongoingTripForVehicle.startKm} km. Stai rientrando?
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFinishOngoingTrip(ongoingTripForVehicle);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 tap-bounce shadow-sm"
              >
                <Flag className="w-4 h-4" />
                <span>Termina e Registra Rientro del Mezzo</span>
              </button>
            </div>
          )}

          {/* Opzione 1: Inizia Viaggio ORA (Modalità B) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartTrip(vehicle);
            }}
            className="w-full p-4.5 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 hover:from-teal-600 hover:to-teal-800 text-white shadow-md shadow-teal-900/20 text-left transition-all flex items-center justify-between border border-teal-500/40 tap-bounce group"
          >
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <PlayCircle className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-base leading-tight">Inizia Viaggio ORA</span>
                  <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded text-teal-100">
                    Modalità B
                  </span>
                </div>
                <div className="text-xs text-teal-100/90 mt-0.5 leading-snug">
                  Sali a bordo adesso: registra orario in automatico con un tocco. Inserirai i km finali al rientro.
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-teal-300 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
          </button>

          {/* Opzione 2: Inserimento Manuale (Modalità A) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onManualForm(vehicle);
            }}
            className="w-full p-4.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 shadow-sm text-left transition-all flex items-center justify-between tap-bounce group hover:border-slate-400"
          >
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 group-hover:scale-105 transition-transform">
                <FileEdit className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base leading-tight">Inserisci Utilizzo del Mezzo</span>
                  <span className="text-[10px] uppercase font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    Modalità A
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Compila orario di partenza, arrivo, destinazione e km finali (es. per registrare un servizio a posteriori).
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">Cooperativa Sociale Clarabella</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs tap-bounce transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
