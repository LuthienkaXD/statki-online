import React, { useState, useEffect } from 'react';
import { Flag, X } from 'lucide-react';

/**
 * SurrenderAnimation - Komponent pikselowego smutnego kapitana
 * - Brak tła (pełna przezroczystość nad planszami bitewnymi)
 * - Przegrany kapitan idzie smutny na wysokości 5-6 wiersza plansz
 * - Wlecze za sobą białą flagę po ziemi
 * - Zatrzymuje się dokładnie na środku (pomiędzy planszami / na środku widoku)
 * - Dopiero po zatrzymaniu się na środku podnosi flagę w górę i delikatnie nią macha
 * - Pod spodem wyświetla się nazwa pokonanego kapitana
 */
export default function SurrenderAnimation({ loserName, isWinner, boardZoom = 100, onClose }) {
  // state: 'walking' (idzie ciągnąc flagę) -> 'stopped' (zatrzymał się, podnosi flagę i delikatnie macha)
  const [phase, setPhase] = useState('walking');
  const [waveFrame, setWaveFrame] = useState(0);

  useEffect(() => {
    // Kapitan idzie powoli i smutno ze skrajnej lewej strony na środek (4.5 sekundy marszu)
    const stopTimer = setTimeout(() => {
      setPhase('stopped');
    }, 4500);

    return () => clearTimeout(stopTimer);
  }, []);

  // Gdy się zatrzyma, zaczyna delikatnie powiewać flagą
  useEffect(() => {
    if (phase !== 'stopped') return;
    const interval = setInterval(() => {
      setWaveFrame((prev) => (prev + 1) % 4);
    }, 450); // delikatne, spokojne machanie
    return () => clearInterval(interval);
  }, [phase]);

  // Dynamiczna kalkulacja wysokości wiersza 5 i 6 w zależności od zoomu planszy
  // Nagłówek karty floty to ~42px, margines planszy ~12px, etykiety liter ~24px, a wiersz 5-6 to ~5 * cellPx
  const cellPx = Math.round(26 * (boardZoom / 100));
  const topOffsetPx = Math.round(52 + (5 * cellPx) - 30);

  return (
    <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none select-none z-30 overflow-hidden">
      {/* Przycisk zamknięcia (klikalny) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-4 pointer-events-auto p-1.5 text-slate-400 hover:text-slate-700 bg-white/90 hover:bg-white rounded-full shadow-md border border-slate-300 transition cursor-pointer z-40"
          title="Schowaj animację"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Kontener kapitana - umieszczony dokładnie na wysokości 5-6 wiersza plansz */}
      <div
        className="absolute transition-all"
        style={{
          top: `${topOffsetPx}px`,
          left: phase === 'walking' ? '-110px' : 'calc(50% - 36px)',
          animation: phase === 'walking' ? 'walkToCenterRow56 4.5s cubic-bezier(0.2, 0.7, 0.35, 1) forwards' : 'none'
        }}
      >
        <div className="relative flex flex-col items-center">
          
          {/* Dymek z kapitulacją pojawia się dopiero po zatrzymaniu */}
          {phase === 'stopped' && (
            <div className="mb-1 bg-white/95 border border-slate-300 text-[10px] px-2 py-0.5 rounded-full font-mono text-slate-800 shadow-md flex items-center space-x-1 animate-fade-in">
              <span>Poddaję się...</span>
              <span>🏳️</span>
            </div>
          )}

          {/* Kapitan i flaga */}
          <div className="relative flex items-end">
            {phase === 'walking' ? (
              /* Faza marszu: flaga wleczona za plecami po ziemi */
              <div className="relative flex items-end">
                {/* Wleczona biała flaga z tyłu po deskach */}
                <div className="relative mr-[-12px] mb-1">
                  <svg width="65" height="32" viewBox="0 0 65 32" className="overflow-visible">
                    <line x1="4" y1="28" x2="58" y2="8" stroke="#854d0e" strokeWidth="3.5" strokeLinecap="round" />
                    {/* Zmarniała flaga ciągnąca się z tyłu */}
                    <polygon points="5,29 32,28 46,18 14,22" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
                    <path d="M 6 29 Q 20 32 34 29" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>

                <PixelCaptainBody pose="dragging" />
              </div>
            ) : (
              /* Faza zatrzymania na środku: podniesiona biała flaga delikatnie powiewająca */
              <div className="relative flex items-end">
                {/* Uniesiona flaga machająca */}
                <div
                  className="absolute z-20 origin-bottom-left transition-transform duration-350"
                  style={{
                    bottom: '26px',
                    left: '26px',
                    transform:
                      waveFrame === 0
                        ? 'rotate(-8deg) scaleX(1)'
                        : waveFrame === 1
                        ? 'rotate(4deg) scaleX(1.04)'
                        : waveFrame === 2
                        ? 'rotate(12deg) scaleX(1.06)'
                        : 'rotate(2deg) scaleX(0.98)'
                  }}
                >
                  <svg width="60" height="60" viewBox="0 0 60 60" className="drop-shadow-md">
                    <line x1="6" y1="58" x2="16" y2="6" stroke="#92400e" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="16" cy="6" r="2.5" fill="#eab308" />
                    {/* Delikatnie powiewająca biała flaga */}
                    <path
                      d={
                        waveFrame % 2 === 0
                          ? "M 16 8 Q 34 2 50 10 Q 38 22 48 32 Q 30 27 14 30 Z"
                          : "M 16 8 Q 32 14 48 6 Q 36 24 46 34 Q 28 23 14 30 Z"
                      }
                      fill="#ffffff"
                      stroke="#94a3b8"
                      strokeWidth="2"
                    />
                    <path d="M 26 10 Q 34 19 26 29" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>

                <PixelCaptainBody pose="waving" frame={waveFrame} />
              </div>
            )}
          </div>

          {/* Podpis pod kapitanem z nazwą przegranego gracza */}
          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-white/95 border border-slate-300 shadow-sm flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[11px] font-chakra font-bold text-slate-800">
              Kapitulacja: <span className="text-rose-600 font-mono font-extrabold">{loserName || 'Przeciwnik'}</span>
            </span>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes walkToCenterRow56 {
          0% {
            left: -100px;
          }
          100% {
            left: calc(50% - 36px);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Pixel artowy smutny kapitan (bez tła)
 */
function PixelCaptainBody({ pose = 'dragging', frame = 0 }) {
  const tearDrop = pose === 'waving' && frame % 2 === 1;

  return (
    <svg width="72" height="92" viewBox="0 0 72 92" className="overflow-visible select-none drop-shadow-sm">
      {/* Cień pod kapitanem */}
      <ellipse cx="36" cy="89" rx="18" ry="3.5" fill="rgba(0,0,0,0.22)" />

      {/* --- CZAPKA KAPITAŃSKA --- */}
      <rect x="14" y="24" width="44" height="5" rx="1.5" fill="#0f172a" />
      <rect x="18" y="26" width="36" height="2" fill="#334155" />
      <rect x="20" y="14" width="32" height="11" fill="#1e293b" />
      <rect x="16" y="8" width="40" height="9" fill="#f8fafc" />
      <rect x="18" y="22" width="36" height="3" fill="#eab308" />
      <rect x="33" y="16" width="6" height="6" fill="#fbbf24" />
      <rect x="35" y="14" width="2" height="8" fill="#d97706" />

      {/* --- GŁOWA I SMUTNA TWARZ --- */}
      <rect x="22" y="28" width="28" height="20" fill="#fed7aa" />

      {/* Smutne brwi opadające ku dołowi */}
      <rect x="25" y="32" width="6" height="2" fill="#475569" transform="rotate(15 25 32)" />
      <rect x="41" y="32" width="6" height="2" fill="#475569" transform="rotate(-15 41 32)" />

      {/* Oczy patrzące w dół */}
      <rect x="26" y="35" width="4" height="4" fill="#0f172a" />
      <rect x="42" y="35" width="4" height="4" fill="#0f172a" />

      {/* Spływająca łezka */}
      {tearDrop && (
        <rect x="44" y="41" width="3" height="4" rx="1" fill="#38bdf8" />
      )}

      {/* Nos */}
      <rect x="34" y="38" width="4" height="3" fill="#fb923c" />

      {/* Krzaczasta siwa broda */}
      <rect x="20" y="43" width="32" height="12" fill="#e2e8f0" />
      <rect x="24" y="53" width="24" height="7" fill="#cbd5e1" />
      <rect x="28" y="58" width="16" height="4" fill="#94a3b8" />
      {/* Smutne opadające kąciki ust */}
      <path d="M 32 47 Q 36 44 40 47" stroke="#475569" strokeWidth="2" fill="none" />

      {/* Zgaszona fajka opadająca smętnie w dół */}
      <rect x="21" y="47" width="5" height="2" fill="#78350f" />
      <rect x="18" y="48" width="4" height="6" fill="#92400e" />

      {/* --- MUNDUR KAPITANA --- */}
      <rect x="18" y="56" width="36" height="22" rx="2" fill="#0f172a" />
      {/* Złote guziki */}
      <circle cx="31" cy="62" r="1.5" fill="#eab308" />
      <circle cx="41" cy="62" r="1.5" fill="#eab308" />
      <circle cx="31" cy="69" r="1.5" fill="#eab308" />
      <circle cx="41" cy="69" r="1.5" fill="#eab308" />
      {/* Pagony ze złotem */}
      <rect x="15" y="56" width="6" height="3" fill="#eab308" />
      <rect x="51" y="56" width="6" height="3" fill="#eab308" />

      {/* --- RĘCE --- */}
      {pose === 'dragging' ? (
        <>
          {/* Ręka z tyłu wlecze drzewce po deskach */}
          <rect x="12" y="60" width="7" height="14" fill="#0f172a" transform="rotate(22 12 60)" />
          <rect x="8" y="70" width="5" height="5" fill="#fed7aa" />
          {/* Druga ręka bezsilnie opuszczona z przodu */}
          <rect x="51" y="60" width="6" height="15" fill="#0f172a" />
          <rect x="51" y="74" width="6" height="4" fill="#fed7aa" />
        </>
      ) : (
        <>
          {/* Ręka podniesiona w górę z flagą */}
          <rect x="48" y="56" width="7" height="15" fill="#0f172a" transform="rotate(-60 48 56)" />
          <rect x="58" y="44" width="6" height="6" rx="1" fill="#fed7aa" />
          {/* Druga ręka opuszczona */}
          <rect x="14" y="58" width="6" height="15" fill="#0f172a" />
          <rect x="14" y="72" width="6" height="4" fill="#fed7aa" />
        </>
      )}

      {/* --- NOGI I BUTY --- */}
      <rect x="25" y="76" width="9" height="9" fill="#1e293b" />
      <rect x="38" y="76" width="9" height="9" fill="#1e293b" />
      <rect x="23" y="83" width="11" height="6" rx="1" fill="#020617" />
      <rect x="38" y="83" width="11" height="6" rx="1" fill="#020617" />
    </svg>
  );
}
