import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  FileJson,
  Filter,
  Search,
  Database,
  ArrowRight,
} from 'lucide-react';
import { VehicleUsage, Vehicle } from '../../types';
import {
  auditUsageDocument,
  auditVehicleDocument,
  generateAuditReport,
  DocumentAuditResult,
} from '../../utils/timestampAudit';

interface TimestampAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  usages: VehicleUsage[];
  vehicles: Vehicle[];
}

export const TimestampAuditModal: React.FC<TimestampAuditModalProps> = ({
  isOpen,
  onClose,
  usages,
  vehicles,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'inconsistent' | 'compliant'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Esegue l'audit di sola lettura in memoria sui documenti forniti
  const { results, report } = useMemo(() => {
    const list: DocumentAuditResult[] = [];
    for (const u of usages) {
      list.push(auditUsageDocument(u.id, u as Record<string, any>));
    }
    for (const v of vehicles) {
      list.push(auditVehicleDocument(v.id, v as Record<string, any>));
    }
    const rep = generateAuditReport(list);
    return { results: list, report: rep };
  }, [usages, vehicles]);

  const filteredResults = useMemo(() => {
    return results.filter(item => {
      if (filterMode === 'inconsistent' && item.isCompliant) return false;
      if (filterMode === 'compliant' && !item.isCompliant) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesId = item.documentId.toLowerCase().includes(q);
        return matchesLabel || matchesId;
      }
      return true;
    });
  }, [results, filterMode, searchQuery]);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `viaggiabella_audit_timestamps_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900">Audit Consistenza Timestamp</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                  Sola Lettura
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifica compatibilità formati data con le nuove Security Rules Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documenti Analizzati</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{report.totalAnalyzed}</div>
              <div className="text-xs text-slate-400 mt-0.5">{usages.length} viaggi, {vehicles.length} mezzi</div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Conformi</div>
              <div className="text-2xl font-black text-emerald-800 mt-1">{report.totalCompliant}</div>
              <div className="text-xs text-emerald-600 mt-0.5">Timestamp nativi compatibili</div>
            </div>

            <div className={`rounded-2xl p-4 border ${report.totalInconsistent > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`text-xs font-bold uppercase tracking-wider ${report.totalInconsistent > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                Inconsistenti (ISO/Assenti)
              </div>
              <div className={`text-2xl font-black mt-1 ${report.totalInconsistent > 0 ? 'text-amber-800' : 'text-slate-700'}`}>
                {report.totalInconsistent}
              </div>
              <div className="text-xs text-amber-600 mt-0.5">
                {report.byCollection.vehicleUsages.isoString} ISO, {report.byCollection.vehicleUsages.missingFirstSavedAt} mancanti
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Esporta Risultati</div>
                <div className="text-xs text-blue-600 mt-1">Scarica il report per pianificare la bonifica</div>
              </div>
              <button
                onClick={handleExportJson}
                className="mt-2 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Scarica JSON</span>
              </button>
            </div>
          </div>

          {/* Piano di bonifica rapido */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5 mb-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Diagnosi e Piano di Bonifica</span>
            </h4>
            <div className="space-y-1.5">
              {report.remediationPlan.map((step, idx) => (
                <div key={idx} className="text-xs text-slate-600 flex items-start space-x-2">
                  <span className="font-bold text-slate-400">•</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtri e ricerca */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Tutti ({results.length})
              </button>
              <button
                onClick={() => setFilterMode('inconsistent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'inconsistent' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Inconsistenti ({report.totalInconsistent})
              </button>
              <button
                onClick={() => setFilterMode('compliant')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'compliant' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Conformi ({report.totalCompliant})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca mezzo, autista o ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>
          </div>

          {/* Tabella Dettagliata */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Documento & Mezzo</th>
                    <th className="p-3">Stato</th>
                    <th className="p-3">firstSavedAt</th>
                    <th className="p-3">Diagnosi Security Rules</th>
                    <th className="p-3 text-right">Esito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                        Nessun documento corrisponde ai filtri selezionati.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map(docRes => {
                      const firstSaved = docRes.fields.find(f => f.fieldName === 'firstSavedAt');
                      return (
                        <tr key={docRes.documentId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{docRes.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              [{docRes.collectionName}] {docRes.documentId}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              docRes.status === 'in_corso'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : docRes.status === 'completato'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-slate-50 text-slate-600'
                            }`}>
                              {docRes.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {firstSaved ? (
                              <div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  firstSaved.detectedType === 'native_timestamp'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : firstSaved.detectedType === 'iso_string'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {firstSaved.detectedType === 'native_timestamp' ? 'Timestamp Nativo' : firstSaved.detectedType === 'iso_string' ? 'Stringa ISO' : 'Mancante/Null'}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                                  {firstSaved.rawValue ? String(firstSaved.rawValue) : 'null'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 max-w-xs">
                            <p className="text-[11px] text-slate-600 line-clamp-2">
                              {firstSaved?.description || 'Nessuna anomalia rilevata.'}
                            </p>
                          </td>
                          <td className="p-3 text-right">
                            {docRes.isCompliant ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-600 font-bold text-xs">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Conforme</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-amber-600 font-bold text-xs">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Inconsistente</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Modalità di sola lettura: nessuna modifica o scrittura viene apportata al database.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
