import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Gauge,
  Edit3,
  FileQuestion,
  Search,
  CheckCircle2,
  AlertCircle,
  Car,
} from 'lucide-react';
import { VehicleUsage, AppUser } from '../../types';

interface MyUsagesListProps {
  usages: VehicleUsage[];
  user: AppUser;
  onEditClick: (usage: VehicleUsage) => void;
  onFinishClick: (usage: VehicleUsage) => void;
  onRequestCorrectionClick: (usage: VehicleUsage) => void;
}

export const MyUsagesList: React.FC<MyUsagesListProps> = ({
  usages,
  user,
  onEditClick,
  onFinishClick,
  onRequestCorrectionClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_corso' | 'completato'>('all');

  const now = Date.now();

  const isEditableWithin30Min = (usage: VehicleUsage) => {
    if (usage.status === 'in_corso') return true;
    if (!usage.firstSavedAt) return true;
    const diffMin = (now - new Date(usage.firstSavedAt).getTime()) / (1000 * 60);
    return diffMin <= 30;
  };

  const getRemainingMinutes = (usage: VehicleUsage) => {
    if (!usage.firstSavedAt) return 30;
    const diffMin = (now - new Date(usage.firstSavedAt).getTime()) / (1000 * 60);
    return Math.max(0, Math.ceil(30 - diffMin));
  };

  const filtered = usages.filter(u => {
    const matchSearch =
      u.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'in_corso' && u.status === 'in_corso') ||
      (statusFilter === 'completato' && u.status === 'completato');

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cerca mezzo, destinazione, targa..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tap-bounce ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tutti ({usages.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_corso')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tap-bounce ${
              statusFilter === 'in_corso'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            In Corso ({usages.filter(u => u.status === 'in_corso').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completato')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tap-bounce ${
              statusFilter === 'completato'
                ? 'bg-teal-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Completati ({usages.filter(u => u.status === 'completato').length})
          </button>
        </div>
      </div>

      {/* Lista Utilizzi */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-500 shadow-sm">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium">Nessuna registrazione trovata</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm
              ? 'Prova a modificare i filtri di ricerca.'
              : 'Non hai ancora registrato viaggi con i mezzi della cooperativa.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(usage => {
            const isOngoing = usage.status === 'in_corso';
            const editable = isEditableWithin30Min(usage);
            const remainingMin = getRemainingMinutes(usage);

            return (
              <div
                key={usage.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                        {usage.vehiclePlate}
                      </span>
                      <h4 className="font-bold text-base text-slate-900">{usage.vehicleName}</h4>

                      {isOngoing ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 animate-pulse border border-teal-200">
                          In Corso
                        </span>
                      ) : editable ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                          <Clock className="w-3 h-3 mr-1 text-teal-600" />
                          Modificabile ({remainingMin}m)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Chiuso
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {usage.destination}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {usage.usageDate} | {usage.startTime} - {usage.endTime || 'In corso'}
                      </span>
                      {usage.startGpsPoint && (
                        <span className="flex items-center text-teal-800 font-medium">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-teal-600" />
                          GPS Partenza: {usage.startGpsPoint}
                        </span>
                      )}
                      {usage.endGpsPoint && (
                        <span className="flex items-center text-emerald-800 font-medium">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          GPS Arrivo: {usage.endGpsPoint}
                        </span>
                      )}
                      {usage.distanceKm !== undefined && (
                        <span className="flex items-center font-medium text-slate-600">
                          <Gauge className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {usage.distanceKm} km percorsi
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 pt-0.5">
                      <span className="font-medium text-slate-700">Motivo:</span> {usage.reason}
                      {usage.notes && (
                        <span className="ml-2 italic text-slate-400">"{usage.notes}"</span>
                      )}
                    </div>
                  </div>

                  {/* Pulsanti Azione per l'operatore */}
                  <div className="flex items-center space-x-2 pt-2 sm:pt-0 self-start sm:self-center">
                    {isOngoing ? (
                      <button
                        type="button"
                        onClick={() => onFinishClick(usage)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 tap-bounce border border-amber-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-slate-950" />
                        <span>Termina Viaggio</span>
                      </button>
                    ) : editable ? (
                      <button
                        type="button"
                        onClick={() => onEditClick(usage)}
                        className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 border border-teal-200 tap-bounce"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Modifica ({remainingMin}m)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestCorrectionClick(usage)}
                        className="px-3 py-2 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 text-slate-700 font-medium text-xs rounded-xl transition-colors flex items-center space-x-1.5 border border-slate-200 tap-bounce"
                        title="La finestra di 30 minuti è scaduta. Invia una richiesta di correzione all'amministratore"
                      >
                        <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
                        <span>Richiedi Correzione</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
