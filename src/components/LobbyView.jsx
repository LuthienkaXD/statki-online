import React, { useState, useEffect } from 'react';
import {
  Users,
  Bot,
  ArrowRight,
  Sparkles,
  Bomb,
  Plane,
  Shield,
  Layers,
  Radio,
  Zap,
  Lock,
  Globe,
  Clock,
  Play
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function LobbyView({
  onCreateRoom,
  onJoinRoom,
  openRooms = [],
  user,
  onOpenAuth
}) {
  const [joinCode, setJoinCode] = useState('');
  const [boardSize, setBoardSize] = useState(10);
  const [adminConfig, setAdminConfig] = useState({
    mines: true,
    reconPlane: true,
    sonar: true,
    flagshipSalvo: true
  });
  const [modifiers, setModifiers] = useState({
    mines: true,
    reconPlane: true,
    sonar: true,
    flagshipSalvo: true
  });

  useEffect(() => {
    fetch('/api/system/public')
      .then(res => res.json())
      .then(data => {
        if (data && data.modifiersConfig) {
          setAdminConfig(data.modifiersConfig);
          setModifiers(prev => ({
            mines: data.modifiersConfig.mines ? prev.mines : false,
            reconPlane: data.modifiersConfig.reconPlane ? prev.reconPlane : false,
            sonar: data.modifiersConfig.sonar ? prev.sonar : false,
            flagshipSalvo: data.modifiersConfig.flagshipSalvo ? prev.flagshipSalvo : false
          }));
        }
      })
      .catch(() => {});
  }, []);

  const toggleModifier = (key) => {
    if (!adminConfig[key]) return; // Disabled by admin
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
          <span>Bitwa Morska Online • Nowe Tryby i Taktyki Wojenne</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold font-chakra text-slate-900 tracking-wide leading-tight">
          BITWA MORSKA <span className="text-blue-600">ONLINE</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 mt-2">
          Wybierz rozmiar pola bitwy (10×10, 13×13, 15×15 ze statkiem L), dobierz modyfikatory taktyczne i stań do walki o panowanie na morzu!
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
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>2. Dodatkowe Urozmaicenia Rozgrywki (Aktywne w pokoju)</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Modifier 1: Sea Mines */}
            <div
              onClick={() => toggleModifier('mines')}
              className={`p-3.5 rounded-2xl border transition flex items-start space-x-3 ${
                !adminConfig.mines
                  ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                  : modifiers.mines
                  ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400/30 cursor-pointer'
                  : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={modifiers.mines && adminConfig.mines}
                disabled={!adminConfig.mines}
                onChange={() => {}}
                className="mt-1 rounded text-rose-600 focus:ring-rose-500 h-4 w-4 pointer-events-none"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Bomb className="w-3.5 h-3.5 text-rose-600" />
                    <span>Miny Morskie (Utrata tury)</span>
                  </span>
                  {!adminConfig.mines && <Lock className="w-3 h-3 text-slate-400" title="Wyłączone przez admina" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  W wodach ukryte są miny przeciwnika. Strzał w minę natychmiast kończy Twoją turę!
                </p>
              </div>
            </div>

            {/* Modifier 2: Reconnaissance Plane */}
            <div
              onClick={() => toggleModifier('reconPlane')}
              className={`p-3.5 rounded-2xl border transition flex items-start space-x-3 ${
                !adminConfig.reconPlane
                  ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                  : modifiers.reconPlane
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-400/30 cursor-pointer'
                  : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={modifiers.reconPlane && adminConfig.reconPlane}
                disabled={!adminConfig.reconPlane}
                onChange={() => {}}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 pointer-events-none"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Plane className="w-3.5 h-3.5 text-blue-600" />
                    <span>Zwiad Lotniczy (Radar 3×3)</span>
                  </span>
                  {!adminConfig.reconPlane && <Lock className="w-3 h-3 text-slate-400" title="Wyłączone przez admina" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Jednorazowy skan wybranego kwadratu 3×3 informujący, czy wykryto tam okręt wroga.
                </p>
              </div>
            </div>

            {/* Modifier 3: Sonar Impulse (NEW) */}
            <div
              onClick={() => toggleModifier('sonar')}
              className={`p-3.5 rounded-2xl border transition flex items-start space-x-3 ${
                !adminConfig.sonar
                  ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                  : modifiers.sonar
                  ? 'border-teal-400 bg-teal-50/50 ring-1 ring-teal-400/30 cursor-pointer'
                  : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={modifiers.sonar && adminConfig.sonar}
                disabled={!adminConfig.sonar}
                onChange={() => {}}
                className="mt-1 rounded text-teal-600 focus:ring-teal-500 h-4 w-4 pointer-events-none"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-teal-600" />
                    <span>Impuls Sonaru (Skan wiersza/kolumny)</span>
                  </span>
                  {!adminConfig.sonar && <Lock className="w-3 h-3 text-slate-400" title="Wyłączone przez admina" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Wysyła falę dźwiękową przez całą linię wroga. Zwraca echo: czy w tej linii znajduje się okręt.
                </p>
              </div>
            </div>

            {/* Modifier 4: Flagship Salvo (NEW) */}
            <div
              onClick={() => toggleModifier('flagshipSalvo')}
              className={`p-3.5 rounded-2xl border transition flex items-start space-x-3 ${
                !adminConfig.flagshipSalvo
                  ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                  : modifiers.flagshipSalvo
                  ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-400/30 cursor-pointer'
                  : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={modifiers.flagshipSalvo && adminConfig.flagshipSalvo}
                disabled={!adminConfig.flagshipSalvo}
                onChange={() => {}}
                className="mt-1 rounded text-amber-600 focus:ring-amber-500 h-4 w-4 pointer-events-none"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Podwójna Salwa Flagowca</span>
                  </span>
                  {!adminConfig.flagshipSalvo && <Lock className="w-3 h-3 text-slate-400" title="Wyłączone przez admina" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Dopóki Twój największy okręt jest nienaruszony, możesz raz na mecz oddać 2 strzały w jednej turze!
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Main Options Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Play with Friend */}
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

        {/* Single Player vs Bot */}
        <div className="bg-white border-2 border-slate-200 hover:border-emerald-500 transition-all rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold font-chakra text-slate-900 mb-1">
              Trening z Komputerem
            </h2>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Zagraj natychmiast przeciwko Kapitanowi Morganowi na planszy {boardSize}×{boardSize} z wybranymi modyfikatorami taktycznymi.
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

      {/* Open Rooms List (Public Lobby) */}
      <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Globe className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-chakra text-slate-900 leading-tight">
                Otwarte Pokoje do Gry
              </h3>
              <p className="text-[11px] text-slate-500">
                Pokoje utworzone przez innych graczy, oczekujące na przeciwnika
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {openRooms.length} {openRooms.length === 1 ? 'pokój' : openRooms.length > 1 && openRooms.length < 5 ? 'pokoje' : 'pokoi'}
            </span>
          </div>
        </div>

        {openRooms.length === 0 ? (
          <div className="py-8 text-center px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Brak oczekujących graczy w tej chwili</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Stwórz swój pokój powyżej klikając „Stwórz Nowy Pokój” lub zagraj szybki trening z komputerem!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {openRooms.map((room) => {
              const opts = room.options || {};
              return (
                <div
                  key={room.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm sm:text-base text-slate-900 font-chakra">
                          {room.hostName || 'Kapitan'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                          #{room.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                        <span>Plansza: <strong className="text-slate-700">{room.boardSize}×{room.boardSize}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        sounds.playClick();
                        onJoinRoom(room.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-chakra font-bold text-xs flex items-center space-x-1.5 shadow-xs hover:shadow transition cursor-pointer"
                    >
                      <span>Dołącz</span>
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  {/* Active modifiers chips */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-medium text-slate-400 self-center mr-1">Zasady:</span>
                    {opts.mines && (
                      <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                        <Bomb className="w-2.5 h-2.5 text-rose-500" />
                        <span>Miny</span>
                      </span>
                    )}
                    {opts.reconPlane && (
                      <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                        <Plane className="w-2.5 h-2.5 text-blue-500" />
                        <span>Radar</span>
                      </span>
                    )}
                    {opts.sonar && (
                      <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                        <Radio className="w-2.5 h-2.5 text-teal-500" />
                        <span>Sonar</span>
                      </span>
                    )}
                    {opts.flagshipSalvo && (
                      <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                        <Zap className="w-2.5 h-2.5 text-amber-500" />
                        <span>Salwa</span>
                      </span>
                    )}
                    {!opts.mines && !opts.reconPlane && !opts.sonar && !opts.flagshipSalvo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                        Czysta bitwa klasyczna
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
