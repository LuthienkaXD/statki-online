import React, { useState } from 'react';
import {
  Users,
  Bot,
  ArrowRight,
  Sparkles,
  Bomb,
  Plane,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function LobbyView({
  onCreateRoom,
  onJoinRoom,
  user,
  onOpenAuth
}) {
  const [joinCode, setJoinCode] = useState('');
  const [boardSize, setBoardSize] = useState(10); // 10 | 13 | 15
  const [modifiers, setModifiers] = useState({
    mines: true, // Mines: hitting a mine loses your turn
    reconPlane: true // Recon plane: scan 3x3 once per match
  });

  const toggleModifier = (key) => {
    sounds.playClick();
    setModifiers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sounds.playClick();
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  const handleCreateGame = (isBot) => {
    sounds.playClick();
    onCreateRoom(isBot, {
      boardSize,
      options: modifiers
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col items-center">
      
      {/* Hero Header */}
      <div className="text-center mb-8 max-w-2xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-semibold mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Bitwa Morska Online • Plansze 10×10, 13×13, 15×15 & Miny</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold font-chakra text-slate-900 tracking-wide leading-tight">
          BITWA MORSKA <span className="text-blue-600">ONLINE</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 mt-2">
          Wybierz rozmiar pola bitwy, włącz dodatkowe modyfikatory (miny morskie, zwiad lotniczy) i zmierz się w pojedynku Kamień-Papier-Nożyce o prawo pierwszego wystrzału!
        </p>
      </div>

      {/* Game Config: Board Size & Modifiers */}
      <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 mb-8 shadow-sm">
        
        {/* Step 1: Select Board Size */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs sm:text-sm font-bold font-chakra uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>1. Wybierz Rozmiar Planszy</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              Wybrano: <strong>{boardSize}×{boardSize}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                size: 10,
                title: 'Klasyczna 10×10',
                desc: '10 standardowych statków (1×4, 2×3, 3×2, 4×1)',
                tag: 'STANDARD'
              },
              {
                size: 13,
                title: 'Taktyczna 13×13',
                desc: '13 statków (w tym potężny 5-masztowy Lotniskowiec)',
                tag: 'ŚREDNIA'
              },
              {
                size: 15,
                title: 'Epicka 15×15',
                desc: '15 statków + Unikalny Pancernik w kształcie L (3×2)',
                tag: 'SPECJALNA (L-SHIP)'
              }
            ].map(b => {
              const isSelected = boardSize === b.size;
              return (
                <button
                  key={b.size}
                  onClick={() => { sounds.playClick(); setBoardSize(b.size); }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-chakra font-bold text-sm sm:text-base text-slate-900">{b.title}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {b.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{b.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Modifiers Checkboxes */}
        <div className="pt-5 border-t border-slate-100">
          <label className="text-xs sm:text-sm font-bold font-chakra uppercase tracking-wider text-slate-800 flex items-center space-x-2 mb-3">
            <Bomb className="w-4 h-4 text-rose-500" />
            <span>2. Dodatkowe Urozmaicenia Rozgrywki (Opcje)</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Modifier 1: Sea Mines */}
            <div
              onClick={() => toggleModifier('mines')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start space-x-3 ${
                modifiers.mines
                  ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400/30'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={modifiers.mines}
                onChange={() => {}}
                className="mt-1 rounded text-rose-600 focus:ring-rose-500 h-4 w-4 pointer-events-none"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Bomb className="w-3.5 h-3.5 text-rose-600" />
                  <span>Miny Morskie (Utrata kolejki)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Na wodach ukryte są miny przeciwnika. Strzał w minę natychmiast kończy Twoją turę i oddaje ruch rywalowi!
                </p>
              </div>
            </div>

            {/* Modifier 2: Reconnaissance Plane */}
            <div
              onClick={() => toggleModifier('reconPlane')}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start space-x-3 ${
                modifiers.reconPlane
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-400/30'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={modifiers.reconPlane}
                onChange={() => {}}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 pointer-events-none"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Plane className="w-3.5 h-3.5 text-blue-600" />
                  <span>Samolot Zwiadowczy (Radar 3×3)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Jednorazowy radar w trakcie bitwy, który skanuje kwadrat 3×3 bez oddawania strzału i informuje, czy w sektorze jest wrogi okręt.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Main Options Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Option 1: Play with Friend (Multiplayer) */}
        <div className="bg-white border-2 border-slate-200 hover:border-blue-500 transition-all rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold font-chakra text-slate-900 mb-1">
              Zagraj ze Znajomym
            </h2>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Utwórz pokój z wybraną planszą ({boardSize}×{boardSize}) i wyślij link. Po rozstawieniu floty zagracie w Kamień-Papier-Nożyce o pierwszy strzał!
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleCreateGame(false)}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold font-chakra text-sm sm:text-base flex items-center justify-center space-x-2 transition shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>Stwórz Nowy Pokój ({boardSize}×{boardSize})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Join by code form */}
            <form onSubmit={handleJoinSubmit} className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Kod pokoju (np. X7K9A)"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                maxLength={8}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-200 cursor-pointer"
              >
                Dołącz
              </button>
            </form>
          </div>
        </div>

        {/* Option 2: Single Player vs Bot */}
        <div className="bg-white border-2 border-slate-200 hover:border-emerald-500 transition-all rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold font-chakra text-slate-900 mb-1">
              Trening z Komputerem
            </h2>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Zagraj natychmiast przeciwko Kapitanowi Morganowi na planszy {boardSize}×{boardSize} z minami i zwiadem.
            </p>
          </div>

          <div>
            <button
              onClick={() => handleCreateGame(true)}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-chakra text-sm sm:text-base flex items-center justify-center space-x-2 transition shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>Rozpocznij Mecz z Botem</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
