import React, { useState } from 'react';
import { Anchor, Trophy, Volume2, VolumeX, LogIn, LogOut, Info, Shield, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function Navbar({
  user,
  onOpenAuth,
  onLogout,
  onOpenLeaderboard,
  onOpenRules,
  onOpenAdmin,
  currentRoomId,
  onLeaveRoom,
  boardZoom = 100,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) {
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  const isAdmin = user && (user.role === 'admin' || user.username?.toLowerCase() === 'dominika');

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
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          
          {/* Zoom controls for boards (- and +) placed directly to the left of (i) */}
          <div className="flex items-center bg-slate-100/90 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={() => { sounds.playClick(); onZoomOut(); }}
              disabled={boardZoom <= 70}
              className={`p-1.5 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-white transition cursor-pointer ${
                boardZoom <= 70 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              title="Pomniejsz plansze (-10%)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={() => { sounds.playClick(); onResetZoom(); }}
              className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-700 hover:text-blue-600 transition"
              title="Resetuj skalę (100%)"
            >
              {boardZoom}%
            </button>

            <button
              onClick={() => { sounds.playClick(); onZoomIn(); }}
              disabled={boardZoom >= 150}
              className={`p-1.5 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-white transition cursor-pointer ${
                boardZoom >= 150 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              title="Powiększ plansze (+10%)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

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
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-1 py-1">
              <button
                onClick={() => {
                  if (isAdmin) {
                    sounds.playClick();
                    onOpenAdmin();
                  }
                }}
                className={`text-left text-xs transition ${
                  isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                }`}
                title={isAdmin ? 'Kliknij, aby otworzyć Panel Administratora' : user.username}
              >
                <div className="font-semibold text-slate-800 flex items-center space-x-1">
                  <Shield className={`w-3.5 h-3.5 ${isAdmin ? 'text-amber-500 fill-amber-500' : 'text-blue-600'}`} />
                  <span className={isAdmin ? 'text-indigo-900 font-bold underline decoration-amber-500 decoration-2 underline-offset-2' : ''}>
                    {user.username}
                  </span>
                  {isAdmin && (
                    <span className="ml-1 text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full font-mono uppercase tracking-wide">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">
                  W: <span className="text-emerald-600 font-mono font-bold">{user.wins || 0}</span> | P: <span className="text-rose-600 font-mono">{user.losses || 0}</span>
                </div>
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded-lg transition"
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
