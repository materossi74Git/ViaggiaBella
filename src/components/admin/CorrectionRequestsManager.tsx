import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Car,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { CorrectionRequest, VehicleUsage, AppUser } from '../../types';
import { resolveCorrectionRequest } from '../../services/dbService';

interface CorrectionRequestsManagerProps {
  requests: CorrectionRequest[];
  usages: VehicleUsage[];
  adminUser: AppUser;
  onRefresh: () => void;
}

export const CorrectionRequestsManager: React.FC<CorrectionRequestsManagerProps> = ({
  requests,
  usages,
  adminUser,
  onRefresh,
}) => {
  const [selectedReq, setSelectedReq] = useState<CorrectionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Per eventuale correzione diretta dei km / note durante l'approvazione
  const [correctedEndKm, setCorrectedEndKm] = useState<string>('');
  const [correctedNotes, setCorrectedNotes] = useState<string>('');

  // Chiudi con tasto Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReq(null);
    };
    if (selectedReq) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReq]);

  const targetUsage = selectedReq ? usages.find(u => u.id === selectedReq.usageId) : null;

  const handleOpenDecision = (req: CorrectionRequest) => {
    setSelectedReq(req);
    setAdminNotes('');
    setErrorMsg(null);
    const u = usages.find(item => item.id === req.usageId);
    if (u) {
      setCorrectedEndKm(u.endKm !== undefined ? String(u.endKm) : '');
      setCorrectedNotes(u.notes || '');
    }
  };

  const handleDecision = async (decision: 'approvata' | 'rifiutata') => {
    if (!selectedReq) return;
    if (isSubmitting) return;

    if (!adminNotes.trim()) {
      setErrorMsg('Inserisci una nota o motivazione per la decisione.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const appliedData: Partial<VehicleUsage> = {};
      if (decision === 'approvata' && targetUsage) {
        if (correctedEndKm !== '') {
          const numKm = Number(correctedEndKm);
          appliedData.endKm = numKm;
          appliedData.distanceKm = Math.max(0, numKm - (targetUsage.startKm || 0));
        }
        if (correctedNotes) {
          appliedData.notes = correctedNotes;
        }
      }

      await resolveCorrectionRequest(
        selectedReq.id,
        decision,
        adminUser,
        adminNotes,
        appliedData
      );

      setSelectedReq(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante la gestione della richiesta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Gestione Richieste di Correzione
        </h2>
        <p className="text-xs text-slate-500">
          Richieste inviate dagli operatori per rettificare viaggi oltre i 30 minuti consentiti
        </p>
      </div>

      {/* Lista Richieste */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-500 shadow-sm">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">Nessuna richiesta di correzione registrata</p>
            <p className="text-xs text-slate-400 mt-1">
              Quando un operatore richiederà una rettifica dopo la scadenza dei 30 minuti, apparirà qui.
            </p>
          </div>
        ) : (
          requests.map(req => {
            const isPending = req.status === 'in_attesa';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-3xl p-5 border shadow-sm transition-all ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/20'
                    : req.status === 'approvata'
                    ? 'border-emerald-200'
                    : 'border-slate-200 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {req.vehicleName}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          req.status === 'in_attesa'
                            ? 'bg-amber-100 text-amber-800'
                            : req.status === 'approvata'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {req.status === 'in_attesa'
                          ? 'In Attesa'
                          : req.status === 'approvata'
                          ? 'Approvata'
                          : 'Rifiutata'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center space-x-2">
                      <span className="font-medium text-slate-800">
                        Richiedente: {req.driverName}
                      </span>
                      <span>•</span>
                      <span>
                        Data: {new Date(req.createdAt).toLocaleString('it-IT')}
                      </span>
                    </div>

                    <div className="mt-2 text-xs bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">Motivo: </span>
                        <span>{req.reason}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Modifiche desiderate: </span>
                        <span className="italic text-slate-800">{req.desiredChanges}</span>
                      </div>
                    </div>

                    {req.adminNotes && (
                      <div className="text-xs text-slate-500 pt-1">
                        <span className="font-semibold">Esito Admin ({req.adminName}):</span> "{req.adminNotes}"
                      </div>
                    )}
                  </div>

                  {/* Azione di decisione per admin */}
                  {isPending && (
                    <button
                      onClick={() => handleOpenDecision(req)}
                      className="self-start sm:self-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 whitespace-nowrap"
                    >
                      Esamina & Decidi
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modale Decisione Amministrativa */}
      {selectedReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedReq(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                Esamina Richiesta di Rettifica
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
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

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              {/* Richiesta inviata */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <div className="font-bold text-amber-950">Dettagli Richiesta Operatore:</div>
                <div><strong>Operatore:</strong> {selectedReq.driverName}</div>
                <div><strong>Mezzo:</strong> {selectedReq.vehicleName}</div>
                <div><strong>Motivo:</strong> {selectedReq.reason}</div>
                <div><strong>Modifiche Richieste:</strong> {selectedReq.desiredChanges}</div>
              </div>

              {/* Dati correnti della registrazione */}
              {targetUsage && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">Dati Attuali del Viaggio:</div>
                  <div>Data: {targetUsage.usageDate} · Orario: {targetUsage.startTime} - {targetUsage.endTime}</div>
                  <div>Chilometri attuali: {targetUsage.startKm} → {targetUsage.endKm} ({targetUsage.distanceKm} km)</div>
                  <div>Destinazione: {targetUsage.destination} ({targetUsage.reason})</div>
                </div>
              )}

              {/* Campi per rettifica autorizzata */}
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 space-y-2.5">
                <div className="font-bold text-purple-900">
                  Rettifica Dati Autorizzata (applicata se approvata):
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nuovi Km Finali Corretti
                  </label>
                  <input
                    type="number"
                    value={correctedEndKm}
                    onChange={e => setCorrectedEndKm(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-purple-300 font-mono text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Aggiornamento Note Viaggio
                  </label>
                  <input
                    type="text"
                    value={correctedNotes}
                    onChange={e => setCorrectedNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-purple-300 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Note della decisione */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Motivazione della Decisione Admin * (per Audit Log)
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Es. Verificato cartellino cartaceo del mezzo, approvata rettifica..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  required
                />
              </div>
            </div>

            {/* Footer Fisso con Annulla + Approva + Rifiuta */}
            <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                disabled={isSubmitting}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors tap-bounce"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision('approvata')}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm tap-bounce"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approva & Applica</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision('rifiutata')}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1 shadow-sm tap-bounce"
              >
                <XCircle className="w-4 h-4" />
                <span>Rifiuta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
