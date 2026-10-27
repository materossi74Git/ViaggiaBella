import React, { useState } from 'react';
import QRCode from 'qrcode';
import {
  Truck,
  Plus,
  QrCode,
  Edit,
  Trash2,
  Printer,
  X,
  Check,
  AlertCircle,
  Radio,
  Car,
  ShieldAlert,
  Wrench,
  Calendar,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { Vehicle, VehicleType, AppUser } from '../../types';
import { saveVehicle, deleteVehicle } from '../../services/dbService';
import { evaluateExpiry, evaluateVehicleAlerts, getFleetExpiryAlerts } from '../../services/expirationService';
import { ExpiryAlertsBanner } from './ExpiryAlertsBanner';
import { NfcTagWriterModal } from '../nfc/NfcTagWriterModal';

interface VehiclesManagerProps {
  vehicles: Vehicle[];
  adminUser: AppUser;
}

export const VehiclesManager: React.FC<VehiclesManagerProps> = ({ vehicles, adminUser }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [filterTab, setFilterTab] = useState<'tutti' | 'allerte' | 'attivi' | 'inattivi'>('tutti');

  // Form stato
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [type, setType] = useState<VehicleType>('furgone');
  const [status, setStatus] = useState<'attivo' | 'inattivo'>('attivo');
  const [qrCodeId, setQrCodeId] = useState('');
  const [nfcTagId, setNfcTagId] = useState('');
  const [currentKm, setCurrentKm] = useState<number>(0);
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [inspectionExpiry, setInspectionExpiry] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR & NFC Modal
  const [qrModalVehicle, setQrModalVehicle] = useState<Vehicle | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [nfcModalVehicle, setNfcModalVehicle] = useState<Vehicle | null>(null);

  // Chiudi con tasto Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (qrModalVehicle) setQrModalVehicle(null);
        if (nfcModalVehicle) setNfcModalVehicle(null);
      }
    };
    if (modalOpen || qrModalVehicle || nfcModalVehicle) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, qrModalVehicle, nfcModalVehicle]);

  const openAddModal = () => {
    setEditingVehicle(null);
    setName('');
    setPlate('');
    setBrandModel('');
    setType('furgone');
    setStatus('attivo');
    const autoQr = 'coop-veh-' + (vehicles.length + 1).toString().padStart(2, '0');
    setQrCodeId(autoQr);
    setNfcTagId('');
    setCurrentKm(0);
    setInsuranceExpiry('');
    setInsuranceCompany('');
    setInspectionExpiry('');
    setInspectionNotes('');
    setNotes('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setName(v.name);
    setPlate(v.plate);
    setBrandModel(v.brandModel || '');
    setType(v.type);
    setStatus(v.status);
    setQrCodeId(v.qrCodeId);
    setNfcTagId(v.nfcTagId || '');
    setCurrentKm(v.currentKm || 0);
    setInsuranceExpiry(v.insuranceExpiry || '');
    setInsuranceCompany(v.insuranceCompany || '');
    setInspectionExpiry(v.inspectionExpiry || '');
    setInspectionNotes(v.inspectionNotes || '');
    setNotes(v.notes || '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim() || !plate.trim() || !qrCodeId.trim()) {
      setErrorMsg('Compila tutti i campi obbligatori contrassegnati con asterisco.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const vToSave: Vehicle = {
        id: editingVehicle ? editingVehicle.id : '',
        name: name.trim(),
        plate: plate.trim().toUpperCase(),
        brandModel: brandModel.trim(),
        type,
        status,
        qrCodeId: qrCodeId.trim(),
        nfcTagId: nfcTagId.trim() || undefined,
        currentKm: Number(currentKm) || 0,
        insuranceExpiry: insuranceExpiry.trim() || undefined,
        insuranceCompany: insuranceCompany.trim() || undefined,
        inspectionExpiry: inspectionExpiry.trim() || undefined,
        inspectionNotes: inspectionNotes.trim() || undefined,
        notes: notes.trim(),
        createdAt: editingVehicle ? editingVehicle.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveVehicle(vToSave, adminUser);
      setModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante il salvataggio del mezzo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (confirm(`Sei sicuro di voler eliminare il mezzo "${v.name}" (${v.plate})?`)) {
      try {
        await deleteVehicle(v.id, adminUser);
      } catch (err: any) {
        alert(err?.message || 'Errore durante l\'eliminazione del mezzo.');
      }
    }
  };

  const openQrBadge = async (v: Vehicle) => {
    setQrModalVehicle(v);
    try {
      const url = await QRCode.toDataURL(v.qrCodeId, {
        width: 300,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Errore generazione QR:', err);
    }
  };

  const handlePrintBadge = () => {
    window.print();
  };

  // Filtro veicoli
  const fleetAlerts = getFleetExpiryAlerts(vehicles);

  const filteredVehicles = vehicles.filter(v => {
    if (filterTab === 'allerte') {
      const alerts = evaluateVehicleAlerts(v);
      return alerts.hasUrgentAlert;
    }
    if (filterTab === 'attivi') return v.status === 'attivo';
    if (filterTab === 'inattivi') return v.status === 'inattivo';
    return true;
  });

  // Valutazione live nel form per feedback immediato
  const liveInsuranceEval = evaluateExpiry(insuranceExpiry, 'Assicurazione');
  const liveInspectionEval = evaluateExpiry(inspectionExpiry, 'Revisione');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Anagrafica Parco Mezzi & Scadenze
          </h2>
          <p className="text-xs text-slate-500">
            Monitoraggio assicurazioni RCA, revisioni MCTC, codici QR e tag NFC
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center space-x-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Aggiungi Nuovo Mezzo</span>
        </button>
      </div>

      {/* Banner Allerte Scadenze Ravvicinate */}
      <ExpiryAlertsBanner
        vehicles={vehicles}
        onManageVehicle={v => openEditModal(v)}
      />

      {/* Schede Filtro */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilterTab('tutti')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'tutti'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tutti i Mezzi ({vehicles.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('allerte')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            filterTab === 'allerte'
              ? 'bg-rose-600 text-white shadow-sm'
              : fleetAlerts.length > 0
              ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Scadenze Imminenti / Scadute ({fleetAlerts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('attivi')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'attivi'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Attivi ({vehicles.filter(v => v.status === 'attivo').length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('inattivi')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'inattivi'
              ? 'bg-slate-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Non Attivi ({vehicles.filter(v => v.status === 'inattivo').length})
        </button>
      </div>

      {/* Griglia Veicoli */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map(v => {
          const alerts = evaluateVehicleAlerts(v);
          const hasUrgent = alerts.hasUrgentAlert;

          return (
            <div
              key={v.id}
              className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                hasUrgent
                  ? alerts.insurance.status === 'scaduto' || alerts.inspection.status === 'scaduto'
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-amber-300 bg-amber-50/20'
                  : v.status === 'attivo'
                  ? 'border-slate-200/90'
                  : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                    {v.plate}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {hasUrgent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Scadenza!
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        v.status === 'attivo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {v.status === 'attivo' ? 'Attivo' : 'Non Attivo'}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-base text-slate-900">{v.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {v.brandModel || 'Modello non specificato'} • Tipologia:{' '}
                  <span className="capitalize">{v.type}</span>
                </p>

                {/* Box Scadenze Assicurazione e Revisione */}
                <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  {/* Assicurazione */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-blue-600 flex-shrink-0" />
                      Assicurazione:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] border ${alerts.insurance.badgeClass}`}
                    >
                      {alerts.insurance.badgeLabel}
                    </span>
                  </div>
                  {v.insuranceCompany && (
                    <div className="text-[10px] text-slate-400 pl-5 -mt-1 truncate">
                      {v.insuranceCompany}
                    </div>
                  )}

                  {/* Revisione */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-600 flex items-center">
                      <Wrench className="w-3.5 h-3.5 mr-1.5 text-amber-600 flex-shrink-0" />
                      Revisione:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] border ${alerts.inspection.badgeClass}`}
                    >
                      {alerts.inspection.badgeLabel}
                    </span>
                  </div>
                  {v.inspectionNotes && (
                    <div className="text-[10px] text-slate-400 pl-5 -mt-1 truncate">
                      {v.inspectionNotes}
                    </div>
                  )}
                </div>

                {/* Informazioni Chilometraggio e Codici */}
                <div className="mt-2.5 px-3 py-2 bg-white rounded-xl border border-slate-200/60 flex justify-between items-center text-xs text-slate-600">
                  <span>Km attuali: <strong className="font-mono text-slate-900">{v.currentKm}</strong></span>
                  <span className="font-mono text-[11px] text-slate-400">QR: {v.qrCodeId}</span>
                </div>

                {v.notes && (
                  <p className="text-[11px] text-slate-400 italic mt-2 line-clamp-2">
                    "{v.notes}"
                  </p>
                )}
              </div>

              {/* Azioni Mezzo */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openQrBadge(v)}
                  className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                  title="Genera e stampa cartellino QR per il cruscotto"
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cartellino QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNfcModalVehicle(v)}
                  className="py-2 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                  title="Scrivi o programma la scheda NFC di questo veicolo"
                >
                  <Radio className="w-3.5 h-3.5 text-teal-700" />
                  <span>Scrivi NFC</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => openEditModal(v)}
                  className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-xs font-medium flex items-center justify-center space-x-1"
                  title="Modifica mezzo e date scadenze"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Modifica Dati & Scadenze</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(v)}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                  title="Elimina mezzo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale Aggiungi / Modifica Mezzo */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-teal-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    {editingVehicle ? 'Modifica Mezzo & Scadenze' : 'Nuovo Mezzo'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configurazione veicolo, RCA e revisione MCTC</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors tap-bounce"
                title="Chiudi finestra (Esc)"
                aria-label="Chiudi finestra"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Identificativo Mezzo * (es. "Furgone Ducato 1")
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nome del mezzo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Targa *
                  </label>
                  <input
                    type="text"
                    value={plate}
                    onChange={e => setPlate(e.target.value.toUpperCase())}
                    placeholder="ES: FS123AB"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipologia Veicolo
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as VehicleType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="auto">Autovettura</option>
                    <option value="furgone">Furgone merci</option>
                    <option value="pulmino">Pulmino 9 posti</option>
                    <option value="speciale">Attrezzato Disabili / Speciale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca e Modello
                  </label>
                  <input
                    type="text"
                    value={brandModel}
                    onChange={e => setBrandModel(e.target.value)}
                    placeholder="Es. Fiat Ducato 2.3 Multijet"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chilometraggio Corrente (Km)
                  </label>
                  <input
                    type="number"
                    value={currentKm}
                    onChange={e => setCurrentKm(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    required
                  />
                </div>
              </div>

              {/* SEZIONE SCADENZE ASSICURAZIONE & REVISIONE */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Scadenze Assicurazione & Revisione
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border">
                    Allerta 30 gg
                  </span>
                </div>

                {/* Assicurazione RCA */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Scadenza Assicurazione RCA
                    </label>
                    {insuranceExpiry && (
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${liveInsuranceEval.badgeClass}`}>
                        {liveInsuranceEval.badgeLabel}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={insuranceExpiry}
                      onChange={e => setInsuranceExpiry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={insuranceCompany}
                      onChange={e => setInsuranceCompany(e.target.value)}
                      placeholder="Compagnia (es. UnipolSai, Generali)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Revisione Periodica MCTC */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Scadenza Revisione Periodica MCTC
                    </label>
                    {inspectionExpiry && (
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${liveInspectionEval.badgeClass}`}>
                        {liveInspectionEval.badgeLabel}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={inspectionExpiry}
                      onChange={e => setInspectionExpiry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={inspectionNotes}
                      onChange={e => setInspectionNotes(e.target.value)}
                      placeholder="Note/Officina autorizzata"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID Codice QR *
                  </label>
                  <input
                    type="text"
                    value={qrCodeId}
                    onChange={e => setQrCodeId(e.target.value)}
                    placeholder="es. coop-veh-01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID Tag NFC (Facoltativo)
                  </label>
                  <input
                    type="text"
                    value={nfcTagId}
                    onChange={e => setNfcTagId(e.target.value)}
                    placeholder="es. nfc-ducato-01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stato del Veicolo
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      checked={status === 'attivo'}
                      onChange={() => setStatus('attivo')}
                      className="text-emerald-600"
                    />
                    <span className="font-medium text-emerald-800">Attivo e disponibile</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      checked={status === 'inattivo'}
                      onChange={() => setStatus('inattivo')}
                      className="text-slate-600"
                    />
                    <span className="text-slate-600">Non attivo (in manutenzione/fermo)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note Mezzo
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Note, posizione chiavi, dotazioni particolari..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              </div>

              {/* Footer Fisso con Annulla + Salva Mezzo */}
              <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors tap-bounce"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5 tap-bounce disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvataggio...' : 'Salva Mezzo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Cartellino QR Stampabile per Parabrezza / Cruscotto */}
      {qrModalVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setQrModalVehicle(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 text-slate-900 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <h3 className="font-extrabold text-sm">Cartellino QR Veicolo</h3>
              <button
                type="button"
                onClick={() => setQrModalVehicle(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors tap-bounce"
                title="Chiudi finestra (Esc)"
                aria-label="Chiudi finestra"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Area Stampabile */}
            <div id="printable-qr-badge" className="text-center p-4 border-2 border-dashed border-slate-300 rounded-2xl my-3 bg-white">
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                COOPERATIVA CLARABELLA • VIAGGIABELLA
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                {qrModalVehicle.name}
              </h2>
              <div className="font-mono text-sm font-black bg-slate-900 text-white px-3 py-1 rounded-lg inline-block my-2 tracking-wider">
                {qrModalVehicle.plate}
              </div>

              {qrDataUrl && (
                <div className="my-3 flex justify-center">
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${qrModalVehicle.name}`}
                    className="w-44 h-44 border border-slate-200 rounded-xl p-1 bg-white shadow-sm"
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-tight">
                Inquadra questo QR Code con l'app ViaggiaBella per registrare l'inizio o la fine del viaggio.
              </p>
              <div className="text-[10px] text-slate-400 font-mono mt-2">
                Codice: {qrModalVehicle.qrCodeId}
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-2 print:hidden">
              <button
                type="button"
                onClick={handlePrintBadge}
                className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm tap-bounce"
              >
                <Printer className="w-4 h-4" />
                <span>Stampa Cartellino</span>
              </button>
              <button
                type="button"
                onClick={() => setQrModalVehicle(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs tap-bounce"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Scrittura e Programmazione Tag NFC */}
      {nfcModalVehicle && (
        <NfcTagWriterModal
          vehicle={nfcModalVehicle}
          adminUser={adminUser}
          isOpen={!!nfcModalVehicle}
          onClose={() => setNfcModalVehicle(null)}
          onVehicleUpdated={updated => {
            setNfcModalVehicle(updated);
          }}
        />
      )}
    </div>
  );
};
