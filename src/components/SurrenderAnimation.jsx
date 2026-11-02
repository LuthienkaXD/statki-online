import React, { useState, useEffect } from 'react';
import { Flag, X } from 'lucide-react';

/**
 * SurrenderAnimation - Komponent pikselowego smutnego kapitana
 * Kapitan wchodzi powoli od lewej strony ciągnąc białą flagę,
 * zatrzymuje się na środku ekranu i zaczyna nią machać w geście kapitulacji.
 * Pod spodem wyświetla się nazwa przegranego gracza.
 */
export default function SurrenderAnimation({ loserName, isWinner, onClose }) {
  // phase: 'entering' -> 'waving'
  const [phase, setPhase] = useState('entering');
  const [waveFrame, setWaveFrame] = useState(0);

  useEffect(() => {
    // Wejście na środek trwa 2.6s, po czym zaczyna machać flagą
    const enterTimer = setTimeout(() => {
      setPhase('waving');
    }, 2600);

    return () => clearTimeout(enterTimer);
  }, []);

  // Animacja machania flagą i smutnej mimiki kapitana
  useEffect(() => {
    if (phase !== 'waving') return;
    const interval = setInterval(() => {
      setWaveFrame((prev) => (prev + 1) % 4);
    }, 280);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="w-full max-w-4xl mx-auto my-3 p-4 bg-slate-900/95 border-2 border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden relative backdrop-blur-md animate-fade-in text-white">
      {/* Zamknięcie banera jeśli gracz chce obejrzeć samą planszę */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition z-20 cursor-pointer"
          title="Schowaj animację"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Tło morza nocnego w stylu retro pixel art */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>

      {/* Scena marszu i kapitulacji */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden flex flex-col justify-end items-center pb-2">
        {/* Linia pokładu / wody */}
        <div className="absolute bottom-5 left-0 right-0 h-1.5 bg-slate-700 border-b-2 border-slate-600"></div>
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-slate-950 to-slate-900"></div>

        {/* Kontener postaci kapitana */}
        <div
          className={`absolute bottom-5 flex items-end transition-all ${
            phase === 'entering'
              ? 'animate-captain-walk'
              : 'left-1/2 -translate-x-1/2'
          }`}
          style={
            phase === 'entering'
              ? { left: '-120px', animation: 'captainWalkToCenter 2.6s cubic-bezier(0.25, 1, 0.5, 1) forwards' }
              : {}
          }
        >
          {phase === 'entering' ? (
            /* Kapitan idący i ciągnący białą flagę za sobą po ziemi */
            <div className="relative flex items-end select-none">
              {/* Ciągnięta biała flaga po ziemi z tyłu */}
              <div className="relative mr-[-10px] mb-1 opacity-90 animate-pulse">
                {/* Drzewce przechylone w dół wleczone po ziemi */}
                <svg width="70" height="36" viewBox="0 0 70 36" className="overflow-visible">
                  {/* Kij / Maszt */}
                  <line x1="5" y1="32" x2="62" y2="12" stroke="#854d0e" strokeWidth="4" strokeLinecap="round" />
                  {/* Zmarniała biała flaga ciągnąca się z tyłu po desce */}
                  <polygon points="5,33 35,32 50,22 15,26" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <path d="M 6 33 Q 22 36 38 33" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                </svg>
              </div>

              {/* Ręka trzymająca kij wleczony */}
              <div className="relative z-10">
                <PixelCaptainPose pose="dragging" />
              </div>
            </div>
          ) : (
            /* Kapitan na środku machający białą flagą */
            <div className="relative flex flex-col items-center select-none">
              {/* Chmurka z łezką lub dymkiem kapitulacji */}
              <div className="absolute -top-7 right-0 bg-slate-800 border border-slate-600 text-[10px] px-2 py-0.5 rounded-full font-mono text-slate-300 shadow-md animate-bounce">
                Poddaję się... 🏳️
              </div>

              <div className="relative flex items-end">
                {/* Wzniesiona flaga machająca */}
                <div
                  className="absolute z-20 origin-bottom-left transition-transform duration-200"
                  style={{
                    bottom: '28px',
                    left: '26px',
                    transform:
                      waveFrame === 0
                        ? 'rotate(-18deg) scaleX(1)'
                        : waveFrame === 1
                        ? 'rotate(4deg) scaleX(1.05)'
                        : waveFrame === 2
                        ? 'rotate(24deg) scaleX(1.1)'
                        : 'rotate(2deg) scaleX(0.95)'
                  }}
                >
                  <svg width="60" height="60" viewBox="0 0 60 60" className="drop-shadow-md">
                    {/* Drzewce */}
                    <line x1="6" y1="58" x2="18" y2="4" stroke="#a16207" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="18" cy="4" r="3" fill="#eab308" />
                    {/* Płachta białej flagi */}
                    <path
                      d={
                        waveFrame % 2 === 0
                          ? "M 18 6 Q 36 0 54 8 Q 42 22 52 32 Q 32 26 15 30 Z"
                          : "M 18 6 Q 34 12 52 5 Q 38 24 50 34 Q 30 22 15 30 Z"
                      }
                      fill="#ffffff"
                      stroke="#94a3b8"
                      strokeWidth="2"
                    />
                    {/* Cienie fałd materiału */}
                    <path d="M 28 8 Q 38 18 28 28" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>

                <PixelCaptainPose pose="waving" frame={waveFrame} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Podpis z nazwą przegranego gracza */}
      <div className="mt-2 text-center border-t border-slate-800 pt-3 relative z-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-950/70 border border-rose-700/60 rounded-xl mb-1.5">
          <Flag className="w-4 h-4 text-white fill-white animate-pulse" />
          <span className="font-chakra font-bold text-sm tracking-wider uppercase text-rose-200">
            KAPITULACJA FLOTY
          </span>
        </div>

        <div className="text-base sm:text-lg font-chakra font-extrabold tracking-wide text-slate-100">
          Pokonany Kapitan:{' '}
          <span className="text-rose-400 font-mono underline decoration-rose-500 decoration-2 underline-offset-4">
            {loserName || 'Przeciwnik'}
          </span>
        </div>

        <p className="text-xs text-slate-400 mt-1 font-sans">
          {isWinner
            ? `Wszystkie okręty gracza ${loserName} zostały posłane na dno morza!`
            : `Twoje okręty zostały zatopione. Czas wyciągnąć wnioski i wziąć rewanż!`}
        </p>
      </div>

      <style>{`
        @keyframes captainWalkToCenter {
          0% {
            left: -120px;
          }
          100% {
            left: calc(50% - 35px);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Pixel artowa postać kapitana złożona ze stylizowanych komórek svg / pikseli
 */
function PixelCaptainPose({ pose = 'waving', frame = 0 }) {
  // Oczy smutne / z łezką w fazie machania
  const tearDrop = pose === 'waving' && frame % 2 === 1;

  return (
    <svg width="72" height="92" viewBox="0 0 72 92" className="overflow-visible select-none">
      {/* Cień na deskach */}
      <ellipse cx="36" cy="89" rx="22" ry="4" fill="rgba(0,0,0,0.5)" />

      {/* --- CZAPKA KAPITAŃSKA (Pixel Artowa) --- */}
      {/* Daszek czapki */}
      <rect x="14" y="24" width="44" height="5" rx="1.5" fill="#0f172a" />
      <rect x="18" y="26" width="36" height="2" fill="#334155" />
      {/* Korpus czapki (czarny z białym wierzchem) */}
      <rect x="20" y="14" width="32" height="11" fill="#1e293b" />
      <rect x="16" y="8" width="40" height="9" fill="#f8fafc" />
      {/* Złoty sznur kapitański */}
      <rect x="18" y="22" width="36" height="3" fill="#eab308" />
      {/* Złota kotwica na czapce */}
      <rect x="33" y="16" width="6" height="6" fill="#fbbf24" />
      <rect x="35" y="14" width="2" height="8" fill="#d97706" />

      {/* --- GŁOWA I TWARZ --- */}
      {/* Skóra głowy */}
      <rect x="22" y="28" width="28" height="20" fill="#fbcfe8" />
      <rect x="22" y="28" width="28" height="20" fill="#fed7aa" />

      {/* Smutne brwi opadające ku skroniom (\  /) */}
      <rect x="25" y="32" width="6" height="2" fill="#475569" transform="rotate(15 25 32)" />
      <rect x="41" y="32" width="6" height="2" fill="#475569" transform="rotate(-15 41 32)" />

      {/* Smutne oczy (kropki patrzące w dół) */}
      <rect x="26" y="35" width="4" height="4" fill="#0f172a" />
      <rect x="42" y="35" width="4" height="4" fill="#0f172a" />

      {/* Niebieska łezka spływająca po policzku */}
      {tearDrop && (
        <rect x="44" y="41" width="3" height="4" rx="1" fill="#38bdf8" className="animate-pulse" />
      )}

      {/* Nos */}
      <rect x="34" y="38" width="4" height="3" fill="#fb923c" />

      {/* Krzaczasta kapitańska siwa/ruda broda i wąsy */}
      <rect x="20" y="43" width="32" height="12" fill="#e2e8f0" />
      <rect x="24" y="53" width="24" height="7" fill="#cbd5e1" />
      <rect x="28" y="58" width="16" height="4" fill="#94a3b8" />
      {/* Smutne, opadające w dół usta w brodzie */}
      <path d="M 32 47 Q 36 44 40 47" stroke="#475569" strokeWidth="2" fill="none" />

      {/* Fajka w kąciku ust opadająca smętnie w dół */}
      <rect x="21" y="47" width="5" height="2" fill="#78350f" />
      <rect x="18" y="48" width="4" height="6" fill="#92400e" />
      {/* Mały dymek z fajki gasnący */}
      <circle cx="16" cy="45" r="1.5" fill="#94a3b8" opacity="0.6" />

      {/* --- MUNDUR KAPITANA --- */}
      {/* Ciemnoniebieski płaszcz admiralski */}
      <rect x="18" y="56" width="36" height="22" rx="2" fill="#0f172a" />
      {/* Złote guziki dwurzędowe */}
      <circle cx="31" cy="62" r="1.5" fill="#eab308" />
      <circle cx="41" cy="62" r="1.5" fill="#eab308" />
      <circle cx="31" cy="69" r="1.5" fill="#eab308" />
      <circle cx="41" cy="69" r="1.5" fill="#eab308" />

      {/* Pagony na ramionach ze złotem */}
      <rect x="15" y="56" width="6" height="3" fill="#eab308" />
      <rect x="51" y="56" width="6" height="3" fill="#eab308" />

      {/* RĘCE */}
      {pose === 'dragging' ? (
        <>
          {/* Ręka z tyłu trzymająca wleczony drzewiec */}
          <rect x="12" y="60" width="7" height="14" fill="#0f172a" transform="rotate(25 12 60)" />
          <rect x="7" y="70" width="5" height="5" fill="#fed7aa" />
          {/* Druga ręka opuszczona bezsilnie z przodu */}
          <rect x="51" y="60" width="6" height="15" fill="#0f172a" />
          <rect x="51" y="74" width="6" height="4" fill="#fed7aa" />
        </>
      ) : (
        <>
          {/* Prawa ręka uniesiona do góry z flagą */}
          <rect x="48" y="56" width="7" height="15" fill="#0f172a" transform="rotate(-60 48 56)" />
          <rect x="58" y="44" width="6" height="6" rx="1" fill="#fed7aa" />
          {/* Lewa ręka opuszczona lub trzymająca się za głowę */}
          <rect x="14" y="58" width="6" height="15" fill="#0f172a" />
          <rect x="14" y="72" width="6" height="4" fill="#fed7aa" />
        </>
      )}

      {/* --- NOGI I BUTY (PIKSELOWE) --- */}
      {/* Spodnie */}
      <rect x="25" y="76" width="9" height="9" fill="#1e293b" />
      <rect x="38" y="76" width="9" height="9" fill="#1e293b" />
      {/* Czarne buty oficerskie */}
      <rect x="23" y="83" width="11" height="6" rx="1" fill="#020617" />
      <rect x="38" y="83" width="11" height="6" rx="1" fill="#020617" />
    </svg>
  );
}
