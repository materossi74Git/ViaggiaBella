import React from 'react';
import { AlertTriangle, ShieldAlert, Calendar, ArrowRight, ShieldCheck, Wrench } from 'lucide-react';
import { Vehicle } from '../../types';
import { getFleetExpiryAlerts, VehicleAlertSummary } from '../../services/expirationService';

interface ExpiryAlertsBannerProps {
  vehicles: Vehicle[];
  onManageVehicle: (vehicle: Vehicle) => void;
}

export const ExpiryAlertsBanner: React.FC<ExpiryAlertsBannerProps> = ({
  vehicles,
  onManageVehicle,
}) => {
  const alerts = getFleetExpiryAlerts(vehicles);

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex items-center justify-between text-xs text-emerald-800">
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <span className="font-bold text-emerald-950">
              Tutte le assicurazioni e le revisioni dei mezzi sono regolari.
            </span>
            <span className="text-emerald-700 ml-1.5 hidden sm:inline">
              Nessuna scadenza prevista nei prossimi 30 giorni.
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-white font-semibold rounded-xl border border-emerald-200 text-emerald-800 text-[11px]">
          Flotta in regola
        </span>
      </div>
    );
  }

  const expiredCount = alerts.filter(
    a => a.insurance.status === 'scaduto' || a.inspection.status === 'scaduto'
  ).length;
  const imminentCount = alerts.length - expiredCount;

  return (
    <div
      className={`rounded-3xl p-5 border shadow-md space-y-3.5 transition-all animate-in fade-in ${
        expiredCount > 0
          ? 'bg-rose-50/90 border-rose-300 shadow-rose-500/10'
          : 'bg-amber-50/90 border-amber-300 shadow-amber-500/10'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-rose-200/60">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              expiredCount > 0
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
            }`}
          >
            {expiredCount > 0 ? (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-sm sm:text-base text-slate-900 leading-tight">
                {expiredCount > 0
                  ? 'Allerta Prioritaria: Scadenze Superate e Imminenti'
                  : 'Avviso di Scadenza Ravvicinata Mezzi'}
              </h3>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  expiredCount > 0 ? 'bg-rose-600 text-white' : 'bg-amber-400 text-slate-950'
                }`}
              >
                {alerts.length} {alerts.length === 1 ? 'Mezzo' : 'Mezzi'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Controllo preventivo a 30 giorni: verificare polizze RCA e collaudi MCTC per garantire la circolazione in sicurezza.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          {expiredCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-200 text-rose-900 border border-rose-300">
              {expiredCount} Scaduto/i
            </span>
          )}
          {imminentCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-200 text-amber-950 border border-amber-300">
              {imminentCount} Entro 30 gg
            </span>
          )}
        </div>
      </div>

      {/* Schede dei singoli mezzi in allerta */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map(item => {
          const { vehicle, insurance, inspection } = item;
          const isExpired = insurance.status === 'scaduto' || inspection.status === 'scaduto';

          return (
            <div
              key={vehicle.id}
              className={`p-4 rounded-2xl bg-white border transition-all flex flex-col justify-between space-y-3 ${
                isExpired
                  ? 'border-rose-400/80 shadow-sm'
                  : 'border-amber-300/80 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border text-slate-800">
                    {vehicle.plate}
                  </span>
                  <span className="text-[11px] text-slate-500 capitalize">{vehicle.type}</span>
                </div>

                <div className="font-extrabold text-sm text-slate-900 mt-1.5 leading-tight">
                  {vehicle.name}
                </div>

                {/* Dettaglio Assicurazione */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Assicurazione:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] border ${insurance.badgeClass}`}
                    >
                      {insurance.badgeLabel}
                    </span>
                  </div>
                  {vehicle.insuranceCompany && (
                    <div className="text-[10px] text-slate-400 pl-4.5 -mt-1 truncate">
                      Compagnia: {vehicle.insuranceCompany}
                    </div>
                  )}

                  {/* Dettaglio Revisione */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600 flex items-center">
                      <Wrench className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Revisione MCTC:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] border ${inspection.badgeClass}`}
                    >
                      {inspection.badgeLabel}
                    </span>
                  </div>
                  {vehicle.inspectionNotes && (
                    <div className="text-[10px] text-slate-400 pl-4.5 -mt-1 truncate">
                      {vehicle.inspectionNotes}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onManageVehicle(vehicle)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1"
              >
                <span>Gestisci & Rinnova</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
