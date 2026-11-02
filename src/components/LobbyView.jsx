import React, { useState } from 'react';
import { Users, Bot, ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function LobbyView({
  onCreateRoom,
  onJoinRoom,
  user,
  onOpenAuth
}) {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sounds.playClick();
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      
      {/* Hero Header */}
      <div className="text-center mb-10 max-w-2xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-semibold mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Mechanika battleship-game.org & Statki 10×10</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold font-chakra text-slate-900 tracking-wide leading-tight">
          BITWA MORSKA <span className="text-blue-600">ONLINE</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 mt-3">
          Rozstaw 10 statków (1×4, 2×3, 3×2, 4×1) z zachowaniem odstępów. Graj online ze znajomymi przez link lub trenuj z komputerem. Wybierz kolor swojej floty!
        </p>
      </div>

      {/* Main Options Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* Option 1: Play with Friend (Multiplayer) */}
        <div className="bg-white border-2 border-slate-200 hover:border-blue-500 transition-all rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md flex flex-col justify-between group">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-5 group-hover:scale-105 transition-transform">
              <Users className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold font-chakra text-slate-900 mb-2">
              Zagraj ze Znajomym
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              Utwórz prywatny pokój i wyślij wygenerowany link do kolegi lub koleżanki. Gracz natychmiast dołączy do Twojej bitwy.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => { sounds.playClick(); onCreateRoom(false); }}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold font-chakra text-sm sm:text-base flex items-center justify-center space-x-2 transition shadow-sm hover:shadow-md"
            >
              <span>Stwórz Nowy Pokój i Skopiuj Link</span>
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-200"
              >
                Dołącz
              </button>
            </form>
          </div>
        </div>

        {/* Option 2: Play vs Computer (Smart Bot) */}
        <div className="bg-white border-2 border-slate-200 hover:border-amber-500 transition-all rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md flex flex-col justify-between group">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5 group-hover:scale-105 transition-transform">
              <Bot className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold font-chakra text-slate-900 mb-2">
              Zagraj z Komputerem
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              Nie masz teraz z kim zagrać? Sprawdź swoje umiejętności w starciu z Kapitanem Morganem (inteligentny bot z polowaniem na trafienia).
            </p>
          </div>

          <div>
            <button
              onClick={() => { sounds.playClick(); onCreateRoom(true); }}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold font-chakra text-sm sm:text-base flex items-center justify-center space-x-2 transition shadow-sm hover:shadow-md"
            >
              <span>Rozpocznij Trening z Botem</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Account reminder card */}
      {!user && (
        <div className="w-full bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3 text-left">
            <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Chcesz znaleźć się w dziennym rankingu?</h3>
              <p className="text-xs text-slate-600">Załóż bezpłatne konto w kilka sekund, aby Twoje wygrane były zapisywane w tabeli wyników.</p>
            </div>
          </div>
          <button
            onClick={() => { sounds.playClick(); onOpenAuth(); }}
            className="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-xs"
          >
            Zarejestruj się / Zaloguj
          </button>
        </div>
      )}

    </div>
  );
}
