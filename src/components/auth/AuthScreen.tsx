import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
  ADMIN_EMAIL_BOOTSTRAP,
} from '../../services/authService';
import { AppUser } from '../../types';
import { FriendlyVanMascot } from '../common/FriendlyVanMascot';

interface AuthScreenProps {
  onAuthSuccess: (user: AppUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [showConsoleGuide, setShowConsoleGuide] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setShowConsoleGuide(false);
    setIsSubmitting(true);

    try {
      if (isResettingPassword) {
        if (!email.trim()) {
          throw new Error('Inserisci il tuo indirizzo email per recuperare la password.');
        }
        await resetPassword(email);
        setInfoMsg(`Ti abbiamo inviato un'email a ${email} con il link per scegliere una nuova password! Controlla la tua casella di posta (e lo spam).`);
        setIsResettingPassword(false);
        return;
      }

      let user: AppUser;
      if (isRegistering) {
        if (!displayName.trim()) {
          throw new Error('Inserisci il tuo nome e cognome.');
        }
        if (password.length < 6) {
          throw new Error('La password deve contenere almeno 6 caratteri.');
        }
        user = await registerWithEmail(email, password, displayName);
      } else {
        user = await loginWithEmail(email, password);
      }

      onAuthSuccess(user);
    } catch (err: any) {
      console.error('Errore autenticazione:', err);
      const msg = err?.message || String(err);

      if (msg.includes('auth/operation-not-allowed')) {
        setErrorMsg(
          'Il provider Email/Password non è ancora abilitato nella console Firebase.'
        );
        setShowConsoleGuide(true);
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        setErrorMsg('Password o email non corrette. Clicca su "Hai dimenticato la password?" per reimpostarla.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setErrorMsg('Questa email risulta già registrata. Accedi con la password o clicca su "Hai dimenticato la password?".');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setShowConsoleGuide(false);
    try {
      const user = await loginWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      console.error('Errore Google Sign-In:', err);
      const msg = err?.message || String(err);
      if (msg.includes('auth/unauthorized-domain')) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'viaggiabella.vercel.app';
        setErrorMsg(`Dominio non ancora autorizzato su Firebase: ${domain}`);
      } else {
        setErrorMsg(msg || 'Accesso con Google annullato o non riuscito.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8 p-4 relative overflow-hidden">
      {/* Sfumature ambientali discrete in verde petrolio e blu notte */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Mascotte Furgoncino della Cooperativa */}
        <div className="mb-3 flex justify-center">
          <div className="p-3 bg-slate-800/80 rounded-3xl border border-teal-500/30 shadow-xl shadow-teal-950/30">
            <FriendlyVanMascot mood="idle" size="md" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          ViaggiaBella
        </h1>
        <p className="mt-1 text-xs text-teal-300 font-semibold tracking-wide uppercase">
          Cooperativa Clarabella
        </p>
        <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
          Piattaforma digitale per la tracciabilità, sicurezza e gestione della flotta
        </p>
      </div>

      <div className="relative z-10 mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
          {/* Pulsante Principale: ACCEDI CON GOOGLE */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
              className="w-full min-h-[48px] py-3.5 bg-teal-700 hover:bg-teal-600 active:scale-98 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-teal-900/20 flex items-center justify-center space-x-3 disabled:opacity-50 tap-bounce"
            >
              <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Accedi con Account Google</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Accesso rapido verificato per <strong>{ADMIN_EMAIL_BOOTSTRAP}</strong>
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              oppure email e password
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Messaggio Informativo / Successo */}
          {infoMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start space-x-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 leading-relaxed">{infoMsg}</div>
            </div>
          )}

          {/* Messaggi di Errore o Avviso */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col space-y-2 animate-in fade-in">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
              {errorMsg.includes('Dominio non ancora autorizzato') && (
                <button
                  type="button"
                  onClick={() => {
                    const domain = typeof window !== 'undefined' ? window.location.hostname : '';
                    navigator.clipboard.writeText(domain);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2500);
                  }}
                  className="self-start inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px] transition-colors"
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? 'Dominio Copiato!' : 'Copia questo dominio da incollare su Firebase'}</span>
                </button>
              )}
            </div>
          )}

          {/* Guida abilitazione console se email/password è bloccato da Firebase */}
          {showConsoleGuide && (
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs space-y-2 animate-in fade-in">
              <div className="font-bold flex items-center space-x-1.5 text-teal-800">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Come abilitare Email/Password su Firebase:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-teal-800 text-[11px]">
                <li>Apri la console Firebase sul tuo progetto</li>
                <li>Vai in <strong>Authentication → Sign-in method</strong></li>
                <li>Attiva <strong>Email/Password</strong> e salva</li>
              </ol>
            </div>
          )}

          {/* Form Email / Password o Recupero Password */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegistering && !isResettingPassword && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome e Cognome Operatore *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Mario Rossi"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Indirizzo Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="operatore@cooperativa.it"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                />
              </div>
            </div>

            {!isResettingPassword && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password *
                  </label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsResettingPassword(true);
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                    >
                      Password dimenticata?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[44px] py-3 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 tap-bounce"
            >
              <span>
                {isSubmitting
                  ? 'Verifica in corso...'
                  : isResettingPassword
                  ? 'Invia Link Recupero Password'
                  : isRegistering
                  ? 'Crea Account Operatore'
                  : 'Accedi con Credenziali'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Registrati / Accedi / Annulla Reset */}
          <div className="text-center pt-1 border-t border-slate-100 space-y-1">
            {isResettingPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsResettingPassword(false);
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Torna al login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setErrorMsg(null);
                  setInfoMsg(null);
                  setShowConsoleGuide(false);
                }}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
              >
                {isRegistering
                  ? 'Hai già un account registrato? Accedi'
                  : 'Primo accesso per nuovo operatore? Registrati qui'}
              </button>
            )}
          </div>
        </div>

        {/* Note di sicurezza e privacy della cooperativa */}
        <div className="mt-4 text-center text-[11px] text-slate-400 space-y-1">
          <p>
            🔒 Accesso protetto con crittografia end-to-end e verifica del ruolo sul database della Cooperativa Clarabella.
          </p>
        </div>
      </div>
    </div>
  );
};
