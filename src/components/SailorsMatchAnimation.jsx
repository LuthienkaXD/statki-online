import React, { useState, useEffect } from 'react';

/**
 * SailorsMatchAnimation
 * 
 * - Umieszczona po lewej stronie plansz bitewnych (lub nad nimi na węższych ekranach).
 * - Siedzi dwóch marynarzy na krzesłach naprzeciwko siebie przy małym stoliku:
 *   - Lewy marynarz: przeciwnik (kolor ubrania dopasowany do enemyFleetColor).
 *   - Prawy marynarz: mój gracz (kolor ubrania dopasowany do myFleetColor).
 *   - Pomiędzy nimi mały stolik z planszą do gry w statki:
 *     pozioma deska/stół, siatka z pionową kreską dzielącą planszę na 2 części i miniaturowymi statkami.
 * - Standardowo podczas gry marynarze siedzą pochyleni w stronę planszy.
 * - Jeśli tura którejś ze stron trwa dłużej niż 30 sekund:
 *   - Ten marynarz, który CZEKA na ruch przeciwnika (nie jego tura),
 *     opiera się na oparciu krzesła, odchyla głowę do tyłu i zasypia:
 *     z nosa/ust rośnie i pulsuje bąbelek senny (snot bubble), a nad głową pojawia się animowane "Zzz".
 *   - Po oddaniu ruchu (zmianie tury lub strzale) marynarz natychmiast budzi się i pochyla z powrotem.
 */
export default function SailorsMatchAnimation({
  turn,
  meKey = 'p1',
  myFleetColor = '#2563eb',
  enemyFleetColor = '#334155',
  status = 'playing',
  turnsCount = 0
}) {
  const [turnElapsedSec, setTurnElapsedSec] = useState(0);

  // Reset timer on every turn change or turnsCount increment
  useEffect(() => {
    setTurnElapsedSec(0);
  }, [turn, turnsCount, status]);

  // Count seconds for current turn
  useEffect(() => {
    if (status !== 'playing') return;

    const timer = setInterval(() => {
      setTurnElapsedSec(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [turn, status, turnsCount]);

  // Which sailor is currently waiting?
  // When it is my turn (turn === meKey), enemy is waiting.
  // When it is enemy's turn (turn !== meKey), I am waiting.
  const isMyTurn = turn === meKey;
  const isEnemyWaiting = isMyTurn;
  const isMeWaiting = !isMyTurn;

  // Has waiting exceeded 30 seconds?
  const isSleepingTimeout = turnElapsedSec >= 30;
  const enemyIsSleeping = status === 'playing' && isEnemyWaiting && isSleepingTimeout;
  const meIsSleeping = status === 'playing' && isMeWaiting && isSleepingTimeout;

  return (
    <div className="w-full xl:w-56 shrink-0 flex flex-col items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs select-none">
      <div className="w-full flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800/80">
        <span className="text-[10px] font-chakra font-bold text-slate-500 uppercase tracking-wider">
          Pojedynek Kapitanów
        </span>
        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
          isSleepingTimeout
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 animate-pulse'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {turnElapsedSec}s {isSleepingTimeout ? '💤' : '⏳'}
        </span>
      </div>

      {/* SVG Canvas with Sailors & Table */}
      <div className="w-full h-44 flex items-center justify-center relative overflow-visible">
        <svg
          viewBox="0 0 220 160"
          className="w-full h-full max-h-44 drop-shadow-sm overflow-visible"
        >
          <defs>
            {/* Soft shadows & gradients */}
            <radialGradient id="tableLight" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="gridBoard" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <filter id="bubbleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#38bdf8" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Floor / Horizon Line */}
          <line x1="10" y1="140" x2="210" y2="140" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" opacity="0.4" />

          {/* ==================== LEFT CHAIR (Enemy) ==================== */}
          <g transform="translate(25, 60)">
            {/* Chair Backrest */}
            <rect x="0" y="0" width="5" height="50" rx="2" fill="#78350f" />
            {/* Chair Seat */}
            <rect x="0" y="38" width="28" height="5" rx="1.5" fill="#92400e" />
            {/* Chair Legs */}
            <line x1="3" y1="43" x2="2" y2="80" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
            <line x1="24" y1="43" x2="25" y2="80" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* ==================== RIGHT CHAIR (Me) ==================== */}
          <g transform="translate(165, 60)">
            {/* Chair Backrest */}
            <rect x="25" y="0" width="5" height="50" rx="2" fill="#78350f" />
            {/* Chair Seat */}
            <rect x="2" y="38" width="28" height="5" rx="1.5" fill="#92400e" />
            {/* Chair Legs */}
            <line x1="27" y1="43" x2="28" y2="80" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
            <line x1="6" y1="43" x2="5" y2="80" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* ==================== TABLE IN THE MIDDLE ==================== */}
          <g transform="translate(80, 88)">
            {/* Table top */}
            <rect x="0" y="0" width="60" height="7" rx="3" fill="url(#tableLight)" stroke="#78350f" strokeWidth="1" />
            {/* Table Legs */}
            <line x1="12" y1="7" x2="8" y2="52" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="48" y1="7" x2="52" y2="52" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
            {/* Table crossbeam */}
            <line x1="10" y1="35" x2="50" y2="35" stroke="#92400e" strokeWidth="2" />

            {/* Battleship Grid Board on top of table */}
            <rect x="8" y="-9" width="44" height="9" rx="1.5" fill="url(#gridBoard)" stroke="#475569" strokeWidth="0.8" />
            {/* Horizontal Line */}
            <line x1="9" y1="-4.5" x2="51" y2="-4.5" stroke="#64748b" strokeWidth="0.6" strokeDasharray="1 1" />
            {/* Middle Vertical Divider Line (dzieląca planszę na dwa) */}
            <line x1="30" y1="-9" x2="30" y2="0" stroke="#0f172a" strokeWidth="1.4" />
            
            {/* Mini ships on Enemy (left) half */}
            <rect x="13" y="-7.5" width="6" height="2" rx="0.5" fill={enemyFleetColor} />
            <rect x="22" y="-6.5" width="4" height="2" rx="0.5" fill={enemyFleetColor} />
            {/* Mini ships on Player (right) half */}
            <rect x="34" y="-7.5" width="7" height="2" rx="0.5" fill={myFleetColor} />
            <rect x="44" y="-6" width="3.5" height="2" rx="0.5" fill={myFleetColor} />
          </g>

          {/* ==================== LEFT SAILOR: ENEMY ==================== */}
          <g className="transition-all duration-700 ease-in-out">
            {enemyIsSleeping ? (
              // SLEEPING STATE: Leaning back on chair backrest, head tilted back, bubble + Zzz
              <g transform="translate(32, 60)">
                {/* Legs seated */}
                <path d="M 12 36 L 25 38 L 24 72" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Torso leaning back against chair */}
                <path d="M 10 36 L 2 12" stroke={enemyFleetColor} strokeWidth="12" strokeLinecap="round" />
                {/* Sailor Striped Collar / neck */}
                <path d="M 0 10 L 6 12" stroke="#ffffff" strokeWidth="3" />
                {/* Arm resting relaxed on lap/chair */}
                <path d="M 4 16 L 8 32 L 20 34" fill="none" stroke={enemyFleetColor} strokeWidth="4" strokeLinecap="round" />
                {/* Hand */}
                <circle cx="21" cy="34" r="2.5" fill="#fbcfe8" />

                {/* Head tilted backwards */}
                <g transform="translate(-1, 0) rotate(-22)">
                  {/* Head */}
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  {/* Sailor Cap (Czapka marynarska z pomponem) */}
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  {/* Sleeping closed eye (line) */}
                  <line x1="2" y1="-1" x2="6" y2="0" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Relaxed open mouth */}
                  <ellipse cx="5" cy="4" rx="2" ry="1.5" fill="#be123c" />

                  {/* Snot Bubble growing from nose (bąbelek z nosa) */}
                  <g className="animate-pulse" style={{ transformOrigin: '7px 1px' }}>
                    <circle cx="8" cy="1" r="4.5" fill="#38bdf8" fillOpacity="0.65" stroke="#0284c7" strokeWidth="0.8" filter="url(#bubbleGlow)" />
                    <circle cx="6.8" cy="-0.6" r="1.2" fill="#ffffff" fillOpacity="0.8" />
                  </g>
                </g>

                {/* "Zzz" drifting above head */}
                <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                  <text x="-4" y="-12" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="sans-serif">z</text>
                  <text x="3" y="-19" fill="#0284c7" fontSize="12" fontWeight="extrabold" fontFamily="sans-serif">Z</text>
                  <text x="13" y="-27" fill="#1d4ed8" fontSize="15" fontWeight="900" fontFamily="sans-serif">Z</text>
                </g>
              </g>
            ) : (
              // AWAKE / THINKING STATE: Leaning forward intently towards table
              <g transform="translate(38, 58)">
                {/* Legs seated */}
                <path d="M 6 38 L 18 39 L 20 74" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Torso leaning forward toward table */}
                <path d="M 6 38 L 22 14" stroke={enemyFleetColor} strokeWidth="12" strokeLinecap="round" />
                {/* Sailor Striped Collar */}
                <path d="M 18 13 L 25 15" stroke="#ffffff" strokeWidth="3" />
                {/* Arm reaching forward towards desk / chin */}
                <path d="M 16 18 L 32 25 L 39 23" fill="none" stroke={enemyFleetColor} strokeWidth="4" strokeLinecap="round" />
                {/* Hand on edge of table */}
                <circle cx="40" cy="23" r="2.5" fill="#fed7aa" />

                {/* Head leaning forward */}
                <g transform="translate(26, 4) rotate(14)">
                  {/* Head */}
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  {/* Sailor Cap */}
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  {/* Open watchful eye looking at board */}
                  <circle cx="4" cy="0" r="1.5" fill="#0f172a" />
                  {/* Eyebrow focused */}
                  <line x1="2" y1="-3" x2="6" y2="-2" stroke="#7c2d12" strokeWidth="1" strokeLinecap="round" />
                </g>
              </g>
            )}
          </g>

          {/* ==================== RIGHT SAILOR: ME ==================== */}
          <g className="transition-all duration-700 ease-in-out">
            {meIsSleeping ? (
              // SLEEPING STATE: Leaning back on chair backrest, head tilted back, bubble + Zzz
              <g transform="translate(182, 60)">
                {/* Legs seated */}
                <path d="M -12 36 L -25 38 L -24 72" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Torso leaning back against chair */}
                <path d="M -10 36 L -2 12" stroke={myFleetColor} strokeWidth="12" strokeLinecap="round" />
                {/* Sailor Striped Collar */}
                <path d="M 0 10 L -6 12" stroke="#ffffff" strokeWidth="3" />
                {/* Arm resting relaxed on lap/chair */}
                <path d="M -4 16 L -8 32 L -20 34" fill="none" stroke={myFleetColor} strokeWidth="4" strokeLinecap="round" />
                {/* Hand */}
                <circle cx="-21" cy="34" r="2.5" fill="#fed7aa" />

                {/* Head tilted backwards */}
                <g transform="translate(1, 0) rotate(22)">
                  {/* Head */}
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  {/* Sailor Cap */}
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  {/* Sleeping closed eye */}
                  <line x1="-2" y1="-1" x2="-6" y2="0" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Relaxed mouth */}
                  <ellipse cx="-5" cy="4" rx="2" ry="1.5" fill="#be123c" />

                  {/* Snot Bubble growing from nose */}
                  <g className="animate-pulse" style={{ transformOrigin: '-7px 1px' }}>
                    <circle cx="-8" cy="1" r="4.5" fill="#38bdf8" fillOpacity="0.65" stroke="#0284c7" strokeWidth="0.8" filter="url(#bubbleGlow)" />
                    <circle cx="-6.8" cy="-0.6" r="1.2" fill="#ffffff" fillOpacity="0.8" />
                  </g>
                </g>

                {/* "Zzz" drifting above head */}
                <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                  <text x="4" y="-12" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="sans-serif">z</text>
                  <text x="-4" y="-19" fill="#0284c7" fontSize="12" fontWeight="extrabold" fontFamily="sans-serif">Z</text>
                  <text x="-16" y="-27" fill="#1d4ed8" fontSize="15" fontWeight="900" fontFamily="sans-serif">Z</text>
                </g>
              </g>
            ) : (
              // AWAKE / THINKING STATE: Leaning forward intently towards table
              <g transform="translate(176, 58)">
                {/* Legs seated */}
                <path d="M -6 38 L -18 39 L -20 74" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Torso leaning forward toward table */}
                <path d="M -6 38 L -22 14" stroke={myFleetColor} strokeWidth="12" strokeLinecap="round" />
                {/* Sailor Striped Collar */}
                <path d="M -18 13 L -25 15" stroke="#ffffff" strokeWidth="3" />
                {/* Arm reaching forward towards desk */}
                <path d="M -16 18 L -32 25 L -39 23" fill="none" stroke={myFleetColor} strokeWidth="4" strokeLinecap="round" />
                {/* Hand on edge of table */}
                <circle cx="-40" cy="23" r="2.5" fill="#fed7aa" />

                {/* Head leaning forward */}
                <g transform="translate(-26, 4) rotate(-14)">
                  {/* Head */}
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  {/* Sailor Cap */}
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  {/* Open watchful eye looking at board */}
                  <circle cx="-4" cy="0" r="1.5" fill="#0f172a" />
                  {/* Eyebrow focused */}
                  <line x1="-2" y1="-3" x2="-6" y2="-2" stroke="#7c2d12" strokeWidth="1" strokeLinecap="round" />
                </g>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Helper caption */}
      <div className="w-full text-center mt-1">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          {enemyIsSleeping
            ? 'Przeciwnik zasnął czekając na Twój ruch! 💤'
            : meIsSleeping
            ? 'Czekasz ponad 30s... Twój marynarz przysypia! 💤'
            : isMyTurn
            ? 'Twój ruch — marynarze skupieni nad planszą'
            : 'Ruch przeciwnika — chwila skupienia'}
        </span>
      </div>
    </div>
  );
}
