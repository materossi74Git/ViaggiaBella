import React, { useState } from 'react';
import {
  Radio,
  X,
  Smartphone,
  Copy,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Vehicle, AppUser } from '../../types';
import {
  checkNfcSupport,
  writeVehicleNfcTag,
  getVehicleNfcUrl,
  startNfcScan,
  AAR_PACKAGE_NAME,
} from '../../services/nfcService';
import { saveVehicle } from '../../services/dbService';

interface NfcTagWriterModalProps {
  vehicle: Vehicle;
  adminUser: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated?: (updated: Vehicle) => void;
}

export const NfcTagWriterModal: React.FC<NfcTagWriterModalProps> = ({
  vehicle,
  adminUser,
  isOpen,
  onClose,
  onVehicleUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'guide' | 'test'>('direct');
  const [isWriting, setIsWriting] = useState(false);
  const [writeFeedback, setWriteFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPkg, setCopiedPkg] = useState(false);

  // Test scanner state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const nfcSupport = checkNfcSupport();
  const nfcUrl = getVehicleNfcUrl(vehicle.id);

  const handleDirectWrite = async () => {
    setIsWriting(true);
    setWriteFeedback({
      type: 'info',
      message: 'Sensore attivo: tieni ora la scheda o adesivo NFC (NTAG213/215/216) a contatto con il retro del telefono...',
    });

    try {
      const res = await writeVehicleNfcTag(vehicle.id, `${vehicle.name} (${vehicle.plate})`);
      if (res.success) {
        setWriteFeedback({ type: 'success', message: res.message });
        // Se il mezzo non aveva ancora un ID NFC memorizzato, aggiornalo
        const updatedVehicle: Vehicle = {
          ...vehicle,
          nfcTagId: vehicle.nfcTagId || `nfc-${vehicle.plate.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          updatedAt: new Date().toISOString(),
        };
        try {
          await saveVehicle(updatedVehicle, adminUser);
          if (onVehicleUpdated) onVehicleUpdated(updatedVehicle);
        } catch (dbErr) {
          console.warn('Salvataggio id NFC su DB non critico:', dbErr);
        }
      } else {
        setWriteFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setWriteFeedback({
        type: 'error',
        message: err?.message || 'Errore imprevisto durante la scrittura.',
      });
    } finally {
      setIsWriting(false);
    }
  };

  const handleTestScan = async () => {
    setIsTesting(true);
    setTestResult(null);

    const stop = await startNfcScan(
      tagPayload => {
        setIsTesting(false);
        const matches =
          tagPayload.includes(vehicle.id) ||
          tagPayload.includes(vehicle.plate) ||
          tagPayload === vehicle.nfcTagId;
        if (matches) {
          setTestResult(`✅ Perfetto! Scheda letta con successo per ${vehicle.name} (${vehicle.plate}).`);
        } else {
          setTestResult(`⚠️ Scheda letta con contenuto: "${tagPayload}". Verifica se corrisponde a questo mezzo.`);
        }
        stop();
      },
      err => {
        setIsTesting(false);
        setTestResult(`❌ Errore test: ${err}`);
      }
    );
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(nfcUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyPkg = () => {
    navigator.clipboard.writeText(AAR_PACKAGE_NAME);
    setCopiedPkg(true);
    setTimeout(() => setCopiedPkg(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 text-white flex items-start justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30 mb-0.5">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Programmazione Scheda NFC</span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                {vehicle.name} • <span className="font-mono text-teal-300">{vehicle.plate}</span>
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors tap-bounce"
            aria-label="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spiegazione Sintetica */}
        <div className="px-5 py-3 bg-teal-50/70 border-b border-teal-100/80 text-xs text-teal-950 flex items-center space-x-2.5 shrink-0">
          <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
          <p className="leading-snug">
            Avvicinando la scheda programmata al cruscotto: <strong>se l'APK è installata</strong> l'app si apre subito col mezzo selezionato. <strong>Se non è installata</strong>, apre la pagina chiedendo se scaricare l'APK o usare la modalità Web (PWA).
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 shrink-0 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'direct'
                ? 'border-teal-600 text-teal-800 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Scrittura Diretta con Smartphone</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-teal-600 text-teal-800 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guida con App "NFC Tools"</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'test'
                ? 'border-teal-600 text-teal-800 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Collaudo / Test Lettura</span>
          </button>
        </div>

        {/* Body Contenuto */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
          {/* TAB 1: Scrittura Diretta Web NFC */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Stato Sensore Web NFC:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      nfcSupport.supported
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {nfcSupport.supported ? 'Pronto su questo dispositivo' : 'Non disponibile qui'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {nfcSupport.message}
                </p>
              </div>

              {nfcSupport.supported ? (
                <div className="space-y-4 text-center py-2">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-700 shadow-sm relative">
                    <Radio className={`w-10 h-10 ${isWriting ? 'animate-ping' : ''}`} />
                  </div>

                  <div className="max-w-md mx-auto">
                    <h4 className="font-bold text-sm text-slate-900">
                      {isWriting ? 'In attesa della scheda NFC...' : 'Pronto per scrivere la scheda'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Usa qualsiasi adesivo o tesserina standard tipo <strong>NTAG213, NTAG215 o NTAG216</strong> (costo pochi centesimi).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDirectWrite}
                    disabled={isWriting}
                    className="w-full max-w-sm mx-auto py-3.5 px-6 rounded-2xl bg-teal-700 hover:bg-teal-600 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-teal-700/20 transition-all flex items-center justify-center space-x-2 tap-bounce disabled:opacity-50"
                  >
                    <Radio className="w-5 h-5" />
                    <span>{isWriting ? 'Scrittura in corso...' : 'Avvia Scrittura Scheda NFC'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Stai usando un browser senza Web NFC (o PC Desktop)</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Nessun problema: puoi scrivere le schede comodamente aprendo la scheda <strong>"Guida con App NFC Tools"</strong> qui sopra, che funziona al 100% su qualsiasi telefono Android o iPhone tramite l'applicazione gratuita più diffusa al mondo.
                  </p>
                </div>
              )}

              {/* Feedback Scrittura */}
              {writeFeedback && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-start space-x-2.5 animate-in fade-in duration-200 ${
                    writeFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : writeFeedback.type === 'error'
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-teal-50 border-teal-300 text-teal-950'
                  }`}
                >
                  {writeFeedback.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  )}
                  <span className="text-xs leading-relaxed">{writeFeedback.message}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Guida Universale con NFC Tools */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950">
                <div className="font-bold text-xs flex items-center space-x-1.5 text-indigo-900 mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Metodo Universale (Funziona su Qualsiasi Smartphone)</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Con l'app gratuita <strong>NFC Tools</strong> (disponibile sul Play Store di Google e App Store di Apple) puoi scrivere le schede in meno di 30 secondi per tutta la flotta.
                </p>
              </div>

              {/* Link del Mezzo da Copiare */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">1. URL del Veicolo per la Scheda:</span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="flex items-center space-x-1 text-teal-700 hover:text-teal-900 font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-teal-300 shadow-xs tap-bounce"
                  >
                    {copiedUrl ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copia URL</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 text-teal-300 font-mono text-[11px] break-all select-all">
                  {nfcUrl}
                </div>
              </div>

              {/* Package AAR da Copiare */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-800">2. Record Applicazione Android (AAR opzionale):</span>
                    <p className="text-[10px] text-slate-500">Garantisce che Android apra direttamente l'APK senza chiedere al browser</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPkg}
                    className="flex items-center space-x-1 text-indigo-700 hover:text-indigo-900 font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-indigo-300 shadow-xs tap-bounce"
                  >
                    {copiedPkg ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copia Package</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 text-indigo-300 font-mono text-[11px] select-all">
                  {AAR_PACKAGE_NAME}
                </div>
              </div>

              {/* Istruzioni Passo-Passo */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Procedura Passo-Passo in 4 Tocchi:
                </h4>
                <ol className="list-decimal pl-4 space-y-2 text-xs text-slate-600">
                  <li>
                    Installa l'app gratuita <strong>NFC Tools</strong> da Google Play Store (o App Store).
                  </li>
                  <li>
                    Apri NFC Tools e vai nella scheda <strong>"Scrivi"</strong> (Write) → premi <strong>"Aggiungi un record"</strong>.
                  </li>
                  <li>
                    Scegli <strong>"URL / URI"</strong> e incolla l'URL copiato al punto 1 qui sopra.
                  </li>
                  <li>
                    <em>(Consigliato per apertura istantanea APK):</em> Premi di nuovo <strong>"Aggiungi un record"</strong> → scegli <strong>"Applicazione"</strong> → incolla il nome package: <code className="font-mono bg-slate-100 px-1 rounded">{AAR_PACKAGE_NAME}</code>.
                  </li>
                  <li>
                    Premi il grande pulsante <strong>"Scrivi"</strong> e appoggia la scheda o adesivo NFC al retro del telefono per un istante. <strong>Fatto!</strong>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: Collaudo Lettura */}
          {activeTab === 'test' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Radio className={`w-8 h-8 ${isTesting ? 'text-teal-600 animate-pulse' : ''}`} />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-sm text-slate-900">
                  {isTesting ? 'Avvicina la scheda programmata...' : 'Verifica la Scheda Appena Scritta'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Tocca il pulsante qui sotto e appoggia la scheda al retro dello smartphone per verificare se riconosce correttamente il mezzo.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestScan}
                disabled={isTesting}
                className="w-full max-w-xs mx-auto py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 tap-bounce disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{isTesting ? 'In ascolto...' : 'Avvia Test di Lettura'}</span>
              </button>

              {testResult && (
                <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-900 animate-in fade-in">
                  {testResult}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs tap-bounce transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
