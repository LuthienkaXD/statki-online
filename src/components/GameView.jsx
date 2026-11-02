import React, { useState, useEffect, useRef } from 'react';
import { LETTERS, NUMBERS, getFleetStyle } from '../utils/rules';
import { Crosshair, Shield, Flame, Send, RotateCcw, Trophy, Skull, Check, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';

export default function GameView({
  gameState,
  onFireShot,
  onSendChat,
  onRematch,
  onLeaveRoom
}) {
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const chatBottomRef = useRef(null);

  const { me, enemy, turn, status, winner, isBotGame, roomId, chat } = gameState;
  const isMyTurn = status === 'playing' && turn === me?.key;
  const isGameOver = status === 'finished';
  const isWinner = winner === me?.key;

  const myFleetStyle = getFleetStyle(me?.color);
  const enemyFleetStyle = getFleetStyle(enemy?.color || '#334155');

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
    if (enemy?.shotsGrid[r][c] !== null) return;

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
    const link = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2500);
  };

  // Render cell on enemy board
  const renderEnemyCell = (r, c) => {
    const cellState = enemy?.shotsGrid[r][c]; // null, 'miss', 'hit'
    const isClickable = isMyTurn && !isGameOver && cellState === null;

    // Check if cell belongs to a known sunk ship
    const sunkShip = enemy?.sunkShips?.find(ship =>
      ship.cells.some(sc => sc.r === r && sc.c === c)
    );

    // After game ends: check if cell belongs to an unhit surviving ship
    const unhitShip = isGameOver && enemy?.allShips?.find(ship =>
      !ship.sunk && ship.cells.some(sc => sc.r === r && sc.c === c && !sc.hit)
    );

    let cellClass = 'bg-slate-50 border-slate-200 cursor-not-allowed';
    let inlineStyle = {};

    if (cellState === 'hit') {
      if (sunkShip) {
        cellClass = 'border-transparent text-white shadow-xs';
        inlineStyle = enemyFleetStyle.style;
      } else {
        cellClass = 'bg-rose-500 border-rose-600 animate-hit-pop shadow-xs text-white';
      }
    } else if (cellState === 'miss') {
      cellClass = 'bg-slate-100 border-slate-200';
    } else if (unhitShip) {
      // Semi-transparent ghost ship for unhit enemy ships after game finishes
      cellClass = 'border-2 border-dashed border-slate-400 shadow-2xs';
      inlineStyle = {
        ...enemyFleetStyle.style,
        opacity: 0.45
      };
    } else if (isMyTurn && !isGameOver) {
      cellClass = 'bg-slate-50 border-slate-300 hover:bg-red-50 hover:border-red-400 cursor-crosshair';
    }

    return (
      <button
        key={`${r}-${c}`}
        disabled={!isClickable}
        onClick={() => handleShoot(r, c)}
        style={inlineStyle}
        title={unhitShip ? 'Ocalały statek przeciwnika (nieodkryty)' : undefined}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex items-center justify-center transition-all duration-150 relative ${cellClass}`}
      >
        {cellState === 'hit' && (
          <Flame className="w-4 h-4 text-amber-200 drop-shadow fill-amber-300" />
        )}

        {/* Red X on empty fields (misses and auto-marked water) */}
        {cellState === 'miss' && (
          <span className="text-red-600 font-extrabold text-xs select-none drop-shadow-2xs">✕</span>
        )}

        {/* Ghost indicator on surviving unhit ships */}
        {unhitShip && cellState === null && (
          <div className="w-2 h-2 rounded-full bg-white/90 shadow-xs"></div>
        )}
      </button>
    );
  };

  // Render cell on own board
  const renderMyCell = (r, c) => {
    const shot = me?.shotsGrid[r][c]; // null, 'miss', 'hit'

    const myShip = me?.ships?.find(ship =>
      ship.cells.some(sc => sc.r === r && sc.c === c)
    );

    let bgStyle = 'bg-slate-50 border-slate-200';
    let inlineStyle = {};

    if (myShip) {
      if (myShip.sunk) {
        bgStyle = 'bg-rose-950 border-rose-900 text-white';
      } else {
        bgStyle = 'border-transparent text-white shadow-2xs';
        inlineStyle = myFleetStyle.style;
      }
    }

    return (
      <div
        key={`${r}-${c}`}
        style={inlineStyle}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex items-center justify-center relative ${bgStyle}`}
      >
        {shot === 'hit' ? (
          <Flame className="w-4 h-4 text-rose-300 animate-pulse fill-rose-500" />
        ) : shot === 'miss' ? (
          /* Red X on empty squares on own board as well */
          <span className="text-red-600 font-extrabold text-xs select-none drop-shadow-2xs">✕</span>
        ) : myShip ? (
          <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 flex flex-col items-center">
      
      {/* Top Banner: Turn status / Game Over Header & Controls */}
      <div className={`w-full max-w-4xl mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl shadow-sm border transition-all ${
        isGameOver
          ? isWinner
            ? 'bg-gradient-to-r from-amber-50 to-emerald-50 border-amber-300'
            : 'bg-gradient-to-r from-rose-50 to-slate-50 border-rose-300'
          : 'bg-white border-slate-200'
      }`}>
        
        {/* Status icon & message */}
        <div className="flex items-center space-x-3.5 text-left">
          {isGameOver ? (
            isWinner ? (
              <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                <Trophy className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 shrink-0 shadow-xs">
                <Skull className="w-7 h-7" />
              </div>
            )
          ) : (
            <div className={`w-3.5 h-3.5 rounded-full ${
              isMyTurn
                ? 'bg-emerald-500 animate-ping'
                : 'bg-rose-500'
            }`} />
          )}

          <div>
            <div className="font-chakra font-bold text-base sm:text-lg">
              {isGameOver ? (
                <span className={isWinner ? 'text-amber-800' : 'text-rose-800'}>
                  {isWinner ? '🏆 ZWYCIĘSTWO! Wroga flota została zatopiona!' : '💀 PORAŻKA! Twoja flota została zniszczona.'}
                </span>
              ) : isMyTurn ? (
                <span className="text-emerald-600 flex items-center space-x-1.5">
                  <Crosshair className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span>TWÓJ RUCH! Wybierz pole na planszy wroga</span>
                </span>
              ) : (
                <span className="text-slate-600">
                  Ruch przeciwnika ({enemy?.name || 'Przeciwnik'})...
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mt-0.5">
              {isGameOver
                ? 'Obie plansze pozostają w pełni widoczne. Nieodkryte statki wyświetlają się w trybie półprześwitującym.'
                : isMyTurn
                ? 'Trafienie gwarantuje kolejny strzał! Puste pola oznaczają się same na czerwony ✕.'
                : 'Oczekiwanie na ruch przeciwnika...'}
            </p>
          </div>
        </div>

        {/* Action buttons: Rematch & Leave during Game Over, or Share Link during battle */}
        {isGameOver ? (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => { sounds.playClick(); onRematch(); }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold font-chakra text-xs sm:text-sm shadow-xs transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Zagraj Rewanż</span>
            </button>
            <button
              onClick={() => { sounds.playClick(); onLeaveRoom(); }}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-medium transition border border-slate-300 shadow-2xs"
            >
              Menu
            </button>
          </div>
        ) : (
          !isBotGame && (
            <button
              onClick={copyRoomLink}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-700 border border-slate-200 text-xs font-semibold transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Skopiowano link do gry!' : 'Skopiuj link do pokoju'}</span>
            </button>
          )
        )}

      </div>

      {/* Main Game Arena: 2 Fully Visible Boards + Chat */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left: Your Fleet (Always 100% visible) */}
        <div className="xl:col-span-4 flex flex-col items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="w-full flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-chakra font-bold text-sm text-slate-900">Twoja Flota ({me?.name})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                style={{ backgroundColor: myFleetStyle.hex }}
                title="Twój kolor floty"
              />
              <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                Trafień wroga: {me?.stats?.hits || 0}
              </span>
            </div>
          </div>

          {/* 10x10 Grid with Guaranteed Column Alignment */}
          <div className="inline-block p-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl">
            <div className="grid grid-cols-[24px_repeat(10,28px)] sm:grid-cols-[28px_repeat(10,32px)] gap-1 items-center">
              
              {/* Corner */}
              <div className="w-6 sm:w-7 h-5 sm:h-6"></div>

              {/* 10 Headers A-J */}
              {LETTERS.map(l => (
                <div
                  key={l}
                  className="w-7 sm:w-8 h-5 sm:h-6 flex items-center justify-center font-mono font-bold text-slate-700 text-xs sm:text-sm select-none"
                >
                  {l}
                </div>
              ))}

              {/* Rows 1-10 */}
              {NUMBERS.map((n, r) => (
                <React.Fragment key={n}>
                  <div className="w-6 sm:w-7 h-7 sm:h-8 flex items-center justify-end pr-1.5 font-mono font-bold text-slate-700 text-xs sm:text-sm select-none">
                    {n}
                  </div>
                  {LETTERS.map((_, c) => renderMyCell(r, c))}
                </React.Fragment>
              ))}

            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 text-center">
            Płomienie na Twoich okrętach to trafienia, a <strong className="text-red-600 font-bold">czerwony ✕</strong> to pudła wroga.
          </div>
        </div>

        {/* Center: Enemy Board (Always 100% visible, reveals unhit ships semi-transparently on game over!) */}
        <div className="xl:col-span-5 flex flex-col items-center bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-md relative">
          
          <div className="w-full flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-rose-600" />
              <span className="font-chakra font-bold text-sm text-slate-900">Flota Przeciwnika ({enemy?.name})</span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                Zatopione: {enemy?.sunkShips?.length || 0}/10
              </span>
            </div>
          </div>

          {/* 10x10 Enemy Grid with Guaranteed Column Alignment */}
          <div className="inline-block p-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl shadow-inner">
            <div className="grid grid-cols-[24px_repeat(10,28px)] sm:grid-cols-[28px_repeat(10,32px)] gap-1 items-center">
              
              {/* Corner */}
              <div className="w-6 sm:w-7 h-5 sm:h-6"></div>

              {/* 10 Headers A-J */}
              {LETTERS.map(l => (
                <div
                  key={l}
                  className="w-7 sm:w-8 h-5 sm:h-6 flex items-center justify-center font-mono font-bold text-slate-700 text-xs sm:text-sm select-none"
                >
                  {l}
                </div>
              ))}

              {/* Rows 1-10 */}
              {NUMBERS.map((n, r) => (
                <React.Fragment key={n}>
                  <div className="w-6 sm:w-7 h-7 sm:h-8 flex items-center justify-end pr-1.5 font-mono font-bold text-slate-700 text-xs sm:text-sm select-none">
                    {n}
                  </div>
                  {LETTERS.map((_, c) => renderEnemyCell(r, c))}
                </React.Fragment>
              ))}

            </div>
          </div>

          {/* Sunk ships checklist preview */}
          <div className="w-full mt-4 pt-3 border-t border-slate-200 flex items-center justify-around text-[11px] text-slate-600">
            <div className="flex items-center space-x-1">
              <span>4-maszt:</span>
              <span className="font-mono font-bold text-slate-900">
                {(enemy?.sunkShips || []).filter(s => s.size === 4).length}/1
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span>3-maszt:</span>
              <span className="font-mono font-bold text-slate-900">
                {(enemy?.sunkShips || []).filter(s => s.size === 3).length}/2
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span>2-maszt:</span>
              <span className="font-mono font-bold text-slate-900">
                {(enemy?.sunkShips || []).filter(s => s.size === 2).length}/3
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span>1-maszt:</span>
              <span className="font-mono font-bold text-slate-900">
                {(enemy?.sunkShips || []).filter(s => s.size === 1).length}/4
              </span>
            </div>
          </div>

          {isGameOver && (
            <div className="mt-3 text-[11px] text-slate-600 text-center font-medium">
              💡 Półprześwitujące pola z przerywaną ramką oznaczają ocalałe statki, których nie trafiono.
            </div>
          )}

        </div>

        {/* Right: In-Game Chat */}
        <div className="xl:col-span-3 flex flex-col h-[460px] bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="font-chakra font-bold text-sm text-slate-900 mb-2 flex items-center justify-between">
            <span>Czat Bitewny</span>
            <span className="text-[10px] text-slate-500 font-mono">Tura {gameState.turnsCount || 1}</span>
          </h3>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1 mb-2">
            {['Cześć!', 'Dobre trafienie!', 'Gramy rewanż?', 'Pudło! 😜'].map((preset) => (
              <button
                key={preset}
                onClick={() => { sounds.playClick(); onSendChat(preset); }}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {chat && chat.length > 0 ? (
              chat.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg ${
                    msg.senderKey === me?.key
                      ? 'bg-blue-50 border border-blue-200 text-blue-900 ml-3'
                      : !msg.senderKey
                      ? 'bg-slate-100 border border-slate-200 text-slate-700 text-center text-[11px]'
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

          {/* Chat input */}
          <form onSubmit={handleChatSubmit} className="mt-3 flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Napisz wiadomość..."
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              maxLength={120}
            />
            <button
              type="submit"
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
