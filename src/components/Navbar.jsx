import React, { useState } from 'react';
import { Anchor, Trophy, Volume2, VolumeX, LogIn, LogOut, Info, Shield } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function Navbar({
  user,
  onOpenAuth,
  onLogout,
  onOpenLeaderboard,
  onOpenRules,
  currentRoomId,
  onLeaveRoom
}) {
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onLeaveRoom}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-chakra font-bold text-xl tracking-wider text-slate-900">STATKI</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-semibold">ONLINE</span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Klasyczna Bitwa Morska 10×10</p>
          </div>
        </div>

        {/* Room Info if inside game */}
        {currentRoomId && (
          <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-500">POKÓJ:</span>
            <span className="text-blue-700 font-bold tracking-wider">{currentRoomId}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Rules button */}
          <button
            onClick={onOpenRules}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
            title="Zasady gry"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Leaderboard button */}
          <button
            onClick={() => { sounds.playClick(); onOpenLeaderboard(); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition text-sm font-medium"
            title="Rankingi dzienne i ogólne"
          >
            <Trophy className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline font-semibold">Ranking</span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
            title={soundEnabled ? 'Wycisz dźwięki' : 'Włącz dźwięki'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-1 py-1">
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-800 flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-blue-600" />
                  <span>{user.username}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  W: <span className="text-emerald-600 font-mono font-bold">{user.wins || 0}</span> | P: <span className="text-rose-600 font-mono">{user.losses || 0}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded transition"
                title="Wyloguj się"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { sounds.playClick(); onOpenAuth(); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Zaloguj się</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
