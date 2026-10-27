import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Se già installata e in esecuzione standalone, non mostrare nulla
  if (isInstalled) {
    return null;
  }

  // Flusso Android / Chromium / Desktop
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installa App</span>
      </button>
    );
  }

  // Flusso iOS Safari
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Installa su iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-slate-800 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-base text-slate-900">Installa su iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    Tocca il pulsante <strong>Condividi</strong> nella barra di Safari in basso (l'icona con il quadrato e la freccia verso l'alto).
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    Scorri le opzioni verso il basso e seleziona <strong>"Aggiungi alla schermata Home"</strong>.
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    Conferma toccando <strong>"Aggiungi"</strong> in alto a destra: l'icona dell'app apparirà tra le tue app come un'app nativa.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
              >
                Ho Capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
