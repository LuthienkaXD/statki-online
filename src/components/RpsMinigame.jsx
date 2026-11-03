import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import { Sparkles, Trophy, CheckCircle2, RotateCcw } from 'lucide-react';

const RPS_OPTIONS = [
  {
    id: 'rock',
    name: 'Kamień',
    icon: '🪨',
    beats: 'scissors',
    color: 'from-amber-500 to-orange-600',
    desc: 'Tępi nożyce'
  },
  {
    id: 'paper',
    name: 'Papier',
    icon: '📄',
    beats: 'rock',
    color: 'from-blue-500 to-cyan-600',
    desc: 'Owijka na kamień'
  },
  {
    id: 'scissors',
    name: 'Nożyce',
    icon: '✂️',
    beats: 'paper',
    color: 'from-rose-500 to-pink-600',
    desc: 'Tną papier'
  }
];

export default function RpsMinigame({ rps, onMakeChoice, onRpsRematch, isBotGame, enemyName }) {
  const [selected, setSelected] = useState(null);

  const handlePick = (choiceId) => {
    sounds.playClick();
    setSelected(choiceId);
    onMakeChoice(choiceId);
  };

  const handleTieRematch = () => {
    sounds.playClick();
    setSelected(null);
    if (onRpsRematch) onRpsRematch();
  };

  const myChoice = rps?.myChoice;
  const enemyChosen = rps?.enemyChosen;
  const resultText = rps?.resultText;
  const winner = rps?.winner;
  const isTie = Boolean(rps?.isTie);

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-white border-2 border-slate-200 rounded-3xl shadow-xl text-center animate-in fade-in zoom-in-95 duration-200">
      
      {/* Badge */}
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-semibold mb-3">
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span>Pojedynek o Pierwszy Strzał</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold font-chakra text-slate-900 mb-1">
        Kamień, Papier, Nożyce!
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 mb-6 max-w-md mx-auto">
        Obaj kapitanowie rozstawili swoje floty. Zwycięzca pojedynku rozpoczyna ostrzał jako pierwszy!
      </p>

      {/* Choices Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        {RPS_OPTIONS.map((opt) => {
          const isChosenByMe = (myChoice || selected) === opt.id;
          return (
            <button
              key={opt.id}
              disabled={Boolean(myChoice && !isTie)}
              onClick={() => handlePick(opt.id)}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
                isChosenByMe
                  ? 'border-indigo-600 bg-indigo-50/70 ring-4 ring-indigo-500/20 scale-105 shadow-md'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:scale-102 hover:shadow-sm'
              } ${myChoice && !isTie ? 'cursor-default' : ''}`}
            >
              <div className="text-4xl sm:text-5xl mb-2 transition-transform group-hover:scale-115">
                {opt.icon}
              </div>
              <div className="font-chakra font-bold text-sm sm:text-base text-slate-900">
                {opt.name}
              </div>
              <div className="text-[10px] text-slate-500 hidden sm:block mt-0.5">
                {opt.desc}
              </div>
              {isChosenByMe && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Status Bar & Tie Rematch Button */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm space-y-3">
        {resultText ? (
          <div className="font-bold text-indigo-950 dark:text-indigo-200 font-chakra text-sm sm:text-base">
            {resultText}
          </div>
        ) : myChoice ? (
          <div className="text-slate-600 dark:text-slate-300 flex items-center justify-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            <span>
              Twój wybór: <strong className="text-slate-900 dark:text-white">{myChoice.toUpperCase()}</strong>. {enemyChosen ? 'Obliczanie wyniku...' : `Czekamy na wybór ${enemyName || 'rywala'}...`}
            </span>
          </div>
        ) : (
          <div className="text-slate-500 dark:text-slate-300 font-medium">
            Wybierz jeden z symboli powyżej!
          </div>
        )}

        {/* Tie Rematch Button */}
        {isTie && (
          <div>
            <button
              onClick={handleTieRematch}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-chakra font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 mx-auto cursor-pointer animate-bounce"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Zagraj dogrywkę (Wybierz ponownie)</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
