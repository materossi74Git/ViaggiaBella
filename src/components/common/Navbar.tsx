import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  LogOut,
  Shield,
  User as UserIcon,
  Menu,
  X,
  LayoutDashboard,
  FileSpreadsheet,
  Truck,
  ClipboardList,
  History,
  BarChart3,
  Users,
  Compass,
  Sparkles,
  Smartphone,
  Download,
} from 'lucide-react';
import { AppUser } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';
import { FriendlyVanMascot } from './FriendlyVanMascot';
import { AndroidAppGuideModal } from './AndroidAppGuideModal';

interface NavbarProps {
  user: AppUser;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLockSession: () => void;
  onOpenPinSetup: () => void;
  onLogout: () => void;
  pendingRequestsCount?: number;
  expiringVehiclesCount?: number;
  viewMode?: 'operatore' | 'amministratore';
  onToggleViewMode?: (mode: 'operatore' | 'amministratore') => void;
  onCheckUpdates?: () => void;
  hasUpdatePending?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onLockSession,
  onOpenPinSetup,
  onLogout,
  pendingRequestsCount = 0,
  expiringVehiclesCount = 0,
  viewMode = user.role,
  onToggleViewMode,
  onCheckUpdates,
  hasUpdatePending = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const isActualAdmin = user.role === 'amministratore';
  const isAdminView = viewMode === 'amministratore';

  const handleNavClick = (tab: string) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800/80 text-white shadow-md backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* ZONA 1: Marchio Cooperativa con Furgoncino stilizzato */}
          <button
            type="button"
            className="flex items-center space-x-3 text-left focus:outline-none tap-bounce shrink-0 group"
            onClick={() => handleNavClick(isAdminView ? 'admin-dashboard' : 'operator-home')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md shadow-teal-900/40 border border-teal-400/30">
              <FriendlyVanMascot size="sm" mood="idle" className="scale-75 -mt-0.5" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>ViaggiaBella</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-md border border-teal-500/30">
                  Clarabella
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Cooperativa Sociale
              </div>
            </div>
          </button>

          {/* ZONA 2: Link di Navigazione Desktop (Single-line whitespace-nowrap) */}
          <nav className="hidden lg:flex items-center space-x-1 shrink-0">
            {isAdminView ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick('admin-dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-teal-400" />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('admin-usages')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'admin-usages'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                  <span>Registrazioni</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('admin-vehicles')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'admin-vehicles'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Truck className="w-4 h-4 text-teal-400" />
                  <span>Parco Mezzi</span>
                  {expiringVehiclesCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                      {expiringVehiclesCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('admin-requests')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'admin-requests'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-teal-400" />
                  <span>Richieste</span>
                  {pendingRequestsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('admin-reports')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'admin-reports'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-teal-400" />
                  <span>Report & Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('admin-audit')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'admin-audit'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <History className="w-4 h-4 text-teal-400" />
                  <span>Audit Log</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('admin-users')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'admin-users'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>Utenti</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick('operator-home')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'operator-home'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Compass className="w-4 h-4 text-teal-400" />
                  <span>Pannello Viaggi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('operator-my-usages')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'operator-my-usages'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-teal-400" />
                  <span>I Miei Utilizzi</span>
                </button>
              </>
            )}
          </nav>

          {/* ZONA 3: Profilo utente, Selettore Vista & Azioni di sicurezza */}
          <div className="hidden sm:flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setAndroidModalOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all tap-bounce"
              title="Guida App Android & Pacchetto APK"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-400" />
              <span>App Android</span>
            </button>
            {onCheckUpdates && (
              <button
                type="button"
                onClick={onCheckUpdates}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all tap-bounce ${
                  hasUpdatePending
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 animate-pulse border border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title={hasUpdatePending ? 'Nuovo aggiornamento APK disponibile!' : 'Verifica se ci sono aggiornamenti'}
              >
                <Download className={`w-3.5 h-3.5 ${hasUpdatePending ? 'text-white' : 'text-teal-400'}`} />
                <span>{hasUpdatePending ? 'Aggiorna APK!' : 'Aggiornamenti'}</span>
              </button>
            )}
            <PWAInstallButton />

            {/* Selettore Vista per Amministratore */}
            {isActualAdmin && onToggleViewMode && (
              <button
                type="button"
                onClick={() => onToggleViewMode(isAdminView ? 'operatore' : 'amministratore')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5 tap-bounce ${
                  isAdminView
                    ? 'bg-slate-800 text-teal-300 border-teal-500/40 hover:bg-slate-700'
                    : 'bg-teal-950/80 text-teal-200 border-teal-600/50 hover:bg-teal-900'
                }`}
                title="Passa da vista Amministratore a vista Operatore per testare i flussi"
              >
                {isAdminView ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-teal-400" />
                    <span>Vista: Admin</span>
                    <span className="text-[10px] text-teal-400/80 underline ml-0.5">Cambia</span>
                  </>
                ) : (
                  <>
                    <UserIcon className="w-3.5 h-3.5 text-teal-300" />
                    <span>Vista: Operatore</span>
                    <span className="text-[10px] text-teal-300/80 underline ml-0.5">Cambia</span>
                  </>
                )}
              </button>
            )}

            {!isActualAdmin && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-teal-950/60 text-teal-300 border border-teal-700/50">
                <UserIcon className="w-3.5 h-3.5 mr-1" />
                Operatore
              </span>
            )}

            {/* Quick Unlock PIN */}
            <button
              type="button"
              onClick={onOpenPinSetup}
              title="Configura PIN di sblocco rapido"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors relative tap-bounce"
            >
              <KeyRound className="w-4 h-4" />
              {user.quickUnlockEnabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400"></span>
              )}
            </button>

            {/* Lock Session button */}
            {user.quickUnlockEnabled && (
              <button
                type="button"
                onClick={onLockSession}
                title="Blocca sessione (Sblocco rapido con PIN)"
                className="px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center space-x-1 border border-slate-700 tap-bounce"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Blocca</span>
              </button>
            )}

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              title="Esci dall'applicazione"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors tap-bounce"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Hamburger per Mobile (min touch target 44px) */}
          <div className="flex lg:hidden items-center space-x-1">
            {user.quickUnlockEnabled && (
              <button
                type="button"
                onClick={onLockSession}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-amber-400 hover:bg-slate-800 rounded-xl tap-bounce"
                title="Blocca sessione"
              >
                <Lock className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl tap-bounce"
              aria-label="Apri menu di navigazione"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Espanso */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/98 backdrop-blur-md px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
            <div>
              <div className="font-bold text-white text-sm">{user.displayName}</div>
              <div className="text-xs text-slate-400">{user.email}</div>
            </div>
            <div className="flex items-center space-x-2">
              {isActualAdmin && onToggleViewMode && (
                <button
                  type="button"
                  onClick={() => onToggleViewMode(isAdminView ? 'operatore' : 'amministratore')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-950 text-teal-300 border border-teal-600/50"
                >
                  {isAdminView ? 'Vista: Admin (Cambia)' : 'Vista: Operatore (Cambia)'}
                </button>
              )}
            </div>
          </div>

          {isAdminView ? (
            <div className="grid grid-cols-1 gap-1">
              <button
                type="button"
                onClick={() => handleNavClick('admin-dashboard')}
                className="w-full min-h-[44px] flex items-center px-3 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 tap-bounce"
              >
                <LayoutDashboard className="w-4 h-4 mr-3 text-teal-400" />
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('admin-usages')}
                className="w-full min-h-[44px] flex items-center px-3 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 tap-bounce"
              >
                <FileSpreadsheet className="w-4 h-4 mr-3 text-teal-400" />
                Registrazioni Viaggi
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('admin-vehicles')}
                className="w-full min-h-[44px] flex items-center justify-between px-3 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 tap-bounce"
              >
                <div className="flex items-center">
                  <Truck className="w-4 h-4 mr-3 text-teal-400" />
                  <span>Parco Mezzi</span>
                </div>
                {expiringVehiclesCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {expiringVehiclesCount} Allerte
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('admin-requests')}
                className="w-full min-h-[44px] flex items-center justify-between px-3 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 tap-bounce"
              >
                <div className="flex items-center">
                  <ClipboardList className="w-4 h-4 mr-3 text-teal-400" />
                  <span>Richieste di Correzione</span>
                </div>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('admin-reports')}
                className="w-full min-h-[44px] flex items-center px-3 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 tap-bounce"
              >
                <BarChart3 className="w-4 h-4 mr-3 text-teal-400" />
                Report & Statistiche
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('admin-audit')}
                className="w-full min-h-[44px] flex items-center px-3 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 tap-bounce"
              >
                <History className="w-4 h-4 mr-3 text-teal-400" />
                Audit Log Sicurezza
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('admin-users')}
                className="w-full min-h-[44px] flex items-center px-3 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 tap-bounce"
              >
                <Users className="w-4 h-4 mr-3 text-teal-400" />
                Gestione Utenti
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              <button
                type="button"
                onClick={() => handleNavClick('operator-home')}
                className="w-full min-h-[44px] flex items-center px-3 rounded-xl text-xs font-bold text-teal-300 bg-teal-950/60 border border-teal-500/30 tap-bounce"
              >
                <Compass className="w-4 h-4 mr-3 text-teal-400" />
                Pannello Viaggi
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('operator-my-usages')}
                className="w-full min-h-[44px] flex items-center px-3 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 tap-bounce"
              >
                <ClipboardList className="w-4 h-4 mr-3 text-teal-400" />
                I Miei Utilizzi
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 space-y-1">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setAndroidModalOpen(true);
              }}
              className="w-full min-h-[44px] flex items-center px-3 text-xs font-semibold text-teal-300 hover:bg-slate-800 rounded-xl tap-bounce"
            >
              <Smartphone className="w-4 h-4 mr-3 text-teal-400" />
              <span>App Android & APK</span>
            </button>
            {onCheckUpdates && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onCheckUpdates();
                }}
                className={`w-full min-h-[44px] flex items-center px-3 text-xs font-semibold rounded-xl tap-bounce ${
                  hasUpdatePending
                    ? 'bg-emerald-600 text-white font-bold animate-pulse'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Download className={`w-4 h-4 mr-3 ${hasUpdatePending ? 'text-white' : 'text-emerald-400'}`} />
                <span>{hasUpdatePending ? 'Aggiornamento Disponibile! (Scarica APK)' : 'Verifica Aggiornamenti APK'}</span>
              </button>
            )}
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPinSetup();
              }}
              className="w-full min-h-[44px] flex items-center px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-xl tap-bounce"
            >
              <KeyRound className="w-4 h-4 mr-3 text-teal-400" />
              Configura PIN Rapido
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full min-h-[44px] flex items-center px-3 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 rounded-xl tap-bounce"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Esci dall'account
            </button>
          </div>
        </div>
      )}

      {/* Chiudi header della navigazione */}
      </header>

      {/* Modale Guida Android & Pacchetto APK (posizionata fuori dall'header) */}
      <AndroidAppGuideModal
        isOpen={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
      />
    </>
  );
};
