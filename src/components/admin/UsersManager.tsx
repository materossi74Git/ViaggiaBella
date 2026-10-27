import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  KeyRound,
  RotateCcw,
  Check,
  AlertCircle,
  Search,
} from 'lucide-react';
import { AppUser } from '../../types';
import { subscribeUsers, updateUserRoleOrStatus } from '../../services/dbService';

interface UsersManagerProps {
  adminUser: AppUser;
}

export const UsersManager: React.FC<UsersManagerProps> = ({ adminUser }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeUsers(setUsers);
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (targetUser: AppUser, newRole: 'operatore' | 'amministratore') => {
    if (targetUser.uid === adminUser.uid && newRole === 'operatore') {
      alert('Non puoi declassare il tuo stesso account amministratore.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserRoleOrStatus(targetUser.uid, { role: newRole }, adminUser);
      setFeedbackMsg(`Ruolo di ${targetUser.displayName} aggiornato a ${newRole}.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Errore durante l\'aggiornamento del ruolo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (targetUser: AppUser) => {
    if (targetUser.uid === adminUser.uid) {
      alert('Non puoi revocare l\'accesso al tuo stesso account.');
      return;
    }

    const nextStatus = targetUser.status === 'attivo' ? 'revocato' : 'attivo';
    if (!confirm(`Sei sicuro di voler impostare lo stato di ${targetUser.displayName} a "${nextStatus}"?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserRoleOrStatus(targetUser.uid, { status: nextStatus }, adminUser);
      setFeedbackMsg(`Stato di ${targetUser.displayName} aggiornato a ${nextStatus}.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Errore durante l\'aggiornamento dello stato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = users.filter(
    u =>
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestione Utenti & Autorizzazioni
          </h2>
          <p className="text-xs text-slate-500">
            Assegna ruoli (Operatore / Amministratore), revoca accessi e monitora sblocco PIN
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Tabella Utenti */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Operatore / Nome</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Ruolo Attuale</th>
                <th className="py-3 px-4">PIN Rapido</th>
                <th className="py-3 px-4">Stato Accesso</th>
                <th className="py-3 px-4 text-center">Modifica Ruolo / Accesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => {
                const isAdmin = u.role === 'amministratore';
                const isRevoked = u.status === 'revocato';

                return (
                  <tr key={u.uid} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {u.displayName}
                      {u.uid === adminUser.uid && (
                        <span className="ml-2 text-[10px] font-bold text-blue-600">(Tu)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {u.email}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAdmin
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isAdmin ? 'Amministratore' : 'Operatore'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.quickUnlockEnabled ? (
                        <span className="inline-flex items-center text-[11px] text-emerald-700 font-medium">
                          <KeyRound className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Configurato
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Non impostato</span>
                      )}
                      {(u.failedPinAttempts || 0) > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-rose-100 text-rose-800 rounded">
                          {u.failedPinAttempts} tentativi errati
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          !isRevoked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {!isRevoked ? 'Attivo' : 'Revocato'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Selettore Ruolo */}
                        <select
                          disabled={isSubmitting || u.uid === adminUser.uid}
                          value={u.role}
                          onChange={e =>
                            handleRoleChange(u, e.target.value as 'operatore' | 'amministratore')
                          }
                          className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-50"
                        >
                          <option value="operatore">Operatore</option>
                          <option value="amministratore">Amministratore</option>
                        </select>

                        {/* Toggle Stato Revoca */}
                        <button
                          disabled={isSubmitting || u.uid === adminUser.uid}
                          onClick={() => handleStatusToggle(u)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                            !isRevoked
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {!isRevoked ? 'Revoca' : 'Riattiva'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
