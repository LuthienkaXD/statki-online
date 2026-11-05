import React, { useState, useEffect } from 'react';

/**
 * SailorsMatchAnimation
 * 
 * - Siedzi dwóch marynarzy na krzesłach naprzeciwko siebie przy małym stoliku:
 *   - Lewy marynarz: przeciwnik (kolor ubrania dopasowany do enemyFleetColor).
 *   - Prawy marynarz: mój gracz (kolor ubrania dopasowany do myFleetColor).
 *   - Pomiędzy nimi mały stolik z planszą do gry w statki oraz pionową zasłonką.
 * - Standardowo podczas gry marynarze siedzą pochyleni w stronę planszy.
 * - Jeśli ruch trwa > 30 sekund:
 *   - Ten marynarz, który czeka, opiera się o oparcie krzesła i zasypia (bąbelek z nosa + Zzz).
 * - Jeśli ruch trwa > 90 sekund:
 *   - Śpiący marynarz budzi się (zniecierpliwiony!).
 *   - Co około 20 sekund (90s, 110s, 130s...) rzuca zmiętą kulką papieru w drugiego marynarza.
 *   - Kulka leci łukiem (animacja lotu), uderza w marynarza i spada na podłogę.
 *   - Kulki NIE ZNIKAJĄ, lecz gromadzą się na podłodze, pokazując na koniec jak długo gracz czekał!
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
  // Zbierające się kulki na podłodze podczas meczu
  const [paperBalls, setPaperBalls] = useState([]);
  // Aktywna lecąca kulka w powietrzu
  const [flyingBall, setFlyingBall] = useState(null);

  // Reset timer on turn change or status change
  useEffect(() => {
    setTurnElapsedSec(0);
    setFlyingBall(null);
  }, [turn, turnsCount, status]);

  // Licznik sekund tury
  useEffect(() => {
    if (status !== 'playing') return;

    const timer = setInterval(() => {
      setTurnElapsedSec(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [turn, status, turnsCount]);

  // Which sailor is currently waiting?
  const isMyTurn = turn === meKey;
  const isEnemyWaiting = isMyTurn;
  const isMeWaiting = !isMyTurn;

  // Stany czasowe:
  // 30s - 89s: zasypia
  // >= 90s: budzi się i rzuca kulkami papieru co 20s
  const isSleepPhase = turnElapsedSec >= 30 && turnElapsedSec < 90;
  const isThrowPhase = turnElapsedSec >= 90;

  const enemyIsSleeping = status === 'playing' && isEnemyWaiting && isSleepPhase;
  const meIsSleeping = status === 'playing' && isMeWaiting && isSleepPhase;

  const enemyIsThrowing = status === 'playing' && isEnemyWaiting && isThrowPhase;
  const meIsThrowing = status === 'playing' && isMeWaiting && isThrowPhase;

  // Rzucenie nowej kulki papieru co 20s (przy 90s, 110s, 130s...)
  useEffect(() => {
    if (status !== 'playing') return;

    if (turnElapsedSec >= 90 && (turnElapsedSec - 90) % 20 === 0) {
      const thrower = isEnemyWaiting ? 'enemy' : 'me';
      const baseFloorX = thrower === 'enemy' ? 150 : 65;
      const randomOffsetX = (Math.random() - 0.5) * 35;
      const finalX = Math.max(30, Math.min(185, baseFloorX + randomOffsetX));
      const finalY = 139 + Math.random() * 3;
      const rotation = Math.floor(Math.random() * 360);
      const scale = 0.85 + Math.random() * 0.3;

      const ballId = `ball-${Date.now()}-${Math.random()}`;

      // 1. Uruchom animację lecącej kulki
      setFlyingBall({
        id: ballId,
        from: thrower,
        targetX: finalX,
        targetY: finalY,
        rotation,
        scale
      });

      // 2. Po zakończeniu animacji lotu (850ms), umieść kulkę na stałe na podłodze
      const landTimer = setTimeout(() => {
        setPaperBalls(prev => [
          ...prev,
          {
            id: ballId,
            from: thrower,
            finalX,
            finalY,
            rotation,
            scale
          }
        ]);
        setFlyingBall(null);
      }, 850);

      return () => clearTimeout(landTimer);
    }
  }, [turnElapsedSec, isEnemyWaiting, status]);

  return (
    <div className="w-full xl:w-64 shrink-0 flex flex-col items-center bg-transparent border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs select-none">
      <div className="w-full flex items-center justify-between mb-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <span className="text-[11px] font-chakra font-bold text-slate-500 uppercase tracking-wider">
          Pojedynek Kapitanów
        </span>
        <div className="flex items-center space-x-1.5">
          {paperBalls.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-200/70 dark:border-amber-800/50" title="Rzucone zmięte kulki papieru z nudów">
              🏐 {paperBalls.length}
            </span>
          )}
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
            isThrowPhase
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse'
              : isSleepPhase
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 animate-pulse'
                : 'bg-slate-100/80 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400'
          }`}>
            {turnElapsedSec}s {isThrowPhase ? '😤' : isSleepPhase ? '💤' : '⏳'}
          </span>
        </div>
      </div>

      {/* SVG Canvas with Sailors, Table & Paper Balls */}
      <div className="w-full h-52 sm:h-56 flex items-center justify-center relative overflow-visible">
        <svg
          viewBox="0 0 220 160"
          className="w-full h-full max-h-56 drop-shadow-sm overflow-visible"
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

            {/* Animacja rzutu kulką papieru po łuku (parabola) */}
            <style>{`
              @keyframes arcThrowFromLeft {
                0% {
                  transform: translate(50px, 62px) scale(0.65) rotate(0deg);
                  opacity: 1;
                }
                50% {
                  transform: translate(110px, 25px) scale(1.05) rotate(180deg);
                }
                78% {
                  transform: translate(170px, 60px) scale(0.95) rotate(270deg);
                }
                88% {
                  transform: translate(163px, 105px) scale(0.9) rotate(320deg);
                }
                100% {
                  transform: translate(var(--target-x), var(--target-y)) scale(0.85) rotate(360deg);
                  opacity: 1;
                }
              }
              @keyframes arcThrowFromRight {
                0% {
                  transform: translate(170px, 62px) scale(0.65) rotate(0deg);
                  opacity: 1;
                }
                50% {
                  transform: translate(110px, 25px) scale(1.05) rotate(-180deg);
                }
                78% {
                  transform: translate(50px, 60px) scale(0.95) rotate(-270deg);
                }
                88% {
                  transform: translate(57px, 105px) scale(0.9) rotate(-320deg);
                }
                100% {
                  transform: translate(var(--target-x), var(--target-y)) scale(0.85) rotate(-360deg);
                  opacity: 1;
                }
              }
              .flying-paper-left {
                animation: arcThrowFromLeft 0.85s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
              }
              .flying-paper-right {
                animation: arcThrowFromRight 0.85s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
              }
            `}</style>
          </defs>

          {/* Floor / Horizon Line */}
          <line x1="10" y1="140" x2="210" y2="140" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" opacity="0.4" />

          {/* ==================== LEFT CHAIR (Enemy) ==================== */}
          <g transform="translate(25, 60)">
            <rect x="0" y="0" width="5" height="50" rx="2" fill="#78350f" />
            <rect x="0" y="38" width="28" height="5" rx="1.5" fill="#92400e" />
            <line x1="3" y1="43" x2="2" y2="80" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
            <line x1="24" y1="43" x2="25" y2="80" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* ==================== RIGHT CHAIR (Me) ==================== */}
          <g transform="translate(165, 60)">
            <rect x="25" y="0" width="5" height="50" rx="2" fill="#78350f" />
            <rect x="2" y="38" width="28" height="5" rx="1.5" fill="#92400e" />
            <line x1="27" y1="43" x2="28" y2="80" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
            <line x1="6" y1="43" x2="5" y2="80" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* ==================== TABLE IN THE MIDDLE ==================== */}
          <g transform="translate(80, 88)">
            <rect x="0" y="0" width="60" height="7" rx="3" fill="url(#tableLight)" stroke="#78350f" strokeWidth="1" />
            <line x1="12" y1="7" x2="8" y2="52" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="48" y1="7" x2="52" y2="52" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="10" y1="35" x2="50" y2="35" stroke="#92400e" strokeWidth="2" />

            <rect x="8" y="-9" width="44" height="9" rx="1.5" fill="url(#gridBoard)" stroke="#475569" strokeWidth="0.8" />
            <line x1="9" y1="-4.5" x2="51" y2="-4.5" stroke="#64748b" strokeWidth="0.6" strokeDasharray="1 1" />
            
            {/* Zasłonka pionowa */}
            <g transform="translate(30, -32)">
              <rect x="-3.5" y="30" width="7" height="2.5" rx="1" fill="#334155" />
              <rect x="-2" y="2" width="4" height="30" rx="1.5" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
              <rect x="-1.5" y="4" width="3" height="26" fill="#0284c7" />
              <line x1="-1.5" y1="9" x2="1.5" y2="9" stroke="#ffffff" strokeWidth="1" />
              <line x1="-1.5" y1="15" x2="1.5" y2="15" stroke="#ffffff" strokeWidth="1" />
              <line x1="-1.5" y1="21" x2="1.5" y2="21" stroke="#ffffff" strokeWidth="1" />
              <circle cx="0" cy="2" r="1.5" fill="#f59e0b" />
            </g>
            
            <rect x="11" y="-7.5" width="7" height="2.2" rx="0.5" fill={enemyFleetColor} />
            <rect x="21" y="-6" width="5" height="2" rx="0.5" fill={enemyFleetColor} />
            <rect x="34" y="-7.5" width="7" height="2.2" rx="0.5" fill={myFleetColor} />
            <rect x="44" y="-6" width="4" height="2" rx="0.5" fill={myFleetColor} />
          </g>

          {/* ==================== LEFT SAILOR: ENEMY ==================== */}
          <g className="transition-all duration-700 ease-in-out">
            {enemyIsSleeping ? (
              // SLEEPING STATE (30s - 89s)
              <g transform="translate(32, 60)">
                <path d="M 12 36 L 25 38 L 24 72" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 10 36 L 2 12" stroke={enemyFleetColor} strokeWidth="12" strokeLinecap="round" />
                <path d="M 0 10 L 6 12" stroke="#ffffff" strokeWidth="3" />
                <path d="M 4 16 L 8 32 L 20 34" fill="none" stroke={enemyFleetColor} strokeWidth="4" strokeLinecap="round" />
                <circle cx="21" cy="34" r="2.5" fill="#fbcfe8" />

                <g transform="translate(-1, 0) rotate(-22)">
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  <line x1="2" y1="-1" x2="6" y2="0" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
                  <ellipse cx="5" cy="4" rx="2" ry="1.5" fill="#be123c" />

                  <g className="animate-pulse" style={{ transformOrigin: '7px 1px' }}>
                    <circle cx="8" cy="1" r="4.5" fill="#38bdf8" fillOpacity="0.65" stroke="#0284c7" strokeWidth="0.8" filter="url(#bubbleGlow)" />
                    <circle cx="6.8" cy="-0.6" r="1.2" fill="#ffffff" fillOpacity="0.8" />
                  </g>
                </g>

                <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                  <text x="-4" y="-12" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="sans-serif">z</text>
                  <text x="3" y="-19" fill="#0284c7" fontSize="12" fontWeight="extrabold" fontFamily="sans-serif">Z</text>
                  <text x="13" y="-27" fill="#1d4ed8" fontSize="15" fontWeight="900" fontFamily="sans-serif">Z</text>
                </g>
              </g>
            ) : enemyIsThrowing ? (
              // AWAKE & THROWING / ANNOYED STATE (>= 90s)
              <g transform="translate(36, 58)">
                <path d="M 8 38 L 20 39 L 22 74" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 8 38 L 18 12" stroke={enemyFleetColor} strokeWidth="12" strokeLinecap="round" />
                <path d="M 14 11 L 22 13" stroke="#ffffff" strokeWidth="3" />
                
                {/* Arm raised forward/up, throwing crumpled paper */}
                <path d="M 16 16 L 28 8 L 40 14" fill="none" stroke={enemyFleetColor} strokeWidth="4" strokeLinecap="round" />
                <circle cx="41" cy="14" r="2.5" fill="#fed7aa" />
                
                {/* Head tilted forward aggressively */}
                <g transform="translate(20, 2) rotate(10)">
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  <circle cx="4" cy="-1" r="1.2" fill="#0f172a" />
                  <line x1="2" y1="-4" x2="6" y2="-2" stroke="#991b1b" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M 2 4 Q 5 1 7 4" fill="none" stroke="#991b1b" strokeWidth="1" strokeLinecap="round" />
                </g>

                <text x="24" y="-8" fill="#ef4444" fontSize="11" fontWeight="bold">💢</text>
              </g>
            ) : (
              // DEFAULT FOCUSED STATE
              <g transform="translate(38, 58)">
                <path d="M 6 38 L 18 39 L 20 74" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 6 38 L 22 14" stroke={enemyFleetColor} strokeWidth="12" strokeLinecap="round" />
                <path d="M 18 13 L 25 15" stroke="#ffffff" strokeWidth="3" />
                <path d="M 16 18 L 32 25 L 39 23" fill="none" stroke={enemyFleetColor} strokeWidth="4" strokeLinecap="round" />
                <circle cx="40" cy="23" r="2.5" fill="#fed7aa" />

                <g transform="translate(26, 4) rotate(14)">
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  <circle cx="4" cy="0" r="1.5" fill="#0f172a" />
                  <line x1="2" y1="-3" x2="6" y2="-2" stroke="#7c2d12" strokeWidth="1" strokeLinecap="round" />
                </g>
              </g>
            )}
          </g>

          {/* ==================== RIGHT SAILOR: ME ==================== */}
          <g className="transition-all duration-700 ease-in-out">
            {meIsSleeping ? (
              // SLEEPING STATE (30s - 89s)
              <g transform="translate(182, 60)">
                <path d="M -12 36 L -25 38 L -24 72" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M -10 36 L -2 12" stroke={myFleetColor} strokeWidth="12" strokeLinecap="round" />
                <path d="M 0 10 L -6 12" stroke="#ffffff" strokeWidth="3" />
                <path d="M -4 16 L -8 32 L -20 34" fill="none" stroke={myFleetColor} strokeWidth="4" strokeLinecap="round" />
                <circle cx="-21" cy="34" r="2.5" fill="#fed7aa" />

                <g transform="translate(1, 0) rotate(22)">
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  <line x1="-2" y1="-1" x2="-6" y2="0" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
                  <ellipse cx="-5" cy="4" rx="2" ry="1.5" fill="#be123c" />

                  <g className="animate-pulse" style={{ transformOrigin: '-7px 1px' }}>
                    <circle cx="-8" cy="1" r="4.5" fill="#38bdf8" fillOpacity="0.65" stroke="#0284c7" strokeWidth="0.8" filter="url(#bubbleGlow)" />
                    <circle cx="-6.8" cy="-0.6" r="1.2" fill="#ffffff" fillOpacity="0.8" />
                  </g>
                </g>

                <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                  <text x="4" y="-12" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="sans-serif">z</text>
                  <text x="-4" y="-19" fill="#0284c7" fontSize="12" fontWeight="extrabold" fontFamily="sans-serif">Z</text>
                  <text x="-16" y="-27" fill="#1d4ed8" fontSize="15" fontWeight="900" fontFamily="sans-serif">Z</text>
                </g>
              </g>
            ) : meIsThrowing ? (
              // AWAKE & THROWING / ANNOYED STATE (>= 90s)
              <g transform="translate(178, 58)">
                <path d="M -8 38 L -20 39 L -22 74" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M -8 38 L -18 12" stroke={myFleetColor} strokeWidth="12" strokeLinecap="round" />
                <path d="M -14 11 L -22 13" stroke="#ffffff" strokeWidth="3" />
                
                {/* Arm raised forward/up, throwing crumpled paper */}
                <path d="M -16 16 L -28 8 L -40 14" fill="none" stroke={myFleetColor} strokeWidth="4" strokeLinecap="round" />
                <circle cx="-41" cy="14" r="2.5" fill="#fed7aa" />
                
                {/* Head tilted forward aggressively */}
                <g transform="translate(-20, 2) rotate(-10)">
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  <circle cx="-4" cy="-1" r="1.2" fill="#0f172a" />
                  <line x1="-2" y1="-4" x2="-6" y2="-2" stroke="#991b1b" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M -2 4 Q -5 1 -7 4" fill="none" stroke="#991b1b" strokeWidth="1" strokeLinecap="round" />
                </g>

                <text x="-32" y="-8" fill="#ef4444" fontSize="11" fontWeight="bold">💢</text>
              </g>
            ) : (
              // DEFAULT FOCUSED STATE
              <g transform="translate(176, 58)">
                <path d="M -6 38 L -18 39 L -20 74" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M -6 38 L -22 14" stroke={myFleetColor} strokeWidth="12" strokeLinecap="round" />
                <path d="M -18 13 L -25 15" stroke="#ffffff" strokeWidth="3" />
                <path d="M -16 18 L -32 25 L -39 23" fill="none" stroke={myFleetColor} strokeWidth="4" strokeLinecap="round" />
                <circle cx="-40" cy="23" r="2.5" fill="#fed7aa" />

                <g transform="translate(-26, 4) rotate(-14)">
                  <circle cx="0" cy="0" r="8" fill="#fed7aa" stroke="#f97316" strokeWidth="0.8" />
                  <ellipse cx="0" cy="-6" rx="9" ry="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="1" />
                  <circle cx="0" cy="-10" r="2" fill="#ef4444" />
                  <circle cx="-4" cy="0" r="1.5" fill="#0f172a" />
                  <line x1="-2" y1="-3" x2="-6" y2="-2" stroke="#7c2d12" strokeWidth="1" strokeLinecap="round" />
                </g>
              </g>
            )}
          </g>

          {/* ==================== ACTIVE FLYING PAPER BALL (IN FLIGHT) ==================== */}
          {flyingBall && (
            <g
              style={{
                '--target-x': `${flyingBall.targetX}px`,
                '--target-y': `${flyingBall.targetY}px`
              }}
              className={flyingBall.from === 'enemy' ? 'flying-paper-left' : 'flying-paper-right'}
            >
              <polygon
                points="-3.5,-2 0,-4.5 3.5,-3 4.5,0.5 2.5,3.8 -2,4 -4,1.5"
                fill="#ffffff"
                stroke="#64748b"
                strokeWidth="0.8"
              />
              <line x1="-2" y1="-2" x2="1" y2="1" stroke="#cbd5e1" strokeWidth="0.6" />
              <line x1="1" y1="1" x2="3" y2="-1" stroke="#94a3b8" strokeWidth="0.6" />
            </g>
          )}

          {/* ==================== CRUMPLED PAPER BALLS ON FLOOR ==================== */}
          {/* Zbierające się zmięte kulki papieru (nie znikają!) */}
          {paperBalls.map((ball) => (
            <g
              key={ball.id}
              transform={`translate(${ball.finalX}, ${ball.finalY}) rotate(${ball.rotation}) scale(${ball.scale})`}
              className="drop-shadow-xs transition-opacity duration-500"
            >
              {/* Zmięty wielokąt papieru */}
              <polygon
                points="-3.5,-2 0,-4.5 3.5,-3 4.5,0.5 2.5,3.8 -2,4 -4,1.5"
                fill="#f8fafc"
                stroke="#94a3b8"
                strokeWidth="0.6"
              />
              {/* Zagięcia papieru */}
              <line x1="-2" y1="-2" x2="1" y2="1" stroke="#cbd5e1" strokeWidth="0.5" />
              <line x1="1" y1="1" x2="3" y2="-1" stroke="#94a3b8" strokeWidth="0.5" />
              <line x1="-1" y1="2" x2="2" y2="3" stroke="#cbd5e1" strokeWidth="0.5" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
