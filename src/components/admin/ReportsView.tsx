import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Truck,
  User,
  Gauge,
  TrendingUp,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';
import { VehicleUsage, Vehicle } from '../../types';
import { evaluateExpiry } from '../../services/expirationService';

interface ReportsViewProps {
  usages: VehicleUsage[];
  vehicles: Vehicle[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ usages, vehicles }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtra utilizzi per mese
  const monthUsages = usages.filter(u => u.usageDate.startsWith(selectedMonth));

  // Statistiche per Mezzo nel mese
  const statsByVehicle = vehicles.map(v => {
    const vTrips = monthUsages.filter(u => u.vehicleId === v.id);
    const totalKm = vTrips.reduce((acc, u) => acc + (u.distanceKm || 0), 0);
    return {
      vehicle: v,
      tripsCount: vTrips.length,
      totalKm,
    };
  });

  // Statistiche per Conducente nel mese
  const driverMap: Record<string, { count: number; km: number }> = {};
  monthUsages.forEach(u => {
    if (!driverMap[u.driverName]) {
      driverMap[u.driverName] = { count: 0, km: 0 };
    }
    driverMap[u.driverName].count += 1;
    driverMap[u.driverName].km += u.distanceKm || 0;
  });

  const totalMonthKm = monthUsages.reduce((acc, u) => acc + (u.distanceKm || 0), 0);

  // Esportazione CSV Utilizzi
  const handleExportCsv = () => {
    const headers = [
      'ID Viaggio',
      'Data',
      'Mezzo',
      'Targa',
      'Conducente',
      'Ora Inizio',
      'Ora Fine',
      'Destinazione',
      'Motivo Viaggio',
      'Km Iniziali',
      'Km Finali',
      'Km Percorsi',
      'Stato',
      'Modalita',
      'Note',
      'Data Creazione',
      'Ultima Modifica',
    ];

    const rows = monthUsages.map(u => [
      `"${u.id}"`,
      `"${u.usageDate}"`,
      `"${u.vehicleName.replace(/"/g, '""')}"`,
      `"${u.vehiclePlate}"`,
      `"${u.driverName.replace(/"/g, '""')}"`,
      `"${u.startTime}"`,
      `"${u.endTime || ''}"`,
      `"${u.destination.replace(/"/g, '""')}"`,
      `"${u.reason.replace(/"/g, '""')}"`,
      u.startKm,
      u.endKm !== undefined ? u.endKm : '',
      u.distanceKm !== undefined ? u.distanceKm : 0,
      `"${u.status}"`,
      `"${u.mode}"`,
      `"${(u.notes || '').replace(/"/g, '""')}"`,
      `"${u.createdAt}"`,
      `"${u.updatedAt}"`,
    ]);

    // UTF-8 BOM per garantire corretta apertura accenti in Excel su Windows e Mac
    const csvContent =
      '\uFEFF' +
      headers.join(';') +
      '\n' +
      rows.map(r => r.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `viaggiabella_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Esportazione CSV Scadenze Parco Mezzi (Assicurazioni e Revisioni)
  const handleExportFleetExpiriesCsv = () => {
    const headers = [
      'ID Mezzo',
      'Nome Mezzo',
      'Targa',
      'Marca/Modello',
      'Tipologia',
      'Stato Mezzo',
      'Km Attuali',
      'Scadenza Assicurazione',
      'Compagnia Assicurativa',
      'Stato Assicurazione',
      'Giorni a Scadenza Assicurazione',
      'Scadenza Revisione MCTC',
      'Note Revisione',
      'Stato Revisione',
      'Giorni a Scadenza Revisione',
    ];

    const rows = vehicles.map(v => {
      const insEval = evaluateExpiry(v.insuranceExpiry, 'Assicurazione');
      const inspEval = evaluateExpiry(v.inspectionExpiry, 'Revisione');

      const insStatus =
        insEval.status === 'scaduto'
          ? `SCADUTA (${Math.abs(insEval.daysLeft!)} gg fa)`
          : insEval.status === 'imminente'
          ? `IN SCADENZA (tra ${insEval.daysLeft} gg)`
          : insEval.status === 'regolare'
          ? 'REGOLARE'
          : 'NON SPECIFICATA';

      const inspStatus =
        inspEval.status === 'scaduto'
          ? `SCADUTA (${Math.abs(inspEval.daysLeft!)} gg fa)`
          : inspEval.status === 'imminente'
          ? `IN SCADENZA (tra ${inspEval.daysLeft} gg)`
          : inspEval.status === 'regolare'
          ? 'REGOLARE'
          : 'NON SPECIFICATA';

      return [
        `"${v.id}"`,
        `"${v.name.replace(/"/g, '""')}"`,
        `"${v.plate}"`,
        `"${(v.brandModel || '').replace(/"/g, '""')}"`,
        `"${v.type}"`,
        `"${v.status}"`,
        v.currentKm || 0,
        `"${v.insuranceExpiry || 'N/D'}"`,
        `"${(v.insuranceCompany || '').replace(/"/g, '""')}"`,
        `"${insStatus}"`,
        insEval.daysLeft !== null ? insEval.daysLeft : '',
        `"${v.inspectionExpiry || 'N/D'}"`,
        `"${(v.inspectionNotes || '').replace(/"/g, '""')}"`,
        `"${inspStatus}"`,
        inspEval.daysLeft !== null ? inspEval.daysLeft : '',
      ];
    });

    const csvContent =
      '\uFEFF' +
      headers.join(';') +
      '\n' +
      rows.map(r => r.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `viaggiabella_scadenze_flotta_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header e Selezione Mese */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Report & Statistiche Utilizzo
          </h2>
          <p className="text-xs text-slate-500">
            Riepiloghi periodici, chilometraggi per mezzo e per operatore, esportazioni CSV
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selettore Mese */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>

          {/* Esporta CSV Viaggi */}
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
            title="Esporta il dettaglio dei viaggi per il mese selezionato"
          >
            <Download className="w-4 h-4" />
            <span>CSV Viaggi Mese</span>
          </button>

          {/* Esporta CSV Scadenze Mezzi */}
          <button
            onClick={handleExportFleetExpiriesCsv}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
            title="Esporta foglio completo con date e stato di assicurazioni e revisioni"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Scadenze Mezzi</span>
          </button>

          {/* Stampa */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Stampa Report</span>
          </button>
        </div>
      </div>

      {/* KPI Mese */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Viaggi nel Mese
          </span>
          <div className="text-3xl font-black text-slate-900 mt-1 font-mono">
            {monthUsages.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Registrazioni salvate</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Km Percorsi nel Mese
          </span>
          <div className="text-3xl font-black text-blue-600 mt-1 font-mono">
            {totalMonthKm.toLocaleString()} km
          </div>
          <div className="text-xs text-slate-500 mt-1">Totale flotta cooperativa</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Operatori Coinvolti
          </span>
          <div className="text-3xl font-black text-purple-600 mt-1 font-mono">
            {Object.keys(driverMap).length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Conducenti attivi</div>
        </div>
      </div>

      {/* Tabelle Riepilogo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Riepilogo per Mezzo */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">
              Riepilogo Mensile per Mezzo
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Mezzo & Targa</th>
                  <th className="py-2.5 px-3 text-right">Viaggi</th>
                  <th className="py-2.5 px-3 text-right">Km Mese</th>
                  <th className="py-2.5 px-3">Scadenze RCA / Rev.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statsByVehicle.map(s => {
                  const insEval = evaluateExpiry(s.vehicle.insuranceExpiry, 'Assicurazione');
                  const inspEval = evaluateExpiry(s.vehicle.inspectionExpiry, 'Revisione');

                  return (
                    <tr key={s.vehicle.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{s.vehicle.name}</div>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.2 rounded border">
                          {s.vehicle.plate}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {s.tripsCount}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">
                        {s.totalKm} km
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${insEval.badgeClass}`}
                          >
                            RCA: {s.vehicle.insuranceExpiry || 'N/D'}
                            {insEval.status === 'scaduto' && ' ⚠️'}
                            {insEval.status === 'imminente' && ' ⏳'}
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${inspEval.badgeClass}`}
                          >
                            Rev: {s.vehicle.inspectionExpiry || 'N/D'}
                            {inspEval.status === 'scaduto' && ' ⚠️'}
                            {inspEval.status === 'imminente' && ' ⏳'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Riepilogo per Conducente */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-base text-slate-900">
              Riepilogo per Conducente
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Conducente</th>
                  <th className="py-2.5 px-3 text-right">Viaggi Effettuati</th>
                  <th className="py-2.5 px-3 text-right">Km Totali Percorsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(driverMap).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      Nessun viaggio registrato per il mese selezionato.
                    </td>
                  </tr>
                ) : (
                  Object.entries(driverMap).map(([driver, st]) => (
                    <tr key={driver} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{driver}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {st.count}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-purple-600">
                        {st.km} km
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
