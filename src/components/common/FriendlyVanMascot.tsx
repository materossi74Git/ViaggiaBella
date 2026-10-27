import React from 'react';

export type MascotMood = 'idle' | 'driving' | 'completed' | 'celebrate' | 'alert';
export type MascotSize = 'sm' | 'md' | 'lg' | 'hero';

interface FriendlyVanMascotProps {
  mood?: MascotMood;
  size?: MascotSize;
  className?: string;
  showCaption?: boolean;
  captionText?: string;
}

export const FriendlyVanMascot: React.FC<FriendlyVanMascotProps> = ({
  mood = 'idle',
  size = 'md',
  className = '',
  showCaption = false,
  captionText,
}) => {
  // Dimensioni responsive per thumb e desktop
  const sizeMap: Record<MascotSize, { width: number; height: number; boxClass: string }> = {
    sm: { width: 56, height: 42, boxClass: 'w-14 h-11' },
    md: { width: 88, height: 64, boxClass: 'w-22 h-16' },
    lg: { width: 140, height: 96, boxClass: 'w-36 h-24' },
    hero: { width: 180, height: 120, boxClass: 'w-44 h-28 sm:w-52 sm:h-34' },
  };

  const currentSize = sizeMap[size];

  // Colori identità: Verde Petrolio (#0f766e / #0d5c63), Blu Notte (#0f172a), Azzurro Luminoso (#38bdf8)
  const isDriving = mood === 'driving';
  const isCelebrate = mood === 'celebrate' || mood === 'completed';
  const isAlert = mood === 'alert';

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className={`relative ${currentSize.boxClass} flex items-center justify-center transition-transform duration-200`}>
        {/* Ombra del veicolo a terra */}
        <div
          className={`absolute bottom-0 left-3 right-3 h-2 rounded-full bg-slate-900/15 blur-[2px] transition-all duration-300 ${
            isDriving ? 'scale-x-110 opacity-70' : 'opacity-100'
          }`}
        />

        {/* SVG Vettoriale del Furgoncino della Cooperativa */}
        <svg
          viewBox="0 0 160 110"
          className="w-full h-full drop-shadow-sm overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Scia di vento / brezza se in viaggio */}
          {isDriving && (
            <g className="text-teal-400/80 stroke-current animate-pulse" strokeWidth="2.5" strokeLinecap="round">
              <path d="M 6 42 Q 18 42 26 42" strokeDasharray="3 3" />
              <path d="M 2 55 Q 16 55 24 55" />
              <path d="M 8 68 Q 20 68 28 68" strokeDasharray="4 2" />
            </g>
          )}

          {/* Fascio di luce fari azzurro luminoso se in viaggio */}
          {isDriving && (
            <path
              d="M 148 66 L 168 55 L 168 85 L 148 76 Z"
              fill="url(#headlight-beam)"
              opacity="0.65"
            />
          )}

          <defs>
            <linearGradient id="headlight-beam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradiente carrozzeria: Verde Petrolio Elegante */}
            <linearGradient id="van-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="40%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>

            {/* Gradiente Tetto & Dettagli: Azzurro Elettrico / Petrolio chiaro */}
            <linearGradient id="van-roof" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* Gradiente vetri: Azzurro luminoso con riflesso */}
            <linearGradient id="van-glass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="50%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
          </defs>

          {/* Sagoma Principale del Furgone con angoli morbidi e amichevoli */}
          <path
            d="M 32 82 
               L 32 38 
               Q 32 26 44 26 
               L 112 26 
               Q 122 26 128 34 
               L 142 54 
               Q 148 62 148 70 
               L 148 82 
               Q 148 85 145 85 
               L 132 85 
               Q 128 85 128 80 
               A 16 16 0 0 0 96 80 
               Q 96 85 92 85 
               L 64 85 
               Q 60 85 60 80 
               A 16 16 0 0 0 28 80 
               Q 28 85 24 85 
               L 19 85 
               Q 16 85 16 82 
               L 16 82
               Q 16 82 32 82 Z"
            fill="url(#van-body)"
            stroke="#042f2e"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Fascia decorativa orizzontale pancia furgoncino (bianco avorio & azzurro) */}
          <path
            d="M 18 64 L 148 64 L 148 70 L 18 70 Z"
            fill="#f8fafc"
            opacity="0.9"
          />

          {/* Piccolo Emblema Cooperativa: Foglia/Cuore stilizzato sulla fiancata */}
          <g transform="translate(68, 48)">
            <circle cx="9" cy="9" r="8" fill="#ffffff" stroke="#0d9488" strokeWidth="1.5" />
            {/* Due foglioline verdi incrociate (simbolo cooperazione & ecologia) */}
            <path
              d="M 9 13 C 6 11 5 8 9 5 C 13 8 12 11 9 13 Z"
              fill="#0f766e"
            />
            <path
              d="M 9 13 C 11 11 13 8 10 6"
              stroke="#5eead4"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>

          {/* Parabrezza anteriore con riflesso amichevole */}
          <path
            d="M 116 32 L 127 34 L 140 54 L 116 54 Z"
            fill="url(#van-glass)"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Riflesso parabrezza */}
          <path
            d="M 125 36 L 134 52"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Finestrino laterale passeggero */}
          <path
            d="M 90 32 L 111 32 L 111 54 L 90 54 Z"
            fill="url(#van-glass)"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Finestrino posteriore */}
          <path
            d="M 40 32 L 85 32 L 85 54 L 40 54 Q 37 54 37 50 L 37 36 Q 37 32 40 32 Z"
            fill="url(#van-glass)"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Specchietto retrovisore arrotondato */}
          <rect
            x="112"
            y="52"
            width="5"
            height="7"
            rx="2.5"
            fill="#0f766e"
            stroke="#042f2e"
            strokeWidth="1.5"
          />

          {/* Faro Anteriore (occhietto espressivo e cordiale) */}
          <rect
            x="142"
            y="66"
            width="6"
            height="10"
            rx="3"
            fill={isAlert ? '#fbbf24' : '#38bdf8'}
            stroke="#0f172a"
            strokeWidth="1.8"
          />
          {/* Pupilla / riflesso del faro che sembra un occhio felice */}
          <circle cx="145" cy="71" r="1.5" fill="#ffffff" />

          {/* Faro Posteriore */}
          <rect
            x="16"
            y="66"
            width="4"
            height="9"
            rx="2"
            fill="#f43f5e"
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          {/* Paraurti anteriore con forma a sorriso leggero */}
          <path
            d="M 144 80 Q 149 81 149 84 L 140 84 Q 140 80 144 80 Z"
            fill="#334155"
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          {/* Ruota Posteriore */}
          <g transform="translate(44, 80)">
            <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="8" fill="#e2e8f0" stroke="#0f766e" strokeWidth="2" />
            <circle cx="0" cy="0" r="3.5" fill="#0f766e" />
            {isDriving && (
              <line x1="-6" y1="0" x2="6" y2="0" stroke="#0f766e" strokeWidth="1.5" />
            )}
          </g>

          {/* Ruota Anteriore */}
          <g transform="translate(112, 80)">
            <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="8" fill="#e2e8f0" stroke="#0f766e" strokeWidth="2" />
            <circle cx="0" cy="0" r="3.5" fill="#0f766e" />
            {isDriving && (
              <line x1="0" y1="-6" x2="0" y2="6" stroke="#0f766e" strokeWidth="1.5" />
            )}
          </g>

          {/* Dettagli umore: Stellina / Scintilla di successo se celebrate */}
          {isCelebrate && (
            <g transform="translate(138, 18)" className="animate-bounce">
              <path
                d="M 0 6 L 2 2 L 6 0 L 2 -2 L 0 -6 L -2 -2 L -6 0 L -2 2 Z"
                fill="#fbbf24"
              />
            </g>
          )}

          {/* Bolla fumetto discreta o punto esclamativo se alert */}
          {isAlert && (
            <g transform="translate(136, 16)">
              <circle cx="0" cy="0" r="7" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
              <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="10">
                !
              </text>
            </g>
          )}
        </svg>
      </div>

      {showCaption && (
        <span className="text-[11px] font-semibold text-teal-800 mt-1 tracking-tight">
          {captionText || (isDriving ? 'In Viaggio...' : 'Pronto a partire')}
        </span>
      )}
    </div>
  );
};
