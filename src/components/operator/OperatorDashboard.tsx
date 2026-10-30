import React, { useState } from 'react';
import {
  PlayCircle,
  Camera,
  FileEdit,
  Radio,
  Car,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Vehicle, VehicleUsage, AppUser, AppSettings } from '../../types';
import { OngoingTripCard } from './OngoingTripCard';
import { MyUsagesList } from './MyUsagesList';
import { checkNfcSupport, startNfcScan } from '../../services/nfcService';
import { FriendlyVanMascot } from '../common/FriendlyVanMascot';
import { APP_INFO } from '../../services/appUpdateService';

interface OperatorDashboardProps {
  user: AppUser;
  vehicles: Vehicle[];
  usages: VehicleUsage[];
  settings: AppSettings;
  ongoingTrip: VehicleUsage | null;
  scannedVehicle?: Vehicle | null;
  onClearScannedVehicle?: () => void;
  onVehicleScanned?: (vehicle: Vehicle) => void;
  onStartTripModalOpen: (vehicle?: Vehicle) => void;
  onManualFormOpen: (vehicle?: Vehicle) => void;
  onQrScannerOpen: () => void;
  onFinishTripOpen: (usage: VehicleUsage) => void;
  onEditTripOpen: (usage: VehicleUsage) => void;
  onRequestCorrectionOpen: (usage: VehicleUsage) => void;
  onOpenVersionInfo?: () => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  user,
  vehicles,
  usages,
  settings,
  ongoingTrip,
  scannedVehicle,
  onClearScannedVehicle,
  onVehicleScanned,
  onStartTripModalOpen,
  onManualFormOpen,
  onQrScannerOpen,
  onFinishTripOpen,
  onEditTripOpen,
  onRequestCorrectionOpen,
  onOpenVersionInfo,
}) => {
  const [internalScannedVehicle, setInternalScannedVehicle] = useState<Vehicle | null>(null);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcFeedback, setNfcFeedback] = useState<string | null>(null);
  const [showSecondaryFleetDuringTrip, setShowSecondaryFleetDuringTrip] = useState(false);

  const activeScannedVehicle = scannedVehicle || internalScannedVehicle;
  const nfcSupport = checkNfcSupport();

  const handleNfcClick = async () => {
    if (!nfcSupport.supported) {
      setNfcFeedback(nfcSupport.message);
      return;
    }

    setNfcScanning(true);
    setNfcFeedback('Avvicina il retro dello smartphone al tag NFC del veicolo...');

    const stop = await startNfcScan(
      (tagId: string) => {
        setNfcScanning(false);
        let target = tagId.trim();
        if (target.includes('vehicleId=')) {
          const match = target.match(/vehicleId=([^&]+)/);
          if (match) target = match[1];
        } else if (target.startsWith('viaggiabella://vehicle/')) {
          target = target.replace('viaggiabella://vehicle/', '');
        }

        const matched = vehicles.find(
          v =>
            v.nfcTagId === target ||
            v.qrCodeId === target ||
            v.id === target ||
            v.plate.replace(/\s+/g, '').toUpperCase() === target.replace(/\s+/g, '').toUpperCase()
        );
        if (matched) {
          setInternalScannedVehicle(matched);
          if (onVehicleScanned) onVehicleScanned(matched);
          setNfcFeedback(`Mezzo riconosciuto via NFC: ${matched.name} (${matched.plate})`);
          setTimeout(() => {
            setNfcFeedback(null);
            onStartTripModalOpen(matched);
          }, 700);
        } else {
          setNfcFeedback(`Tag letto (${tagId}), ma nessun mezzo associato trovato.`);
        }
        stop();
      },
      (err: string) => {
        setNfcScanning(false);
        setNfcFeedback(err);
      }
    );
  };

  const activeVehicles = vehicles.filter(v => v.status === 'attivo');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ============================================================== */}
      {/* CASO 1: VIAGGIO IN CORSO ATTIVO - SCHERMATA CONTESTUALE FOCALIZZATA */}
      {/* ============================================================== */}
      {ongoingTrip ? (
        <div className="space-y-6">
          {/* Scheda Viaggio In Corso in Primo Piano Assoluto */}
          <OngoingTripCard usage={ongoingTrip} onFinishClick={onFinishTripOpen} />

          {/* Scheda di rassicurazione e guida operativa */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Registrazione attiva per la cooperativa
                </h3>
                <p className="text-xs text-slate-500">
                  Il viaggio rimarrà aperto finché non premerai "Termina Viaggio". Buon servizio!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSecondaryFleetDuringTrip(!showSecondaryFleetDuringTrip)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center space-x-1.5 self-start sm:self-center py-2 px-3 rounded-xl hover:bg-slate-50 border border-slate-200 tap-bounce"
            >
              <span>{showSecondaryFleetDuringTrip ? 'Nascondi altri strumenti' : 'Mostra flotta & inserimento manuale'}</span>
              {showSecondaryFleetDuringTrip ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Strumenti secondari opzionali (mostrati solo se richiesti per evitare sovraccarico) */}
          {showSecondaryFleetDuringTrip && (
            <div className="space-y-6 animate-in fade-in duration-200 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onManualFormOpen()}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all flex items-center space-x-3 tap-bounce"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">Registra Viaggio Concluso Passato</div>
                    <div className="text-[11px] text-slate-500">Inserimento manuale con orari e km già noti</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onQrScannerOpen}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all flex items-center space-x-3 tap-bounce"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">Inquadra QR Mezzo</div>
                    <div className="text-[11px] text-slate-500">Scansiona codice QR di un altro veicolo</div>
                  </div>
                </button>
              </div>

              {/* Elenco Mezzi compatto */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Altri Mezzi della Cooperativa
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeVehicles.length} veicoli attivi
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeVehicles.map(vehicle => (
                    <div
                      key={vehicle.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{vehicle.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{vehicle.plate} · {vehicle.currentKm} km</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onStartTripModalOpen(vehicle)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-teal-700 hover:bg-teal-600 text-white rounded-xl tap-bounce"
                      >
                        Seleziona
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Storico Recente dell'operatore */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-slate-900">I Tuoi Ultimi Viaggi</h3>
              <span className="text-xs text-slate-500">Modificabili entro 30 minuti</span>
            </div>
            <MyUsagesList
              usages={usages}
              user={user}
              onEditClick={onEditTripOpen}
              onFinishClick={onFinishTripOpen}
              onRequestCorrectionClick={onRequestCorrectionOpen}
            />
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* CASO 2: NESSUN VIAGGIO IN CORSO - SCHERMATA DI PARTENZA INVITANTE */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Banner Compatto e Confidenziale con Mascotte Furgoncino */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-teal-700/40 relative overflow-hidden flex items-center justify-between gap-4">
            <div className="relative z-10 max-w-xl space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-[11px] font-bold border border-teal-400/30">
                <Sparkles className="w-3 h-3 text-teal-300" />
                <span>Pronto a partire</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Ciao {user.displayName ? user.displayName.trim().split(/\s+/)[0] : 'collega'}!
              </h1>
              <p className="text-xs text-teal-100/90 leading-snug">
                Scegli il mezzo da utilizzare e parti in serenità.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <FriendlyVanMascot mood="idle" size="sm" />
            </div>
          </div>

          {/* Banner Mezzo Scansionato se presente */}
          {activeScannedVehicle && (
            <div className="p-3.5 bg-teal-50 border border-teal-300 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                  🚐
                </div>
                <div>
                  <div className="text-xs text-teal-950 font-black">
                    Mezzo Scansionato: {activeScannedVehicle.name} ({activeScannedVehicle.plate})
                  </div>
                  <div className="text-[11px] text-teal-700">
                    Pronto a partire · Lettura GPS automatica alla partenza (nessun km da inserire)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInternalScannedVehicle(null);
                  if (onClearScannedVehicle) onClearScannedVehicle();
                }}
                className="text-xs text-teal-800 hover:text-teal-950 underline font-bold px-2 py-1 rounded-lg hover:bg-teal-100 transition-colors"
              >
                Cambia mezzo
              </button>
            </div>
          )}

          {/* Griglia Azioni Primarie Ergonomiche (Mobile First, Thumb Friendly) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Inizia Utilizzo ORA (Modalità B - Pulsanti e Timestamp Automatico) */}
            <button
              type="button"
              onClick={() => onStartTripModalOpen(activeScannedVehicle || undefined)}
              className={`p-6 text-white rounded-3xl shadow-lg text-left transition-all flex flex-col justify-between min-h-[170px] border tap-bounce group relative overflow-hidden ${
                activeScannedVehicle
                  ? 'bg-gradient-to-br from-emerald-700 via-teal-800 to-teal-950 border-emerald-400/50 shadow-emerald-950/30 ring-2 ring-emerald-400/30'
                  : 'bg-gradient-to-br from-teal-700 to-teal-900 hover:from-teal-600 hover:to-teal-800 border-teal-500/40 shadow-teal-900/20'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                  <PlayCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center space-x-1.5">
                  {activeScannedVehicle && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 px-2 py-0.5 rounded-lg">
                      {activeScannedVehicle.plate}
                    </span>
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-white/15 px-2.5 py-1 rounded-xl text-teal-100 border border-white/20">
                    Modalità B Rapida
                  </span>
                </div>
              </div>
              <div className="pt-4">
                <div className="font-black text-xl text-white leading-tight flex items-center gap-2">
                  <span className="truncate">
                    {activeScannedVehicle
                      ? `Inizia viaggio ora: ${activeScannedVehicle.name}`
                      : 'Inizia Viaggio ORA'}
                  </span>
                  <ArrowRight className="w-5 h-5 text-teal-300 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
                <div className="text-xs text-teal-100/90 mt-1">
                  {activeScannedVehicle
                    ? `Partenza immediata per ${activeScannedVehicle.name} · Rilevamento punto GPS automatico`
                    : 'Orario automatico, lettura GPS e partenza immediata'}
                </div>
              </div>
            </button>

            {/* 2. Inquadra QR Code del Veicolo */}
            <button
              type="button"
              onClick={onQrScannerOpen}
              className="p-6 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl shadow-lg shadow-slate-950/20 text-left transition-all flex flex-col justify-between min-h-[170px] border border-slate-700 tap-bounce group relative overflow-hidden"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-13 h-13 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center group-hover:scale-105 transition-transform text-teal-300">
                  <Camera className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-800 px-2.5 py-1 rounded-xl text-teal-300 border border-slate-700">
                  Fotocamera
                </span>
              </div>
              <div className="pt-4">
                <div className="font-black text-xl text-white leading-tight flex items-center gap-2">
                  <span>Inquadra QR Code Mezzo</span>
                  <ArrowRight className="w-5 h-5 text-teal-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Riconosce il mezzo istantaneamente dal cartellino a bordo
                </div>
              </div>
            </button>
          </div>

          {/* Modalità Secondarie: Inserimento Manuale & NFC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Inserimento Manuale (Modalità A) */}
            <button
              type="button"
              onClick={() => onManualFormOpen()}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-left transition-all flex items-center space-x-3.5 tap-bounce shadow-sm hover:shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <FileEdit className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900 truncate">Inserimento Manuale</div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Modalità A</span>
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  Registra un viaggio già concluso con orari e km
                </div>
              </div>
            </button>

            {/* Lettura Tag NFC */}
            <button
              type="button"
              onClick={handleNfcClick}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-left transition-all flex items-center space-x-3.5 tap-bounce shadow-sm hover:shadow"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  nfcScanning ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-teal-50 text-teal-700'
                }`}
              >
                <Radio className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900 truncate">Avvicina Tag NFC</div>
                  <span className="text-[10px] font-semibold text-teal-700 uppercase">
                    {nfcSupport.supported ? 'NFC Disponibile' : 'NFC'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {nfcSupport.supported
                    ? 'Tocca il tag del cruscotto con lo smartphone'
                    : 'Info compatibilità tag NFC'}
                </div>
              </div>
            </button>
          </div>

          {/* Feedback temporaneo NFC */}
          {nfcFeedback && (
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between animate-in fade-in">
              <span>{nfcFeedback}</span>
              <button
                type="button"
                onClick={() => setNfcFeedback(null)}
                className="text-teal-700 font-bold ml-3 text-xs underline"
              >
                Chiudi
              </button>
            </div>
          )}

          {/* Selezione Rapida Parco Mezzi Cooperativa */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Parco Mezzi Cooperativa
                  </h3>
                  <div className="text-xs text-slate-500">
                    Seleziona direttamente un mezzo per avviare il servizio
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                {activeVehicles.length} attivi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {activeVehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-teal-400 bg-slate-50/50 hover:bg-teal-50/20 transition-all flex flex-col justify-between space-y-3.5 group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-900">
                        {vehicle.plate}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {vehicle.currentKm} km
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 mt-2">
                      {vehicle.name}
                    </div>
                    <div className="text-xs text-slate-500">{vehicle.brandModel}</div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => onStartTripModalOpen(vehicle)}
                      className="flex-1 min-h-[40px] bg-teal-700 hover:bg-teal-600 active:scale-98 text-white rounded-xl text-xs font-bold transition-all text-center tap-bounce"
                    >
                      Inizia ORA
                    </button>
                    <button
                      type="button"
                      onClick={() => onManualFormOpen(vehicle)}
                      className="min-h-[40px] px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors tap-bounce"
                      title="Inserisci viaggio concluso per questo mezzo"
                    >
                      Manuale
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* I Miei Utilizzi Recenti */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-base text-slate-900">I Miei Viaggi Recenti</h3>
              <span className="text-xs text-slate-500">Modificabili entro 30 minuti</span>
            </div>
            <MyUsagesList
              usages={usages}
              user={user}
              onEditClick={onEditTripOpen}
              onFinishClick={onFinishTripOpen}
              onRequestCorrectionClick={onRequestCorrectionOpen}
            />
          </div>
        </div>
      )}

      {/* Barra Informativa Stato Versione Installata */}
      <div className="pt-4 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Versione applicazione installata:{' '}
            <strong className="text-slate-800 font-mono">v{APP_INFO.version}</strong>{' '}
            <span className="text-[11px] text-slate-400">(build {APP_INFO.versionCode})</span>
          </span>
        </div>
        {onOpenVersionInfo && (
          <button
            type="button"
            onClick={onOpenVersionInfo}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-teal-800 border border-slate-200 font-bold text-xs shadow-2xs transition-all tap-bounce"
          >
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>Dettagli Versione & Novità</span>
          </button>
        )}
      </div>
    </div>
  );
};
