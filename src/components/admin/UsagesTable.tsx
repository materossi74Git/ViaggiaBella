import React, { useState } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Eye,
  Edit,
  Clock,
  Gauge,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { VehicleUsage, Vehicle, AppUser } from '../../types';

interface UsagesTableProps {
  usages: VehicleUsage[];
  vehicles: Vehicle[];
  adminUser: AppUser;
  onEditUsage: (usage: VehicleUsage) => void;
  onOpenAuditForUsage?: (usageId: string) => void;
}

export const UsagesTable: React.FC<UsagesTableProps> = ({
  usages,
  vehicles,
  adminUser,
  onEditUsage,
  onOpenAuditForUsage,
}) => {
  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);

  // Modale Dettaglio
  const [selectedUsage, setSelectedUsage] = useState<VehicleUsage | null>(null);

  // Conducenti unici
  const drivers = Array.from(new Set(usages.map(u => u.driverName))).filter(Boolean);

  const filtered = usages.filter(u => {
    // Ricerca testo
    const matchSearch =
      !searchTerm ||
      u.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.notes && u.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro veicolo
    const matchVehicle = selectedVehicleId === 'all' || u.vehicleId === selectedVehicleId;

    // Filtro conducente
    const matchDriver = selectedDriver === 'all' || u.driverName === selectedDriver;

    // Filtro stato
    const matchStatus = selectedStatus === 'all' || u.status === selectedStatus;

    // Filtro date
    const matchStartDate = !startDate || u.usageDate >= startDate;
    const matchEndDate = !endDate || u.usageDate <= endDate;

    // Filtro anomalie
    const matchAnomalies = !onlyAnomalies || u.hasAnomalies;

    return (
      matchSearch &&
      matchVehicle &&
      matchDriver &&
      matchStatus &&
      matchStartDate &&
      matchEndDate &&
      matchAnomalies
    );
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVehicleId('all');
    setSelectedDriver('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setOnlyAnomalies(false);
  };

  return (
    <div className="space-y-4">
      {/* Header e Barra Filtri */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cerca per mezzo, targa, conducente, destinazione..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Azzera Filtri
            </button>
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              {filtered.length} di {usages.length} registrazioni
            </span>
          </div>
        </div>

        {/* Griglia Filtri Multidimensionale */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Mezzo */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Mezzo</label>
            <select
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="all">Tutti i mezzi</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate})
                </option>
              ))}
            </select>
          </div>

          {/* Conducente */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Conducente</label>
            <select
              value={selectedDriver}
              onChange={e => setSelectedDriver(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="all">Tutti i conducenti</option>
              {drivers.map((d, i) => (
                <option key={i} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Stato */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Stato Viaggio</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="all">Tutti gli stati</option>
              <option value="in_corso">In Corso</option>
              <option value="completato">Completato</option>
              <option value="da_verificare">Da Verificare</option>
            </select>
          </div>

          {/* Da Data */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Da Data</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            />
          </div>

          {/* A Data */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">A Data</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabella Registrazioni */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Data & Orario</th>
                <th className="py-3 px-4">Mezzo & Targa</th>
                <th className="py-3 px-4">Conducente</th>
                <th className="py-3 px-4">Destinazione & Motivo</th>
                <th className="py-3 px-4 text-right">Km Percorsi</th>
                <th className="py-3 px-4">Stato</th>
                <th className="py-3 px-4 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nessuna registrazione corrisponde ai filtri selezionati.
                  </td>
                </tr>
              ) : (
                filtered.map(usage => (
                  <tr
                    key={usage.id}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedUsage(usage)}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{usage.usageDate}</div>
                      <div className="text-slate-500 text-[11px]">
                        {usage.startTime} - {usage.endTime || 'In corso'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{usage.vehicleName}</div>
                      <span className="font-mono text-[11px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                        {usage.vehiclePlate}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{usage.driverName}</div>
                      <div className="text-[10px] text-slate-400">
                        {usage.mode === 'pulsanti' ? 'Modalità Pulsanti' : 'Manuale'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">
                        {usage.destination}
                      </div>
                      <div className="text-slate-500 text-[11px] truncate">
                        {usage.reason}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                      {usage.distanceKm !== undefined ? (
                        <span>{usage.distanceKm} km</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">In corso</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {usage.status === 'in_corso' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                          In Corso
                        </span>
                      ) : usage.status === 'completato' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                          Completato
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Da Verificare
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setSelectedUsage(usage)}
                          title="Visualizza scheda completa"
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditUsage(usage)}
                          title="Rettifica amministrativa"
                          className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale Scheda Dettaglio Registrazione */}
      {selectedUsage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl text-slate-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
                  Dettaglio Utilizzo Mezzo
                </h3>
                <p className="text-xs text-slate-500 font-mono">ID: {selectedUsage.id}</p>
              </div>
              <button
                onClick={() => setSelectedUsage(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Mezzo & Conducente */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Mezzo:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedUsage.vehicleName}</span>
                  <span className="font-mono font-bold text-xs bg-white px-1.5 py-0.5 rounded border ml-1">
                    {selectedUsage.vehiclePlate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Conducente:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedUsage.driverName}</span>
                </div>
              </div>

              {/* Orari e Percorso */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Data & Orario:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedUsage.usageDate} | {selectedUsage.startTime} - {selectedUsage.endTime || 'In corso'}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Chilometri:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedUsage.startKm} → {selectedUsage.endKm || '-'} ({selectedUsage.distanceKm || 0} km)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Destinazione:</span>
                <span className="font-medium text-slate-900 text-sm">{selectedUsage.destination}</span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Motivo del viaggio:</span>
                <span className="font-medium text-slate-900">{selectedUsage.reason}</span>
              </div>

              {selectedUsage.notes && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
                  <span className="text-amber-800 font-semibold block mb-0.5">Note:</span>
                  <span className="text-slate-700">{selectedUsage.notes}</span>
                </div>
              )}

              {/* Distinzione Timestamp Reali vs Salvataggio (Requisito Sezione 5 & 11) */}
              <div className="p-3 bg-slate-100 rounded-xl space-y-1 text-[11px] text-slate-600 font-mono">
                <div className="font-bold text-slate-700 mb-1">Riferimenti Temporali & Audit:</div>
                <div>• Modalità inserimento: {selectedUsage.mode}</div>
                {selectedUsage.startRealTimestamp && (
                  <div>• Inizio effettivo (pulsante): {selectedUsage.startRealTimestamp}</div>
                )}
                {selectedUsage.endRealTimestamp && (
                  <div>• Fine effettiva (pulsante): {selectedUsage.endRealTimestamp}</div>
                )}
                {selectedUsage.firstSavedAt && (
                  <div>• Primo salvataggio definitivo: {selectedUsage.firstSavedAt}</div>
                )}
                <div>• Creato il: {selectedUsage.createdAt}</div>
                <div>• Ultima modifica: {selectedUsage.updatedAt} da {selectedUsage.lastModifiedByName}</div>
              </div>

              {/* Pulsante Azione Rettifica Amministrativa */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const u = selectedUsage;
                    setSelectedUsage(null);
                    onEditUsage(u);
                  }}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-purple-500/20"
                >
                  <Edit className="w-4 h-4" />
                  <span>Rettifica Dati Amministrativa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
