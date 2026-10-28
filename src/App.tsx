import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, testFirestoreConnection } from './firebase';
import { AppUser, Vehicle, VehicleUsage, CorrectionRequest, AuditLog, AppSettings } from './types';
import { syncUserProfile, logoutUser, checkRedirectAuthResult } from './services/authService';
import {
  subscribeVehicles,
  subscribeUsages,
  subscribeCorrectionRequests,
  subscribeAuditLogs,
  getAppSettings,
  DEFAULT_SETTINGS,
} from './services/dbService';
import { ensureInitialFleet } from './services/seedService';
import { getFleetExpiryAlerts } from './services/expirationService';
import { parseVehicleIdentifier } from './services/nfcService';

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// Componenti
import { AuthScreen } from './components/auth/AuthScreen';
import { Navbar } from './components/common/Navbar';
import { PinModal } from './components/common/PinModal';
import { PinSetupModal } from './components/common/PinSetupModal';
import { QrScannerModal } from './components/qr/QrScannerModal';
import { StartTripModal } from './components/operator/StartTripModal';
import { FinishTripModal } from './components/operator/FinishTripModal';
import { UsageFormModal } from './components/operator/UsageFormModal';
import { CorrectionRequestModal } from './components/operator/CorrectionRequestModal';
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { MyUsagesList } from './components/operator/MyUsagesList';
import { ToastNotification, ToastMessage } from './components/common/ToastNotification';
import { FriendlyVanMascot } from './components/common/FriendlyVanMascot';
import { VehicleIdentifiedActionModal } from './components/common/VehicleIdentifiedActionModal';
import { NfcWelcomeInstallModal } from './components/common/NfcWelcomeInstallModal';
import { checkForAppUpdates, RemoteVersionInfo } from './services/appUpdateService';
import { AppUpdateModal } from './components/common/AppUpdateModal';

// Componenti Admin
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UsagesTable } from './components/admin/UsagesTable';
import { VehiclesManager } from './components/admin/VehiclesManager';
import { CorrectionRequestsManager } from './components/admin/CorrectionRequestsManager';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import { ReportsView } from './components/admin/ReportsView';
import { UsersManager } from './components/admin/UsersManager';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  // Dati di dominio
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [usages, setUsages] = useState<VehicleUsage[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Navigazione e Vista (Amministratore / Operatore)
  const [activeTab, setActiveTab] = useState<string>('operator-home');
  const [viewMode, setViewMode] = useState<'operatore' | 'amministratore'>('operatore');

  // Modali
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [startTripOpen, setStartTripOpen] = useState(false);
  const [finishTripOpen, setFinishTripOpen] = useState(false);
  const [usageFormOpen, setUsageFormOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [vehicleActionModalOpen, setVehicleActionModalOpen] = useState(false);
  const [nfcWelcomeModalOpen, setNfcWelcomeModalOpen] = useState(false);
  const [identifiedVia, setIdentifiedVia] = useState<'nfc' | 'qr' | 'manual'>('nfc');

  // Elementi selezionati per modali
  const [targetVehicle, setTargetVehicle] = useState<Vehicle | null>(null);
  const [targetUsageToFinish, setTargetUsageToFinish] = useState<VehicleUsage | null>(null);
  const [targetUsageToEdit, setTargetUsageToEdit] = useState<VehicleUsage | null>(null);
  const [targetUsageForCorrection, setTargetUsageForCorrection] = useState<VehicleUsage | null>(null);

  // Aggiornamenti APK In-App
  const [updateInfo, setUpdateInfo] = useState<RemoteVersionInfo | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  // Sistema di Notifiche Toast per feedback positivo e micro-interazioni
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    type: 'success' | 'info' | 'error' | 'warning',
    title: string,
    message?: string,
    duration: number = 4000
  ) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Inattività timer ref
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Inizializzazione Auth e Seed iniziale flotta
  useEffect(() => {
    testFirestoreConnection();
    ensureInitialFleet();
    getAppSettings().then(setSettings);
    checkRedirectAuthResult().catch(err => console.warn('Controllo redirect:', err));

    const unsubscribe = onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        try {
          const profile = await syncUserProfile(fbUser);
          setCurrentUser(profile);

          // Default tab e viewMode in base al ruolo
          setViewMode(profile.role);
          if (profile.role === 'amministratore') {
            setActiveTab('admin-dashboard');
          } else {
            setActiveTab('operator-home');
          }

          // Se l'utente ha il PIN configurato e la sessione era precedentemente bloccata
          const wasLocked = localStorage.getItem('coop_session_locked') === 'true';
          if (profile.quickUnlockEnabled && wasLocked) {
            setIsSessionLocked(true);
          }
        } catch (err) {
          console.error('Errore sincronizzazione profilo:', err);
        }
      } else {
        setCurrentUser(null);
        setIsSessionLocked(false);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Controllo automatico aggiornamenti APK in background all'avvio
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForAppUpdates()
        .then(res => {
          if (res.hasUpdate && res.remoteInfo) {
            setUpdateInfo(res.remoteInfo);
            const dismissedKey = `update_dismissed_${res.remoteInfo.versionCode}`;
            if (!sessionStorage.getItem(dismissedKey)) {
              setUpdateModalOpen(true);
            }
          }
        })
        .catch(err => console.warn('Controllo aggiornamenti:', err));
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleManualCheckUpdates = async () => {
    addToast('info', 'Controllo aggiornamenti...', 'Verifica presenza di nuove versioni APK in corso.');
    try {
      const res = await checkForAppUpdates();
      if (res.hasUpdate && res.remoteInfo) {
        setUpdateInfo(res.remoteInfo);
        setUpdateModalOpen(true);
        addToast('success', 'Nuova Versione Trovata!', `È disponibile ViaggiaBella v${res.remoteInfo.version}.`);
      } else {
        addToast('success', 'App Aggiornata', `Stai già utilizzando l'ultima versione di ViaggiaBella (v${res.currentVersion})!`);
      }
    } catch {
      addToast('error', 'Errore Verifica', 'Impossibile verificare gli aggiornamenti al momento.');
    }
  };

  // 2. Sottoscrizioni dati in tempo reale quando l'utente è autenticato
  useEffect(() => {
    if (!currentUser) return;

    // Sottoscrizione flotta mezzi
    const unsubVehicles = subscribeVehicles(setVehicles);

    // Sottoscrizione utilizzi (personali per operatore, globali per admin)
    const unsubUsages = subscribeUsages(currentUser.role, currentUser.uid, setUsages);

    // Sottoscrizione richieste di correzione
    const unsubRequests = subscribeCorrectionRequests(
      currentUser.role,
      currentUser.uid,
      setCorrectionRequests
    );

    // Se amministratore, sottoscrivi anche l'audit log
    let unsubAudit = () => {};
    if (currentUser.role === 'amministratore') {
      unsubAudit = subscribeAuditLogs(setAuditLogs);
    }

    return () => {
      unsubVehicles();
      unsubUsages();
      unsubRequests();
      unsubAudit();
    };
  }, [currentUser]);

  // 3. Monitoraggio Inattività per Blocco Automatico della Sessione (Sezione 3)
  useEffect(() => {
    if (!currentUser || !currentUser.quickUnlockEnabled || isSessionLocked) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      const timeoutMs = (settings.autoLockMinutes || 10) * 60 * 1000;
      inactivityTimerRef.current = setTimeout(() => {
        handleLockSession();
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [currentUser, isSessionLocked, settings.autoLockMinutes]);

  // 4. Controllo parametro URL e Deep Link Nativo per identificazione automatica da QR / NFC
  useEffect(() => {
    if (vehicles.length === 0) return;

    const identifyAndOpenVehicle = (rawIdentifier: string, isFromNativeUrl: boolean = false) => {
      const { vehicleId: target, source: detectedSource } = parseVehicleIdentifier(rawIdentifier);
      if (!target) return;

      const cleanTarget = target.replace(/\s+/g, '').toUpperCase();
      const found = vehicles.find(
        v =>
          v.id === target ||
          v.qrCodeId === target ||
          v.nfcTagId === target ||
          v.plate.replace(/\s+/g, '').toUpperCase() === cleanTarget
      );

      // Pulisci l'URL per evitare riesecuzioni su refresh o navigazione interna
      if (typeof window !== 'undefined' && window.location.search) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (found) {
        if (found.status === 'inattivo') {
          addToast(
            'warning',
            'Mezzo Fuori Servizio',
            `Il veicolo ${found.name} (${found.plate}) è attualmente contrassegnato come fuori servizio/inattivo.`
          );
          return;
        }

        setTargetVehicle(found);
        setIdentifiedVia(detectedSource);

        const isNative = Capacitor.isNativePlatform() || isFromNativeUrl;
        const alreadyChoseWeb = sessionStorage.getItem('preferred_web_mode') === 'true';

        // Mostra la modale di benvenuto/download APK SOLO per NFC su browser web non ancora configurato
        if (detectedSource === 'nfc' && !isNative && !alreadyChoseWeb) {
          setNfcWelcomeModalOpen(true);
        } else {
          // Da QR Code o con APK installata: si apre direttamente la scelta Inizia Viaggio / Inserisci Utilizzo
          setVehicleActionModalOpen(true);
          addToast('success', 'Mezzo Identificato', `${found.name} (${found.plate}) pronto per il servizio.`);
        }
      } else {
        addToast(
          'warning',
          'Mezzo Non Trovato',
          `Nessun veicolo della flotta corrisponde all'identificativo letto: "${target}".`
        );
      }
    };

    // Lettura da query string (Web / PWA)
    const params = new URLSearchParams(window.location.search);
    const vId = params.get('vehicleId') || params.get('qr') || params.get('nfc');
    if (vId) {
      identifyAndOpenVehicle(vId);
    }

    // Ascolto apertura Deep Link / NFC su Android Nativo (Capacitor)
    let urlListenerSubscription: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', (event: { url: string }) => {
        if (event?.url) {
          identifyAndOpenVehicle(event.url, true);
        }
      }).then(sub => {
        urlListenerSubscription = sub;
      }).catch(err => {
        console.warn('Errore listener deep link nativo:', err);
      });
    }

    return () => {
      if (urlListenerSubscription?.remove) {
        urlListenerSubscription.remove();
      }
    };
  }, [vehicles]);

  // Azioni sessione
  const handleLockSession = () => {
    localStorage.setItem('coop_session_locked', 'true');
    setIsSessionLocked(true);
  };

  const handleUnlockSuccess = () => {
    localStorage.removeItem('coop_session_locked');
    setIsSessionLocked(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsSessionLocked(false);
  };

  // Identificazione viaggio in corso per l'operatore
  const ongoingTrip = currentUser
    ? usages.find(u => u.status === 'in_corso' && u.driverId === currentUser.uid) || null
    : null;

  const pendingRequestsCount = correctionRequests.filter(r => r.status === 'in_attesa').length;
  const expiringVehiclesCount = getFleetExpiryAlerts(vehicles).length;

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="p-4 bg-slate-800 rounded-3xl border border-teal-500/30 shadow-2xl shadow-teal-950/40 mb-4 animate-pulse">
          <FriendlyVanMascot mood="driving" size="lg" />
        </div>
        <p className="text-sm font-bold tracking-tight text-teal-200">
          Caricamento ViaggiaBella...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Cooperativa Clarabella
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={user => {
      setCurrentUser(user);
      addToast('success', 'Accesso effettuato', `Benvenuto, ${user.displayName}!`);
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-teal-700 selection:text-white pb-12">
      {/* Navbar Principale */}
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLockSession={handleLockSession}
        onOpenPinSetup={() => setPinSetupOpen(true)}
        onLogout={handleLogout}
        pendingRequestsCount={pendingRequestsCount}
        expiringVehiclesCount={expiringVehiclesCount}
        viewMode={viewMode}
        onToggleViewMode={mode => {
          setViewMode(mode);
          setActiveTab(mode === 'amministratore' ? 'admin-dashboard' : 'operator-home');
        }}
        onCheckUpdates={handleManualCheckUpdates}
        hasUpdatePending={!!updateInfo}
      />

      {/* Contenuto Principale */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 flex-1">
        {viewMode === 'amministratore' ? (
          <>
            {activeTab === 'admin-dashboard' && (
              <AdminDashboard
                usages={usages}
                vehicles={vehicles}
                requests={correctionRequests}
                onNavigate={setActiveTab}
                onSelectUsage={u => {
                  setTargetUsageToEdit(u);
                  setUsageFormOpen(true);
                }}
              />
            )}

            {activeTab === 'admin-usages' && (
              <UsagesTable
                usages={usages}
                vehicles={vehicles}
                adminUser={currentUser}
                onEditUsage={u => {
                  setTargetUsageToEdit(u);
                  setUsageFormOpen(true);
                }}
              />
            )}

            {activeTab === 'admin-vehicles' && (
              <VehiclesManager vehicles={vehicles} adminUser={currentUser} />
            )}

            {activeTab === 'admin-requests' && (
              <CorrectionRequestsManager
                requests={correctionRequests}
                usages={usages}
                adminUser={currentUser}
                onRefresh={() => {}}
              />
            )}

            {activeTab === 'admin-reports' && (
              <ReportsView usages={usages} vehicles={vehicles} />
            )}

            {activeTab === 'admin-audit' && <AuditLogViewer logs={auditLogs} />}

            {activeTab === 'admin-users' && <UsersManager adminUser={currentUser} />}
          </>
        ) : (
          <>
            {activeTab === 'operator-home' && (
              <OperatorDashboard
                user={currentUser}
                vehicles={vehicles}
                usages={usages}
                settings={settings}
                ongoingTrip={ongoingTrip}
                scannedVehicle={targetVehicle}
                onClearScannedVehicle={() => setTargetVehicle(null)}
                onVehicleScanned={v => setTargetVehicle(v)}
                onStartTripModalOpen={v => {
                  const toStart = v || targetVehicle;
                  if (toStart) {
                    setTargetVehicle(toStart);
                    setStartTripOpen(true);
                  } else {
                    setTargetVehicle(null);
                    setStartTripOpen(true);
                  }
                }}
                onManualFormOpen={v => {
                  setTargetVehicle(v || null);
                  setTargetUsageToEdit(null);
                  setUsageFormOpen(true);
                }}
                onQrScannerOpen={() => setQrScannerOpen(true)}
                onFinishTripOpen={u => {
                  setTargetUsageToFinish(u);
                  setFinishTripOpen(true);
                }}
                onEditTripOpen={u => {
                  setTargetUsageToEdit(u);
                  setUsageFormOpen(true);
                }}
                onRequestCorrectionOpen={u => {
                  setTargetUsageForCorrection(u);
                  setCorrectionModalOpen(true);
                }}
              />
            )}

            {activeTab === 'operator-my-usages' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    I Miei Utilizzi Mezzi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Storico dei tuoi viaggi e stato delle modifiche (finestra di 30 minuti)
                  </p>
                </div>
                <MyUsagesList
                  usages={usages}
                  user={currentUser}
                  onEditClick={u => {
                    setTargetUsageToEdit(u);
                    setUsageFormOpen(true);
                  }}
                  onFinishClick={u => {
                    setTargetUsageToFinish(u);
                    setFinishTripOpen(true);
                  }}
                  onRequestCorrectionClick={u => {
                    setTargetUsageForCorrection(u);
                    setCorrectionModalOpen(true);
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALI APPLICATIVI */}

      {/* 1. Modale Sblocco PIN Sessione */}
      {isSessionLocked && (
        <PinModal
          user={currentUser}
          onSuccess={handleUnlockSuccess}
          onFullLogout={handleLogout}
        />
      )}

      {/* 2. Modale Configurazione PIN Personale */}
      <PinSetupModal
        user={currentUser}
        isOpen={pinSetupOpen}
        onClose={() => setPinSetupOpen(false)}
        onUserUpdated={updated => setCurrentUser(updated)}
      />

      {/* 3. Modale Scanner QR Code con fotocamera */}
      <QrScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        vehicles={vehicles}
        onVehicleIdentified={v => {
          setTargetVehicle(v);
          setIdentifiedVia('qr');
          setVehicleActionModalOpen(true);
        }}
        onManualSelectRequested={() => {
          setTargetVehicle(null);
          setStartTripOpen(true);
        }}
      />

      {/* 4. Modale di Selezione Azione per il Mezzo Identificato (Inizia Viaggio ORA vs Inserisci Utilizzo) */}
      <VehicleIdentifiedActionModal
        vehicle={targetVehicle}
        isOpen={vehicleActionModalOpen}
        identifiedVia={identifiedVia}
        onClose={() => setVehicleActionModalOpen(false)}
        onStartTrip={v => {
          setTargetVehicle(v);
          setVehicleActionModalOpen(false);
          setStartTripOpen(true);
        }}
        onManualForm={v => {
          setTargetVehicle(v);
          setTargetUsageToEdit(null);
          setVehicleActionModalOpen(false);
          setUsageFormOpen(true);
        }}
        ongoingTripForVehicle={
          currentUser && targetVehicle
            ? usages.find(
                u =>
                  u.status === 'in_corso' &&
                  u.vehicleId === targetVehicle.id &&
                  u.driverId === currentUser.uid
              ) || null
            : null
        }
        onFinishOngoingTrip={u => {
          setVehicleActionModalOpen(false);
          setTargetUsageToFinish(u);
          setFinishTripOpen(true);
        }}
      />

      {/* 5. Modale di Benvenuto da Scheda NFC: Scarica APK o Prosegui Web (PWA) */}
      {targetVehicle && (
        <NfcWelcomeInstallModal
          vehicle={targetVehicle}
          isOpen={nfcWelcomeModalOpen}
          onProceedWeb={() => {
            sessionStorage.setItem('preferred_web_mode', 'true');
            setNfcWelcomeModalOpen(false);
            setVehicleActionModalOpen(true);
          }}
          onClose={() => setNfcWelcomeModalOpen(false)}
        />
      )}

      {/* 6. Modale Inizia Utilizzo (Modalità B) */}
      <StartTripModal
        isOpen={startTripOpen}
        onClose={() => {
          setStartTripOpen(false);
          setTargetVehicle(null);
        }}
        vehicles={vehicles}
        initialVehicle={targetVehicle}
        driver={currentUser}
        settings={settings}
        onTripStarted={() => {
          addToast('success', 'Viaggio avviato con successo!', 'Buon servizio con il veicolo Clarabella 🚐');
        }}
      />

      {/* 7. Modale Termina Utilizzo (Modalità B) */}
      <FinishTripModal
        isOpen={finishTripOpen}
        onClose={() => {
          setFinishTripOpen(false);
          setTargetUsageToFinish(null);
        }}
        usage={targetUsageToFinish}
        user={currentUser}
        onTripFinished={() => {
          addToast('success', 'Viaggio registrato! Tutto a posto ✨', 'Chilometri finali e durata registrati con successo.');
        }}
      />

      {/* 8. Modale Inserimento Manuale (Modalità A) o Modifica 30 Minuti */}
      <UsageFormModal
        isOpen={usageFormOpen}
        onClose={() => {
          setUsageFormOpen(false);
          setTargetUsageToEdit(null);
          setTargetVehicle(null);
        }}
        usageToEdit={targetUsageToEdit}
        initialVehicle={targetVehicle}
        vehicles={vehicles}
        user={currentUser}
        settings={settings}
        onSaved={() => {
          addToast('success', 'Registrazione salvata!', 'Tutti i dati del viaggio sono stati memorizzati.');
        }}
      />

      {/* 9. Modale Richiesta di Correzione post-30 minuti */}
      <CorrectionRequestModal
        isOpen={correctionModalOpen}
        onClose={() => {
          setCorrectionModalOpen(false);
          setTargetUsageForCorrection(null);
        }}
        usage={targetUsageForCorrection}
        driver={currentUser}
        onSubmitted={() => {
          addToast('info', 'Richiesta inviata', 'La richiesta di correzione è stata inoltrata all\'amministrazione.');
        }}
      />

      {/* 10. Modale Aggiornamento Applicazione APK */}
      <AppUpdateModal
        isOpen={updateModalOpen}
        updateInfo={updateInfo}
        onClose={() => {
          setUpdateModalOpen(false);
          if (updateInfo) {
            sessionStorage.setItem(`update_dismissed_${updateInfo.versionCode}`, 'true');
          }
        }}
      />

      {/* Sistema Notifiche Toast */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
