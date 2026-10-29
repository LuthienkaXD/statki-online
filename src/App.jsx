import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Navbar from './components/Navbar';
import LobbyView from './components/LobbyView';
import PlacementBoard from './components/PlacementBoard';
import GameView from './components/GameView';
import AuthModal from './components/AuthModal';
import LeaderboardModal from './components/LeaderboardModal';
import RulesModal from './components/RulesModal';
import { sounds } from './utils/audio';
import { Users, Copy, Check, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [playerKey, setPlayerKey] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [errorNotice, setErrorNotice] = useState('');
  const [copied, setCopied] = useState(false);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const prevGameStateRef = useRef(null);

  // Initialize Socket.io and check token & URL params
  useEffect(() => {
    const s = io();
    setSocket(s);

    // Check user token
    const token = localStorage.getItem('battleship_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.user) setUser(data.user);
        })
        .catch(() => {});
    }

    // Check URL room param
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setCurrentRoomId(roomParam.toUpperCase());
    }

    return () => s.disconnect();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('room_created', ({ roomId, playerKey: pKey, state }) => {
      setCurrentRoomId(roomId);
      setPlayerKey(pKey);
      setGameState(state);
      // Update URL without reload
      window.history.pushState({}, '', `/?room=${roomId}`);
    });

    socket.on('room_joined', ({ roomId, playerKey: pKey, state }) => {
      setCurrentRoomId(roomId);
      setPlayerKey(pKey);
      setGameState(state);
      window.history.pushState({}, '', `/?room=${roomId}`);
    });

    socket.on('room_update', (newState) => {
      // Compare previous state to play hit/sunk sound effects
      const prev = prevGameStateRef.current;
      if (prev && newState) {
        // Did hits increase?
        const prevHits = (prev.me?.stats?.hits || 0) + (prev.enemy?.stats?.hits || 0);
        const nextHits = (newState.me?.stats?.hits || 0) + (newState.enemy?.stats?.hits || 0);

        const prevSunk = (prev.enemy?.sunkShips?.length || 0);
        const nextSunk = (newState.enemy?.sunkShips?.length || 0);

        if (nextSunk > prevSunk) {
          sounds.playSunk();
        } else if (nextHits > prevHits) {
          sounds.playHit();
        } else {
          // Check if shots increased without hit (miss)
          const prevShots = (prev.me?.stats?.shots || 0) + (prev.enemy?.stats?.shots || 0);
          const nextShots = (newState.me?.stats?.shots || 0) + (newState.enemy?.stats?.shots || 0);
          if (nextShots > prevShots) {
            sounds.playSplash();
          }
        }
      }

      prevGameStateRef.current = newState;
      setGameState(newState);
    });

    socket.on('join_error', ({ message }) => {
      setErrorNotice(message);
    });

    socket.on('placement_error', ({ message }) => {
      setErrorNotice(message);
    });

    socket.on('shot_error', ({ message }) => {
      setErrorNotice(message);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_update');
      socket.off('join_error');
      socket.off('placement_error');
      socket.off('shot_error');
    };
  }, [socket]);

  // Join if room was in URL
  useEffect(() => {
    if (socket && currentRoomId && !gameState) {
      socket.emit('join_room', { roomId: currentRoomId, user });
    }
  }, [socket, currentRoomId, gameState, user]);

  const handleCreateRoom = (isBot = false) => {
    if (!socket) return;
    setErrorNotice('');
    socket.emit('create_room', { isBot, user });
  };

  const handleJoinRoom = (roomId) => {
    if (!socket) return;
    setErrorNotice('');
    socket.emit('join_room', { roomId, user });
  };

  const handleSetShips = (ships, color = 'blue') => {
    if (!socket) return;
    socket.emit('set_ships', { ships, color });
  };

  const handleFireShot = (r, c) => {
    if (!socket) return;
    socket.emit('fire_shot', { r, c });
  };

  const handleSendChat = (text) => {
    if (!socket) return;
    socket.emit('send_chat', { text });
  };

  const handleRematch = () => {
    if (!socket) return;
    socket.emit('rematch_request');
  };

  const handleLeaveRoom = () => {
    sounds.playClick();
    if (socket) {
      socket.emit('leave_room');
    }
    setCurrentRoomId(null);
    setGameState(null);
    setPlayerKey(null);
    window.history.pushState({}, '', '/');
  };

  const handleLogout = () => {
    sounds.playClick();
    localStorage.removeItem('battleship_token');
    setUser(null);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/?room=${currentRoomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800 sea-grid">
      
      {/* Navigation bar */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        currentRoomId={currentRoomId}
        onLeaveRoom={currentRoomId ? handleLeaveRoom : null}
      />

      {/* Global Error Banner */}
      {errorNotice && (
        <div className="max-w-xl mx-auto mt-4 px-4 py-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice('')}
            className="text-slate-500 hover:text-slate-800 text-xs underline ml-3"
          >
            Zamknij
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center py-4">
        {!gameState ? (
          <LobbyView
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            user={user}
            socket={socket}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          />
        ) : gameState.status === 'waiting' ? (
          // Waiting for second player to join
          <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-white border-2 border-slate-200 rounded-3xl shadow-lg text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-5">
              <Users className="w-8 h-8 animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold font-chakra text-slate-900 mb-2">
              Oczekiwanie na Drugiego Gracza
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Wyślij poniższy link znajomemu, aby rozpocząć wspólną bitwę:
            </p>

            <div className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-300 rounded-xl mb-6">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/?room=${currentRoomId}`}
                className="flex-1 bg-transparent text-xs text-blue-800 font-mono font-semibold px-2 outline-none select-all"
              />
              <button
                onClick={copyRoomLink}
                className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shrink-0 shadow-xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Skopiowano!' : 'Kopiuj'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Czekam na połączenie rywala...</span>
            </div>
          </div>
        ) : gameState.status === 'placement' ? (
          // Ship placement phase
          gameState.me?.ready ? (
            <div className="w-full max-w-md mx-auto p-8 bg-white border-2 border-emerald-400 rounded-3xl text-center shadow-lg">
              <Check className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold font-chakra text-slate-900 mb-2">Twoja Flota jest Gotowa!</h2>
              <p className="text-xs sm:text-sm text-slate-600 mb-6">
                Czekamy, aż przeciwnik ({gameState.enemy?.name || 'drugi gracz'}) zakończy rozstawianie swoich jednostek...
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600 font-mono font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Przygotowanie do ostrzału...</span>
              </div>
            </div>
          ) : (
            <PlacementBoard
              onReady={handleSetShips}
              isBotGame={gameState.isBotGame}
            />
          )
        ) : (
          // Battle phase (playing or finished)
          <GameView
            gameState={gameState}
            onFireShot={handleFireShot}
            onSendChat={handleSendChat}
            onRematch={handleRematch}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/90 py-4 text-center text-xs text-slate-500">
        <p>Statki Online • Oparte na mechanice battleship-game.org • Rozmiar 10×10 (A-J, 1-10)</p>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

    </div>
  );
}
