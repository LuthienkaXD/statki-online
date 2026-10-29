import React, { useState, useEffect } from 'react';
import { Users, Bot, ArrowRight, Trophy, Sparkles, RefreshCw, Swords, Shield, Clock, Copy, Check } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function LobbyView({
  onCreateRoom,
  onJoinRoom,
  user,
  socket,
  onOpenAuth
}) {
  const [joinCode, setJoinCode] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  // Fetch rooms list from API and listen to socket updates
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch {
      // ignore network errors
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    if (socket) {
      socket.on('rooms_update', (updatedRooms) => {
        setRooms(updatedRooms || []);
        setLoadingRooms(false);
      });
      socket.emit('request_rooms');
    }

    const interval = setInterval(fetchRooms, 4000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('rooms_update');
      }
    };
  }, [socket]);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sounds.playClick();
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    sounds.playClick();
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const joinableCount = rooms.filter(r => r.canJoin).length;

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
          Rozstaw 10 statków (1×4, 2×3, 3×2, 4×1) z zachowaniem odstępów. Graj online ze znajomymi przez link, wybierz otwarty pokój z listy lub trenuj z komputerem. Wybierz kolor swojej floty!
        </p>
      </div>

      {/* Main Options Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
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
              Utwórz prywatny pokój i wyślij wygenerowany link do znajomego, aby dołączył do Twojej bitwy.
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
                placeholder="Wpisz kod pokoju (np. ABC123)"
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
              Nie masz teraz z kim zagrać? Sprawdź swoje umiejętności w starciu z Kapitanem Morganem (inteligentny bot polujący na trafione okręty).
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

      {/* NEW: Public Rooms List (Max 2 players per room) */}
      <div className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-chakra text-slate-900 flex items-center space-x-2">
                <span>Dostępne Pokoje Bitewne</span>
                <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Maks. 2 graczy
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Wybierz pokój i dołącz jednym kliknięciem do pojedynku morskiego
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Oczekujące: <strong className="text-emerald-700">{joinableCount}</strong>
            </span>
            <button
              onClick={() => { sounds.playClick(); fetchRooms(); }}
              title="Odśwież listę pokoi"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Room items list */}
        {loadingRooms && rooms.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Wyszukiwanie aktywnych pokojów...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              Brak otwartych pokojów wieloosobowych
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Stwórz nowy pokój za pomocą przycisku powyżej („Stwórz Nowy Pokój”) i poczekaj na dołączenie drugiego gracza!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => {
              const isFull = room.playerCount >= 2;
              const isJoinable = room.canJoin;

              return (
                <div
                  key={room.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isJoinable
                      ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/70 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    {/* Status Dot */}
                    <div className="relative shrink-0">
                      <div className={`w-3.5 h-3.5 rounded-full ${
                        isJoinable ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                      {isJoinable && (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping absolute inset-0" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-chakra font-bold text-base text-slate-900">
                          Pokój {room.id}
                        </span>
                        <button
                          onClick={() => copyCode(room.id)}
                          title="Skopiuj kod pokoju"
                          className="text-[11px] font-mono text-slate-500 hover:text-blue-600 flex items-center space-x-1"
                        >
                          {copiedCode === room.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center space-x-2 mt-0.5">
                        <span>Założyciel: <strong className="text-slate-800">{room.hostName}</strong></span>
                        <span>•</span>
                        <span className="text-[11px] text-slate-500">
                          {room.status === 'waiting'
                            ? 'Oczekuje na drugiego gracza'
                            : room.status === 'placement'
                            ? 'Rozstawianie statków'
                            : 'Bitwa w toku'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Player count (max 2) & Join button */}
                  <div className="flex items-center space-x-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                    
                    {/* Players counter badge */}
                    <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                      isJoinable
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}>
                      <Users className="w-3.5 h-3.5" />
                      <span>{room.playerCount} / 2 graczy</span>
                    </div>

                    {/* Join button */}
                    {isJoinable ? (
                      <button
                        onClick={() => { sounds.playClick(); onJoinRoom(room.id); }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-chakra font-bold text-xs sm:text-sm rounded-xl transition shadow-xs hover:shadow flex items-center space-x-1.5 shrink-0"
                      >
                        <span>Dołącz</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="px-3.5 py-2 bg-slate-200 text-slate-500 font-semibold text-xs rounded-xl border border-slate-300 shrink-0">
                        Pełny (2/2)
                      </span>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

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
