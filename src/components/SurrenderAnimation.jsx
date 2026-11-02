import React, { useState, useEffect } from 'react';
import { Flag, X } from 'lucide-react';

/**
 * SurrenderAnimation - Komponent pikselowego smutnego kapitana
 * - Brak tła (pełna przezroczystość nad planszami, brak ciemnego boksu czy pasków)
 * - Wolny, melancholijny marsz od lewej strony przez plansze
 * - W okolicy środka plansz (40% - 60%) kapitan wyraźnie zwalnia / zatrzymuje się,
 *   wznosi białą flagę i powoli nią macha w geście kapitulacji
 * - Poniżej postaci wyświetla się nazwa pokonanego gracza
 */
export default function SurrenderAnimation({ loserName, isWinner, onClose }) {
  const [waveFrame, setWaveFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveFrame((prev) => (prev + 1) % 4);
    }, 320);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto my-1 pointer-events-none select-none z-30">
      {/* Przycisk zamknięcia (klikalny) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-0 right-2 pointer-events-auto p-1.5 text-slate-400 hover:text-slate-700 bg-white/80 hover:bg-white rounded-full shadow-xs border border-slate-200 transition cursor-pointer z-40"
          title="Schowaj animację"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Scena marszu bez tła */}
      <div className="relative h-40 sm:h-44 w-full overflow-hidden flex items-end">
        {/* Kontener postaci kapitana - płynna ścieżka z wyraźnym zwolnieniem na środku */}
        <div
          className="absolute bottom-2 flex flex-col items-center animate-captain-journey"
          style={{
            animation: 'captainTraverse 9.5s cubic-bezier(0.25, 0.1, 0.25, 1) infinite'
          }}
        >
          {/* Dymek poddaję się */}
          <div className="mb-1 bg-white/95 border-2 border-slate-300 text-[10px] px-2.5 py-0.5 rounded-full font-mono text-slate-800 shadow-md flex items-center space-x-1">
            <span>Poddaję się...</span>
            <span>🏳️</span>
          </div>

          {/* Kapitan z flagą */}
          <div className="relative flex items-end">
            {/* Biała flaga powiewająca */}
            <div
              className="absolute z-20 origin-bottom-left transition-transform duration-300"
              style={{
                bottom: '26px',
                left: '26px',
                transform:
                  waveFrame === 0
                    ? 'rotate(-16deg) scaleX(1)'
                    : waveFrame === 1
                    ? 'rotate(2deg) scaleX(1.06)'
                    : waveFrame === 2
                    ? 'rotate(22deg) scaleX(1.1)'
                    : 'rotate(0deg) scaleX(0.96)'
              }}
            >
              <svg width="64" height="64" viewBox="0 0 64 64" className="drop-shadow-md">
                {/* Drzewce */}
                <line x1="6" y1="60" x2="18" y2="6" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
                <circle cx="18" cy="6" r="3" fill="#eab308" />
                {/* Płachta białej flagi */}
                <path
                  d={
                    waveFrame % 2 === 0
                      ? "M 18 8 Q 38 1 56 10 Q 44 24 54 36 Q 34 30 16 34 Z"
                      : "M 18 8 Q 36 15 54 7 Q 40 26 52 38 Q 32 25 16 34 Z"
                  }
                  fill="#ffffff"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <path d="M 28 10 Q 38 20 28 32" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <PixelCaptainCharacter frame={waveFrame} />
          </div>

          {/* Podpis pod idącym kapitanem */}
          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-white/90 border border-slate-300 shadow-xs flex items-center space-x-1">
            <span className="text-[10px] font-chakra font-bold text-rose-600 uppercase tracking-wider">
              {loserName || 'Przeciwnik'}
            </span>
          </div>
        </div>
      </div>

      {/* Pasek informacyjny kapitulacji pod sceną (czysty, bez ciemnego tła) */}
      <div className="text-center pt-1">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/90 border border-rose-300 rounded-xl shadow-xs">
          <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600 animate-pulse" />
          <span className="text-xs font-chakra font-bold text-slate-800">
            KAPITULACJA:{' '}
            <span className="text-rose-600 font-mono underline decoration-rose-400 underline-offset-2">
              {loserName || 'Przeciwnik'}
            </span>
          </span>
        </div>
      </div>

      {/* Animacja wolnego przejścia: idzie od -10% do środka 45%-55% bardzo powoli, a potem wychodzi dalej */}
      <style>{`
        @keyframes captainTraverse {
          0% {
            left: -80px;
          }
          30% {
            left: calc(42% - 35px);
          }
          65% {
            left: calc(54% - 35px);
          }
          100% {
            left: calc(100% + 80px);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Pixel artowa postać smutnego kapitana bez zbędnych teł
 */
function PixelCaptainCharacter({ frame = 0 }) {
  const tearDrop = frame % 2 === 1;

  return (
    <svg width="72" height="92" viewBox="0 0 72 92" className="overflow-visible select-none drop-shadow-sm">
      {/* Cień */}
      <ellipse cx="36" cy="89" rx="20" ry="3.5" fill="rgba(0,0,0,0.18)" />

      {/* --- CZAPKA KAPITAŃSKA --- */}
      {/* Daszek */}
      <rect x="14" y="24" width="44" height="5" rx="1.5" fill="#0f172a" />
      <rect x="18" y="26" width="36" height="2" fill="#334155" />
      {/* Korpus czapki */}
      <rect x="20" y="14" width="32" height="11" fill="#1e293b" />
      <rect x="16" y="8" width="40" height="9" fill="#f8fafc" />
      {/* Złoty sznur */}
      <rect x="18" y="22" width="36" height="3" fill="#eab308" />
      {/* Złota kotwica */}
      <rect x="33" y="16" width="6" height="6" fill="#fbbf24" />
      <rect x="35" y="14" width="2" height="8" fill="#d97706" />

      {/* --- GŁOWA I TWARZ --- */}
      <rect x="22" y="28" width="28" height="20" fill="#fed7aa" />

      {/* Smutne opadające brwi */}
      <rect x="25" y="32" width="6" height="2" fill="#475569" transform="rotate(15 25 32)" />
      <rect x="41" y="32" width="6" height="2" fill="#475569" transform="rotate(-15 41 32)" />

      {/* Smutne oczy */}
      <rect x="26" y="35" width="4" height="4" fill="#0f172a" />
      <rect x="42" y="35" width="4" height="4" fill="#0f172a" />

      {/* Łezka */}
      {tearDrop && (
        <rect x="44" y="41" width="3" height="4" rx="1" fill="#38bdf8" />
      )}

      {/* Nos */}
      <rect x="34" y="38" width="4" height="3" fill="#fb923c" />

      {/* Krzaczasta siwa broda kapitana */}
      <rect x="20" y="43" width="32" height="12" fill="#e2e8f0" />
      <rect x="24" y="53" width="24" height="7" fill="#cbd5e1" />
      <rect x="28" y="58" width="16" height="4" fill="#94a3b8" />
      {/* Smutne opadające usta */}
      <path d="M 32 47 Q 36 44 40 47" stroke="#475569" strokeWidth="2" fill="none" />

      {/* Fajka w kąciku ust */}
      <rect x="21" y="47" width="5" height="2" fill="#78350f" />
      <rect x="18" y="48" width="4" height="6" fill="#92400e" />
      <circle cx="16" cy="45" r="1.5" fill="#94a3b8" opacity="0.6" />

      {/* --- MUNDUR --- */}
      <rect x="18" y="56" width="36" height="22" rx="2" fill="#0f172a" />
      {/* Złote guziki */}
      <circle cx="31" cy="62" r="1.5" fill="#eab308" />
      <circle cx="41" cy="62" r="1.5" fill="#eab308" />
      <circle cx="31" cy="69" r="1.5" fill="#eab308" />
      <circle cx="41" cy="69" r="1.5" fill="#eab308" />
      {/* Pagony */}
      <rect x="15" y="56" width="6" height="3" fill="#eab308" />
      <rect x="51" y="56" width="6" height="3" fill="#eab308" />

      {/* Ręce */}
      <rect x="48" y="56" width="7" height="15" fill="#0f172a" transform="rotate(-60 48 56)" />
      <rect x="58" y="44" width="6" height="6" rx="1" fill="#fed7aa" />
      <rect x="14" y="58" width="6" height="15" fill="#0f172a" />
      <rect x="14" y="72" width="6" height="4" fill="#fed7aa" />

      {/* Nogi i buty */}
      <rect x="25" y="76" width="9" height="9" fill="#1e293b" />
      <rect x="38" y="76" width="9" height="9" fill="#1e293b" />
      <rect x="23" y="83" width="11" height="6" rx="1" fill="#020617" />
      <rect x="38" y="83" width="11" height="6" rx="1" fill="#020617" />
    </svg>
  );
}
