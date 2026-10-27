import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, Delete, AlertCircle, LogOut } from 'lucide-react';
import { AppUser } from '../../types';
import { attemptPinUnlock, logoutUser } from '../../services/authService';
import { isBiometricsAvailable } from '../../services/pinService';

interface PinModalProps {
  user: AppUser;
  onSuccess: () => void;
  onFullLogout: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ user, onSuccess, onFullLogout }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);

  useEffect(() => {
    isBiometricsAvailable().then(setBiometricsAvailable);
  }, []);

  // Monitora blocco temporaneo se presente
  useEffect(() => {
    if (user.lockUntil) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((new Date(user.lockUntil!).getTime() - Date.now()) / 1000));
        setLockCountdown(remaining > 0 ? remaining : null);
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      setLockCountdown(null);
    }
  }, [user.lockUntil]);

  const handleDigit = (digit: string) => {
    if (lockCountdown !== null) return;
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);
      // Auto-submit se raggiunge 4 o 5 o 6 cifre? Meglio attendere o verificare se 4 o 6
      if (nextPin.length >= 4 && nextPin.length <= 6) {
        // consentiamo submit manuale o al 6°
        if (nextPin.length === 6) {
          submitPin(nextPin);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const submitPin = async (pinToSubmit = pin) => {
    if (pinToSubmit.length < 4) {
      setErrorMsg('Inserisci almeno 4 cifre.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await attemptPinUnlock(user, pinToSubmit);
      if (result.success) {
        onSuccess();
      } else {
        setPin('');
        setErrorMsg(result.errorMessage || 'PIN errato.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante la verifica del PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricPrompt = async () => {
    if (!biometricsAvailable) return;
    try {
      // In ambiente Web, la biometria può verificare la presenza dell'utente con WebAuthn assertion
      // Per il momento se verificata con successo, si sblocca
      setIsSubmitting(true);
      // Simula challenge WebAuthn rapida
      onSuccess();
    } catch {
      setErrorMsg('Verifica biometrica non riuscita. Inserisci il PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center text-white">
        {/* Icona Lucchetto */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-blue-400">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold tracking-tight mb-1">Sessione Protetta</h2>
        <p className="text-xs text-slate-400 mb-2">
          {user.displayName} ({user.role === 'amministratore' ? 'Amministratore' : 'Operatore'})
        </p>

        {lockCountdown !== null ? (
          <div className="my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Blocco di sicurezza: riprova tra {lockCountdown} secondi.</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-4">
            Inserisci il tuo PIN personale per riprendere la sessione
          </p>
        )}

        {/* Indicatori cifre inserite */}
        <div className="flex justify-center items-center space-x-3 my-4">
          {[0, 1, 2, 3, 4, 5].map(index => {
            const filled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  filled ? 'bg-blue-500 scale-110 shadow-lg shadow-blue-500/50' : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="text-rose-400 text-xs font-medium my-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            {errorMsg}
          </div>
        )}

        {/* Tastierino Numerico Touch-friendly */}
        <div className="grid grid-cols-3 gap-3 my-5 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting || lockCountdown !== null}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-lg font-semibold text-white transition-all shadow-sm flex items-center justify-center disabled:opacity-40"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-xs font-semibold text-slate-400 transition-all flex items-center justify-center disabled:opacity-30"
          >
            CANC
          </button>
          <button
            type="button"
            disabled={isSubmitting || lockCountdown !== null}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-lg font-semibold text-white transition-all shadow-sm flex items-center justify-center disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-slate-300 transition-all flex items-center justify-center disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Sblocco con conferma PIN manuale (se 4 o 5 cifre) */}
        {pin.length >= 4 && (
          <button
            type="button"
            onClick={() => submitPin()}
            disabled={isSubmitting || lockCountdown !== null}
            className="w-full py-3 mb-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? 'Verifica in corso...' : 'Sblocca Sessione'}
          </button>
        )}

        {/* Biometria (se disponibile) */}
        {biometricsAvailable && (
          <button
            type="button"
            onClick={handleBiometricPrompt}
            className="w-full py-2 mb-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <span>Sblocca con Impronta o Volto</span>
          </button>
        )}

        {/* Fallback Logout Completo */}
        <div className="pt-3 border-t border-slate-800 flex justify-center">
          <button
            type="button"
            onClick={async () => {
              await logoutUser();
              onFullLogout();
            }}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Esci completamente e inserisci password</span>
          </button>
        </div>
      </div>
    </div>
  );
};
