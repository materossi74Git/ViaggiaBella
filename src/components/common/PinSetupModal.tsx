import React, { useState, useEffect } from 'react';
import { KeyRound, Check, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { AppUser } from '../../types';
import { setupUserPin, disableUserPin } from '../../services/authService';

interface PinSetupModalProps {
  user: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: AppUser) => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chiudi con tasto Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (pin.length < 4 || pin.length > 6) {
      setErrorMsg('Il PIN deve essere lungo da 4 a 6 cifre numeriche.');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setErrorMsg('Il PIN deve contenere unicamente numeri (0-9).');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg('I due PIN inseriti non coincidono.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await setupUserPin(user, pin);
      onUserUpdated(updated);
      setSuccessMsg('PIN di sblocco rapido attivato con successo!');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setPin('');
        setConfirmPin('');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossibile salvare il PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Vuoi davvero disattivare lo sblocco rapido con PIN per questo account?')) {
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await disableUserPin(user);
      onUserUpdated(updated);
      setSuccessMsg('Sblocco rapido disattivato.');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore nella disattivazione.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                {user.quickUnlockEnabled ? 'Modifica PIN' : 'Attiva PIN Rapido'}
              </h3>
              <p className="text-[11px] text-slate-500">Sblocco veloce sessione</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors tap-bounce"
            title="Chiudi finestra (Esc)"
            aria-label="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nuovo PIN (4-6 cifre)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-center text-lg tracking-widest font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Conferma PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-center text-lg tracking-widest font-mono"
                required
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-snug">
              Il PIN viene cifrato con salt locale (PBKDF2) e non viene memorizzato in chiaro.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors tap-bounce"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || pin.length < 4}
              className="flex-1 py-2.5 px-3 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5 tap-bounce disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvataggio...' : 'Salva PIN'}</span>
            </button>
            {user.quickUnlockEnabled && (
              <button
                type="button"
                onClick={handleDisable}
                disabled={isSubmitting}
                className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-medium text-xs transition-colors"
              >
                Disattiva
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
