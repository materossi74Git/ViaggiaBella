import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Truck,
  Gauge,
  Clock,
  ClipboardList,
  AlertTriangle,
  PlayCircle,
  TrendingUp,
  ShieldAlert,
  CheckCircle,
  Sparkles,
  Smartphone,
  Download,
  QrCode,
} from 'lucide-react';
import { VehicleUsage, Vehicle, CorrectionRequest } from '../../types';
import { ExpiryAlertsBanner } from './ExpiryAlertsBanner';
import { getFleetExpiryAlerts } from '../../services/expirationService';
import { FriendlyVanMascot } from '../common/FriendlyVanMascot';
import { AndroidAppGuideModal } from '../common/AndroidAppGuideModal';
import { APP_INFO } from '../../services/appUpdateService';
import { Info } from 'lucide-react';

interface AdminDashboardProps {
  usages: VehicleUsage[];
  vehicles: Vehicle[];
  requests: CorrectionRequest[];
  onNavigate: (tab: string) => void;
  onSelectUsage: (usage: VehicleUsage) => void;
  onOpenVersionInfo?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  usages,
  vehicles,
  requests,
  onNavigate,
  onSelectUsage,
  onOpenVersionInfo,
}) => {
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const activeTrips = usages.filter(u => u.status === 'in_corso');
  const pendingRequests = requests.filter(r => r.status === 'in_attesa');

  const totalKm = usages.reduce((acc, u) => acc + (u.distanceKm || 0), 0);
  const totalCompleted = usages.filter(u => u.status === 'completato').length;

  // Mezzi più utilizzati
  const vehicleUsageCount: Record<string, { name: string; plate: string; count: number; km: number }> = {};
  vehicles.forEach(v => {
    vehicleUsageCount[v.id] = { name: v.name, plate: v.plate, count: 0, km: 0 };
  });

  usages.forEach(u => {
    if (vehicleUsageCount[u.vehicleId]) {
      vehicleUsageCount[u.vehicleId].count += 1;
      vehicleUsageCount[u.vehicleId].km += u.distanceKm || 0;
    }
  });

  const sortedVehicles = Object.values(vehicleUsageCount).sort((a, b) => b.count - a.count);
  const fleetAlerts = getFleetExpiryAlerts(vehicles);

  return (
    <div className="space-y-6">
      {/* Header Dashboard con Mascotte Furgoncino */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Cooperativa Clarabella • ViaggiaBella</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Pannello Amministrativo Flotta
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoraggio in tempo reale, scadenze manutentive, autorizzazioni e controllo utilizzi mezzi
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <FriendlyVanMascot mood="idle" size="sm" showCaption captionText="Flotta OK" />
        </div>
      </div>

      {/* Banner Allerta Scadenze Assicurazioni e Revisioni (almeno 30 gg prima) */}
      <ExpiryAlertsBanner
        vehicles={vehicles}
        onManageVehicle={() => onNavigate('admin-vehicles')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Viaggi in Corso */}
        <div
          onClick={() => onNavigate('admin-usages')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all tap-bounce"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Corso Ora
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {activeTrips.length}
          </div>
          <div className="text-xs text-teal-700 font-semibold mt-1 flex items-center">
            <span className="w-2 h-2 rounded-full bg-teal-500 mr-1.5 animate-ping"></span>
            Mezzi fuori sede
          </div>
        </div>

        {/* Totale Viaggi */}
        <div
          onClick={() => onNavigate('admin-usages')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all tap-bounce"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Viaggi Registrati
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {usages.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalCompleted} completati regolarmente
          </div>
        </div>

        {/* Chilometri Totali */}
        <div
          onClick={() => onNavigate('admin-reports')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all tap-bounce"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Km Percorsi Totali
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {totalKm.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Calcolati automaticamente
          </div>
        </div>

        {/* Richieste di Correzione */}
        <div
          onClick={() => onNavigate('admin-requests')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Richieste Correzione
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {pendingRequests.length}
          </div>
          <div className="text-xs text-amber-600 font-semibold mt-1">
            {pendingRequests.length > 0
              ? 'Da valutare e approvare'
              : 'Nessuna richiesta in attesa'}
          </div>
        </div>

        {/* Parco Mezzi */}
        <div
          onClick={() => onNavigate('admin-vehicles')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Flotta Veicoli
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {vehicles.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {vehicles.filter(v => v.status === 'attivo').length} attivi con QR code
          </div>
        </div>

        {/* Scadenze Imminenti (Assicurazioni & Revisioni) */}
        <div
          onClick={() => onNavigate('admin-vehicles')}
          className={`rounded-3xl p-5 border shadow-sm hover:shadow-md cursor-pointer transition-all ${
            fleetAlerts.length > 0
              ? 'bg-rose-50/60 border-rose-300'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Scadenze RCA / Rev.
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                fleetAlerts.length > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-3xl font-black mt-2 ${
              fleetAlerts.length > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {fleetAlerts.length}
          </div>
          <div
            className={`text-xs font-semibold mt-1 ${
              fleetAlerts.length > 0 ? 'text-rose-700' : 'text-emerald-600'
            }`}
          >
            {fleetAlerts.length > 0 ? 'Richiede verifica' : 'Tutte regolari (>30gg)'}
          </div>
        </div>
      </div>

      {/* Banner App Android & Distribuzione Autisti */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-5 border border-slate-700/60 shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">
                App Android & Accesso Autisti ViaggiaBella
              </h3>
              <span className="text-[10px] bg-teal-500/30 text-teal-200 font-extrabold px-2 py-0.5 rounded-full border border-teal-400/40">
                Web App + APK
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
              Puoi distribuire ViaggiaBella agli autisti tramite <strong>installazione immediata PWA</strong> (con QR code) oppure tramite <strong>pacchetto APK</strong>, mantenendo il backoffice su PC sincronizzato in tempo reale.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setAndroidModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-950 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Guida APK & QR Autisti</span>
          </button>
        </div>
      </div>

      {/* Viaggi attualmente in corso */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-bold text-base text-slate-900">
              Viaggi Attualmente Fuori Sede ({activeTrips.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('admin-usages')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Vedi tutte le registrazioni →
          </button>
        </div>

        {activeTrips.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
            Al momento tutti i mezzi risultano regolarmente rientrati e disponibili in sede.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTrips.map(trip => (
              <div
                key={trip.id}
                onClick={() => onSelectUsage(trip)}
                className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer transition-all flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                      {trip.vehiclePlate}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-800">
                      Iniziato alle {trip.startTime}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 mt-2">
                    {trip.vehicleName}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Conducente: <strong>{trip.driverName}</strong>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Destinazione: {trip.destination} ({trip.reason})
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800 font-medium">
                  <span>Km Partenza: {trip.startKm}</span>
                  <span className="text-blue-600 font-semibold">Dettaglio →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mezzi più utilizzati & Richieste urgenti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mezzi più utilizzati */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900">
              Utilizzi per Mezzo
            </h3>
            <button
              onClick={() => onNavigate('admin-reports')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Report completo →
            </button>
          </div>

          <div className="space-y-3">
            {sortedVehicles.slice(0, 5).map((v, i) => {
              const maxCount = sortedVehicles[0]?.count || 1;
              const percentage = Math.round((v.count / maxCount) * 100);

              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">
                      {v.name} ({v.plate})
                    </span>
                    <span className="font-mono text-slate-500">
                      <strong>{v.count}</strong> viaggi ({v.km} km)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Richieste di correzione pendenti */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900">
              Richieste di Correzione da Gestire
            </h3>
            <button
              onClick={() => onNavigate('admin-requests')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Gestisci tutte ({pendingRequests.length}) →
            </button>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
              Nessuna richiesta di correzione pendente. Tutti i viaggi risultano convalidati.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingRequests.slice(0, 4).map(req => (
                <div
                  key={req.id}
                  onClick={() => onNavigate('admin-requests')}
                  className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 hover:bg-amber-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{req.vehicleName}</span>
                    <span className="text-amber-800 font-semibold">Richiedente: {req.driverName}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                    Motivo: "{req.reason}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Box Info Versione & Stato Sistema */}
      <div className="bg-slate-900 rounded-3xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
            <Info className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Stato Installazione ViaggiaBella</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-300 border border-teal-400/40">
                v{APP_INFO.version} (build {APP_INFO.versionCode})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Build stabile release 30 Ottobre 2026 • Sincronizzazione automatica Cloud Firestore attiva
            </p>
          </div>
        </div>

        {onOpenVersionInfo && (
          <button
            type="button"
            onClick={onOpenVersionInfo}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs flex items-center space-x-1.5 transition-all tap-bounce shrink-0"
          >
            <span>Dettagli Versione & Piattaforma</span>
          </button>
        )}
      </div>

      {/* Modale Guida Android & Distribuzione APK */}
      <AndroidAppGuideModal
        isOpen={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
      />
    </div>
  );
};
