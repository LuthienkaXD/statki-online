import React, { useState, useEffect, useRef } from 'react';
import { getLetters, getNumbers, getFleetStyle, getRequiredFleet } from '../utils/rules';
import {
  Crosshair,
  Shield,
  Flame,
  Send,
  RotateCcw,
  Trophy,
  Skull,
  Check,
  Copy,
  Bomb,
  Plane,
  Radio,
  Zap,
  HelpCircle,
  Eye,
  CheckSquare,
  Square,
  Target
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import SurrenderAnimation from './SurrenderAnimation';

export default function GameView({
  gameState,
  onFireShot,
  onSendChat,
  onRematch,
  onLeaveRoom,
  onUseRecon,
  onUseSonar,
  onActivateSalvo,
  boardZoom = 100
}) {
  const [chatInput, setChatInput] = useState('');
  const [chatPresets, setChatPresets] = useState([]);
  const [freeTextAllowed, setFreeTextAllowed] = useState(true);
  const [reconActive, setReconActive] = useState(false);
  const [sonarMode, setSonarMode] = useState(null); // null | 'row' | 'col'
  const [copied, setCopied] = useState(false);
  const [showRemainingShips, setShowRemainingShips] = useState(true);
  const [showSurrenderAnim, setShowSurrenderAnim] = useState(true);
  const chatBottomRef = useRef(null);

  const { me, enemy, turn, status, winner, isBotGame, roomId, chat, boardSize = 10, options = {} } = gameState;
  const isMyTurn = status === 'playing' && turn === me?.key;
  const isGameOver = status === 'finished';
  const isWinner = winner === me?.key;
  const loserName = winner === me?.key ? (enemy?.name || 'Przeciwnik') : (me?.name || 'Kapitan');

  const letters = getLetters(boardSize);
  const numbers = getNumbers(boardSize);

  const myFleetStyle = getFleetStyle(me?.color);
  const enemyFleetStyle = getFleetStyle(enemy?.color || '#334155');

  // Compute enemy fleet individual ships (each ship has its own icon!)
  const enemyRequiredFleet = getRequiredFleet(boardSize);
  const sunkShips = enemy?.sunkShips || [];
  
  // Flatten into individual ships list: each instance of a ship (e.g. 4 individual single-deckers)
  const enemyIndividualShips = [];
  enemyRequiredFleet.forEach(def => {
    // Count how many of this definition are sunk
    const sunkOfThisType = sunkShips.filter(s => s.size === def.size && (s.shape || 'line') === (def.shape || 'line')).length;
    for (let i = 0; i < def.count; i++) {
      const isSunk = i < sunkOfThisType;
      enemyIndividualShips.push({
        uniqueId: `${def.id}_${i}`,
        name: def.name,
        size: def.size,
        shape: def.shape || 'line',
        isSunk
      });
    }
  });

  // Only keep surviving ships so sunk ships completely vanish!
  const enemySurvivingShips = enemyIndividualShips.filter(s => !s.isSunk);

  // Compute my fleet individual ships
  const mySunkShips = (me?.ships || []).filter(s => s.sunk);
  const myIndividualShips = [];
  enemyRequiredFleet.forEach(def => {
    const sunkOfThisType = mySunkShips.filter(s => s.size === def.size && (s.shape || 'line') === (def.shape || 'line')).length;
    for (let i = 0; i < def.count; i++) {
      const isSunk = i < sunkOfThisType;
      myIndividualShips.push({
        uniqueId: `my_${def.id}_${i}`,
        name: def.name,
        size: def.size,
        shape: def.shape || 'line',
        isSunk
      });
    }
  });

  const mySurvivingShips = myIndividualShips.filter(s => !s.isSunk);

  // Total ship cells to hit for full victory
  const totalShipCellsRequired = enemyRequiredFleet.reduce((sum, s) => sum + (s.size * s.count), 0);
  const myHitsAgainstEnemy = me?.stats?.hits || 0;
  const enemyRemainingCellsToHit = Math.max(0, totalShipCellsRequired - myHitsAgainstEnemy);

  const enemyHitsAgainstMe = enemy?.stats?.hits || 0;
  const myRemainingCellsToHit = Math.max(0, totalShipCellsRequired - enemyHitsAgainstMe);

  // Load chat dictionary presets
  useEffect(() => {
    fetch('/api/chat/presets')
      .then(res => res.json())
      .then(data => {
        if (data && data.presets) {
          setChatPresets(data.presets);
          setFreeTextAllowed(data.freeTextAllowed !== false);
        }
      })
      .catch(() => {
        setChatPresets(['Cześć!', 'Dobre trafienie!', 'Gramy rewanż?', 'Pudło! 😜']);
      });
  }, []);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // Victory celebration with confetti
  useEffect(() => {
    if (isGameOver) {
      if (isWinner) {
        sounds.playVictory();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        sounds.playDefeat();
      }
    }
  }, [isGameOver, isWinner]);

  const handleShoot = (r, c) => {
    if (!isMyTurn || isGameOver) return;

    if (reconActive) {
      setReconActive(false);
      sounds.playClick();
      if (onUseRecon) onUseRecon(r, c);
      return;
    }

    if (sonarMode) {
      const idx = sonarMode === 'row' ? r : c;
      const type = sonarMode;
      setSonarMode(null);
      sounds.playClick();
      if (onUseSonar) onUseSonar(type, idx);
      return;
    }

    if (enemy?.shotsGrid[r][c] !== null && enemy?.shotsGrid[r][c] !== undefined) return;

    sounds.playShoot();
    onFireShot(r, c);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2500);
  };

  // Render cell on Player's Own Board
  const renderMyCell = (r, c) => {
    const shot = me?.shotsGrid[r][c];
    const myShip = me?.ships?.find(s => s.cells.some(cell => cell.r === r && cell.c === c));
    const isMine = me?.mines?.some(m => m.r === r && m.c === c);

    let bgStyle = 'bg-slate-50 border-slate-300';
    let inlineStyle = {};

    if (myShip) {
      inlineStyle = myFleetStyle.style;
    }

    const cellPixelSize = Math.round(26 * (boardZoom / 100));

    return (
      <div
        key={`${r}-${c}`}
        style={{
          ...inlineStyle,
          width: `${cellPixelSize}px`,
          height: `${cellPixelSize}px`
        }}
        className={`rounded border flex items-center justify-center relative ${bgStyle}`}
      >
        {shot === 'hit' ? (
          <Flame className="w-4 h-4 text-rose-300 animate-pulse fill-rose-500" />
        ) : shot === 'mine' ? (
          <Bomb className="w-4 h-4 text-amber-400 fill-amber-500 animate-bounce" />
        ) : shot === 'miss' ? (
          <span className="text-red-600 font-extrabold text-xs select-none">✕</span>
        ) : isMine ? (
          <Bomb className="w-3.5 h-3.5 text-rose-600" title="Twoja mina morska" />
        ) : myShip ? (
          <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>
        ) : null}
      </div>
    );
  };

  // Render cell on Enemy Board
  const renderEnemyCell = (r, c) => {
    const shot = enemy?.shotsGrid[r][c];
    const isSunkCell = enemy?.sunkShips?.some(s => s.cells.some(cell => cell.r === r && cell.c === c));
    const isUnhitShipOnGameOver = isGameOver && enemy?.allShips?.some(s => !s.sunk && s.cells.some(cell => cell.r === r && cell.c === c && !cell.hit));
    const isEnemyMineOnGameOver = isGameOver && enemy?.allMines?.some(m => m.r === r && m.c === c);

    let cellClass = 'bg-slate-50 border-slate-300 hover:bg-slate-200/80';
    let inlineStyle = {};

    if (shot === 'hit') {
      cellClass = isSunkCell
        ? 'border-rose-700 shadow-sm'
        : 'border-orange-500 shadow-2xs';
      inlineStyle = enemyFleetStyle.style;
    } else if (shot === 'mine') {
      cellClass = 'bg-amber-100 border-amber-500';
    } else if (isUnhitShipOnGameOver) {
      inlineStyle = {
        ...enemyFleetStyle.style,
        opacity: 0.55
      };
    }

    const cellPixelSize = Math.round(26 * (boardZoom / 100));

    return (
      <button
        key={`${r}-${c}`}
        onClick={() => handleShoot(r, c)}
        disabled={!isMyTurn || isGameOver || (!reconActive && !sonarMode && shot !== null && shot !== undefined)}
        style={{
          ...inlineStyle,
          width: `${cellPixelSize}px`,
          height: `${cellPixelSize}px`
        }}
        className={`rounded border flex items-center justify-center transition-all ${
          isMyTurn && !isGameOver && (reconActive || sonarMode || (shot === null || shot === undefined))
            ? 'cursor-pointer hover:border-blue-500 hover:scale-105 hover:ring-2 hover:ring-blue-400'
            : ''
        } ${cellClass}`}
      >
        {shot === 'hit' ? (
          <Flame className="w-3.5 h-3.5 text-rose-200 fill-rose-500 animate-pulse" />
        ) : shot === 'mine' ? (
          <Bomb className="w-3.5 h-3.5 text-amber-700 animate-bounce" />
        ) : shot === 'miss' ? (
          <span className="text-red-600 font-extrabold text-xs select-none">✕</span>
        ) : isEnemyMineOnGameOver ? (
          <Bomb className="w-3 h-3 text-rose-500 opacity-60" />
        ) : null}
      </button>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col items-center">
      
      {/* Top Banner: Status & Tactical Actions */}
      <div className={`w-full max-w-5xl mb-3 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl shadow-sm border transition-all ${
        isGameOver
          ? isWinner
            ? 'bg-gradient-to-r from-amber-50 to-emerald-50 border-amber-300'
            : 'bg-gradient-to-r from-rose-50 to-slate-50 border-rose-300'
          : 'bg-white border-slate-200'
      }`}>
        
        <div className="flex items-center space-x-3 text-left">
          {isGameOver ? (
            isWinner ? (
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 shrink-0">
                <Skull className="w-6 h-6" />
              </div>
            )
          ) : (
            <div className={`w-3.5 h-3.5 rounded-full ${isMyTurn ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
          )}

          <div>
            <div className="font-chakra font-bold text-base sm:text-lg">
              {isGameOver ? (
                <span className={isWinner ? 'text-amber-800' : 'text-rose-800'}>
                  {isWinner ? '🏆 ZWYCIĘSTWO! Wroga flota została zatopiona!' : '💀 PORAŻKA! Twoja flota została zniszczona.'}
                </span>
              ) : isMyTurn ? (
                <span className="text-emerald-600 flex items-center space-x-1.5">
                  <Crosshair className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>
                    {me?.salvoRemainingShots > 0
                      ? `⚡ SALWA FLAGOWA AKTYWNA! (Pozostało strzałów: ${me.salvoRemainingShots})`
                      : 'TWÓJ RUCH! Wybierz pole na planszy wroga'}
                  </span>
                </span>
              ) : (
                <span className="text-slate-600">
                  Ruch przeciwnika ({enemy?.name || 'Przeciwnik'})...
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              Plansza {boardSize}×{boardSize}
              {reconActive && ' • 🛩️ Wybierz centralną kratkę do zwiadu radarem'}
              {sonarMode && ` • 📡 Kliknij na pole, by zbadać jego ${sonarMode === 'row' ? 'wiersz' : 'kolumnę'} sonarem`}
            </p>
          </div>
        </div>

        {/* Tactical Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          
          {/* Recon Plane */}
          {isMyTurn && options.reconPlane && !me?.reconUsed && !isGameOver && (
            <button
              onClick={() => { sounds.playClick(); setReconActive(!reconActive); setSonarMode(null); }}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                reconActive
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 animate-pulse'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
              title="Zwiad radarowy kwadratu 3x3"
            >
              <Plane className="w-3.5 h-3.5" />
              <span>{reconActive ? 'Celuj 3×3' : 'Radar 3×3'}</span>
            </button>
          )}

          {/* Sonar Impulse */}
          {isMyTurn && options.sonar && !me?.sonarUsed && !isGameOver && (
            <div className="relative inline-flex">
              <button
                onClick={() => {
                  sounds.playClick();
                  setSonarMode(sonarMode ? null : 'row');
                  setReconActive(false);
                }}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                  sonarMode
                    ? 'bg-teal-600 text-white ring-2 ring-teal-400 animate-pulse'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                }`}
                title="Wykrywa obecność statku w wybranym wierszu lub kolumnie"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{sonarMode ? (sonarMode === 'row' ? 'Sonar: Wiersz' : 'Sonar: Kolumna') : 'Sonar'}</span>
              </button>
            </div>
          )}

          {/* Flagship Salvo Double Shot */}
          {isMyTurn && options.flagshipSalvo && !me?.salvoUsed && !isGameOver && (
            <button
              disabled={me?.flagshipDamaged}
              onClick={() => {
                sounds.playClick();
                if (onActivateSalvo) onActivateSalvo();
              }}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                me?.flagshipDamaged
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 cursor-pointer animate-pulse'
              }`}
              title={me?.flagshipDamaged ? 'Okręt Flagowy został uszkodzony - salwa niedostępna' : 'Oddaj 2 strzały w jednej turze!'}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{me?.flagshipDamaged ? 'Flagowiec Trafiony' : 'Podwójna Salwa (2×)'}</span>
            </button>
          )}

          {isGameOver ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { sounds.playClick(); onRematch(); }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold font-chakra text-xs shadow-xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rewanż</span>
              </button>
              <button
                onClick={() => { sounds.playClick(); onLeaveRoom(); }}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300 cursor-pointer"
              >
                Menu
              </button>
            </div>
          ) : (
            !isBotGame && (
              <button
                onClick={copyRoomLink}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Skopiowano!' : 'Kopiuj link'}</span>
              </button>
            )
          )}
        </div>

      </div>

      {/* Main Game Arena */}
      <div className="w-full flex flex-col xl:flex-row gap-5 items-start justify-center relative">
        
        {/* Smutny Kapitan Pixel Art z Białą Flagą (widoczny dla obu graczy po zakończeniu bitwy na wysokości 5, 6 wiersza plansz) */}
        {isGameOver && showSurrenderAnim && (
          <SurrenderAnimation
            loserName={loserName}
            isWinner={isWinner}
            boardZoom={boardZoom}
            onClose={() => setShowSurrenderAnim(false)}
          />
        )}
        
        {/* Left: Your Fleet */}
        <div className="w-full xl:w-auto flex-1 flex flex-col items-center bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="w-full flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-chakra font-bold text-xs sm:text-sm text-slate-900">Twoja Flota</span>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full border border-slate-300"
                style={{ backgroundColor: myFleetStyle.hex }}
              />
              <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Trafienia wroga: {me?.stats?.hits || 0}
              </span>
            </div>
          </div>

          <div
            className="inline-block p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl max-w-full overflow-x-auto"
          >
            <div
              className="grid gap-0.5 items-center"
              style={{
                gridTemplateColumns: `24px repeat(${boardSize}, ${Math.round(26 * (boardZoom / 100))}px)`
              }}
            >
              <div className="w-6 h-6"></div>
              {letters.map(l => (
                <div key={l} style={{ width: `${Math.round(26 * (boardZoom / 100))}px` }} className="h-6 flex items-center justify-center font-mono font-bold text-slate-700 text-xs select-none">
                  {l}
                </div>
              ))}
              {numbers.map((n, r) => (
                <React.Fragment key={n}>
                  <div className="w-6 flex items-center justify-end pr-1 font-mono font-bold text-slate-700 text-xs select-none" style={{ height: `${Math.round(26 * (boardZoom / 100))}px` }}>
                    {n}
                  </div>
                  {letters.map((_, c) => renderMyCell(r, c))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Under Your Board: Your Remaining Ships */}
          <div className="w-full mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold font-chakra uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Twoja ocalała flota:</span>
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-slate-500">
                  Okrętów: <strong>{mySurvivingShips.length}</strong>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1" title="Liczba pól Twojej floty, które wróg musi jeszcze trafić">
                  <Target className="w-3 h-3 text-blue-600" />
                  <span>Pozostało pól: {myRemainingCellsToHit}</span>
                </span>
              </div>
            </div>

            {mySurvivingShips.length === 0 ? (
              <div className="text-center py-2 text-xs text-rose-600 font-semibold bg-rose-50 rounded-xl">
                Wszystkie Twoje statki zostały zatopione!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 w-full">
                {mySurvivingShips.map(ship => (
                  <div
                    key={ship.uniqueId}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white flex items-center shadow-xs"
                    title={ship.name}
                  >
                    {ship.shape === 'L' ? (
                      <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-blue-50/70 rounded border border-blue-200">
                        <div className="w-3.5 h-3.5 rounded-xs bg-blue-600 border border-blue-700"></div>
                        <div className="w-3.5 h-3.5 rounded-xs bg-blue-600 border border-blue-700"></div>
                        <div className="w-3.5 h-3.5 rounded-xs bg-blue-600 border border-blue-700"></div>
                        <div className="w-3.5 h-3.5 rounded-xs bg-blue-600 border border-blue-700"></div>
                        <div className="w-3.5 h-3.5 opacity-0"></div>
                        <div className="w-3.5 h-3.5 opacity-0"></div>
                      </div>
                    ) : (
                      <div className="flex space-x-0.5">
                        {Array.from({ length: ship.size }).map((_, i) => (
                          <div
                            key={i}
                            className="w-3.5 h-3.5 rounded-xs bg-blue-600 border border-blue-700 shadow-2xs"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Enemy Board */}
        <div className="w-full xl:w-auto flex-1 flex flex-col items-center bg-white border-2 border-slate-300 rounded-2xl p-3.5 shadow-md relative">
          <div className="w-full flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <Crosshair className="w-4 h-4 text-rose-600" />
              <span className="font-chakra font-bold text-xs sm:text-sm text-slate-900">Flota Przeciwnika ({enemy?.name})</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-600 cursor-pointer select-none bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={showRemainingShips}
                  onChange={(e) => setShowRemainingShips(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Pokaż statki</span>
              </label>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                Zatopione: {enemy?.sunkShips?.length || 0}
              </span>
            </div>
          </div>

          <div
            className="inline-block p-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl shadow-inner max-w-full overflow-x-auto"
          >
            <div
              className="grid gap-0.5 items-center"
              style={{
                gridTemplateColumns: `24px repeat(${boardSize}, ${Math.round(26 * (boardZoom / 100))}px)`
              }}
            >
              <div className="w-6 h-6"></div>
              {letters.map(l => (
                <div key={l} style={{ width: `${Math.round(26 * (boardZoom / 100))}px` }} className="h-6 flex items-center justify-center font-mono font-bold text-slate-700 text-xs select-none">
                  {l}
                </div>
              ))}
              {numbers.map((n, r) => (
                <React.Fragment key={n}>
                  <div className="w-6 flex items-center justify-end pr-1 font-mono font-bold text-slate-700 text-xs select-none" style={{ height: `${Math.round(26 * (boardZoom / 100))}px` }}>
                    {n}
                  </div>
                  {letters.map((_, c) => renderEnemyCell(r, c))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Under Enemy Board: Remaining Ships Summary (Controlled by Checkbox) */}
          {showRemainingShips && (
            <div className="w-full mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold font-chakra uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  <span>Statki do zatopienia u wroga:</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    Statków: <strong>{enemySurvivingShips.length}</strong>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1 shadow-2xs" title="Liczba pól floty przeciwnika pozostałych do trafienia">
                    <Target className="w-3 h-3 text-rose-600 animate-pulse" />
                    <span>Pozostało pól: {enemyRemainingCellsToHit}</span>
                  </span>
                </div>
              </div>

              {enemySurvivingShips.length === 0 ? (
                <div className="text-center py-2 text-xs text-emerald-600 font-semibold bg-emerald-50 rounded-xl">
                  Wszystkie statki przeciwnika zostały zatopione!
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 w-full">
                  {enemySurvivingShips.map(ship => (
                    <div
                      key={ship.uniqueId}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white flex items-center shadow-xs hover:border-slate-400 transition-all"
                      title={ship.name}
                    >
                      {ship.shape === 'L' ? (
                        <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-slate-100 rounded border border-slate-300">
                          <div className="w-3.5 h-3.5 rounded-xs bg-slate-700 border border-slate-800"></div>
                          <div className="w-3.5 h-3.5 rounded-xs bg-slate-700 border border-slate-800"></div>
                          <div className="w-3.5 h-3.5 rounded-xs bg-slate-700 border border-slate-800"></div>
                          <div className="w-3.5 h-3.5 rounded-xs bg-slate-700 border border-slate-800"></div>
                          <div className="w-3.5 h-3.5 opacity-0"></div>
                          <div className="w-3.5 h-3.5 opacity-0"></div>
                        </div>
                      ) : (
                        <div className="flex space-x-0.5">
                          {Array.from({ length: ship.size }).map((_, i) => (
                            <div
                              key={i}
                              className="w-3.5 h-3.5 rounded-xs bg-slate-700 border border-slate-800 shadow-2xs"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: In-Game Chat with Dictionary */}
        <div className="w-full xl:w-72 2xl:w-80 shrink-0 flex flex-col h-[480px] bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <h3 className="font-chakra font-bold text-xs text-slate-900 mb-2 flex items-center justify-between">
            <span>Czat Bitewny</span>
            <span className="text-[10px] text-slate-500 font-mono">Tura {gameState.turnsCount || 1}</span>
          </h3>

          <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto">
            {chatPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => { sounds.playClick(); onSendChat(preset); }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 border border-slate-200 transition font-medium cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {chat && chat.length > 0 ? (
              chat.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg ${
                    msg.senderKey === me?.key
                      ? 'bg-blue-50 border border-blue-200 text-blue-900 ml-3'
                      : !msg.senderKey
                      ? 'bg-slate-100 border border-slate-200 text-slate-700 text-center text-[10px]'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 mr-3'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="font-semibold text-blue-800">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-12 text-xs">
                Brak wiadomości. Pozdrów rywala!
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {freeTextAllowed ? (
            <form onSubmit={handleChatSubmit} className="mt-2.5 flex items-center space-x-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Napisz wiadomość..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                maxLength={120}
              />
              <button
                type="submit"
                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-[10px] text-slate-500 font-medium">
              🔒 Czat tekstowy zablokowany przez Admina. Użyj słownika powyżej.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
