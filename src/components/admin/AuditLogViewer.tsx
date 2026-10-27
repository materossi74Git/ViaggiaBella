import React, { useState } from 'react';
import {
  History,
  Search,
  Shield,
  FileText,
  User,
  Clock,
  ChevronRight,
  X,
  AlertCircle,
} from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filtered = logs.filter(log => {
    const matchSearch =
      !searchTerm ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.usageId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchAction = actionFilter === 'all' || log.actionType === actionFilter;

    return matchSearch && matchAction;
  });

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'creazione':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'completamento':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'modifica_operatore':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'correzione_amministrativa':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'annullamento':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Audit Log Immutabile
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
              <Shield className="w-3 h-3 mr-1 text-emerald-400" />
              Write-Only / Protetto
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tracciamento permanente di tutte le creazioni, modifiche e correzioni autorizzate
          </p>
        </div>

        {/* Ricerca e Filtro */}
        <div className="flex items-center space-x-2">
          <div className="relative w-48 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cerca utente, viaggio, note..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium"
          >
            <option value="all">Tutte le azioni</option>
            <option value="creazione">Creazione</option>
            <option value="completamento">Completamento</option>
            <option value="modifica_operatore">Modifica Operatore</option>
            <option value="correzione_amministrativa">Correzione Admin</option>
            <option value="annullamento">Annullamento</option>
          </select>
        </div>
      </div>

      {/* Timeline dei Log */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nessun evento registrato nell'audit log con i filtri attuali.
          </div>
        ) : (
          filtered.map(log => (
            <div
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="space-y-1 text-xs flex-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getActionBadge(
                      log.actionType
                    )}`}
                  >
                    {log.actionType.replace('_', ' ')}
                  </span>
                  <span className="font-semibold text-slate-900">{log.userName}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({log.userRole})
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                    {new Date(log.timestamp).toLocaleString('it-IT')}
                  </span>
                </div>

                <div className="font-medium text-slate-800 text-xs mt-1">
                  {log.summary}
                </div>

                {log.reason && (
                  <div className="text-slate-500 text-[11px]">
                    <span className="font-semibold text-slate-600">Motivazione:</span> "{log.reason}"
                  </div>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Modale Dettagli / Diff Valori Precedenti vs Successivi */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl text-slate-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
                  Dettaglio Evento di Audit
                </h3>
                <p className="text-xs text-slate-500 font-mono">ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block">Utente esecutore:</span>
                  <span className="font-bold text-slate-900">{selectedLog.userName} ({selectedLog.userRole})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Timestamp:</span>
                  <span className="font-mono text-slate-800">{selectedLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Azione:</span>
                  <span className="font-bold text-slate-900 capitalize">{selectedLog.actionType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Riferimento risorsa:</span>
                  <span className="font-mono text-slate-800">{selectedLog.usageId}</span>
                </div>
              </div>

              {selectedLog.reason && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="font-bold text-purple-900 block mb-0.5">Motivazione Registrata:</span>
                  <span className="text-purple-800">{selectedLog.reason}</span>
                </div>
              )}

              {/* Confronto Dati Precedenti vs Nuovi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="font-bold text-slate-700 mb-1">Valori Precedenti:</div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {selectedLog.previousValues
                      ? JSON.stringify(JSON.parse(selectedLog.previousValues), null, 2)
                      : '// Nessun valore precedente (nuovo record)'}
                  </pre>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-1">Nuovi Valori Salvati:</div>
                  <pre className="p-3 bg-slate-900 text-blue-300 font-mono text-[10px] rounded-xl overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {selectedLog.newValues
                      ? JSON.stringify(JSON.parse(selectedLog.newValues), null, 2)
                      : '// -'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
