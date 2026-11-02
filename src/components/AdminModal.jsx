import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  Settings,
  Activity,
  Trash2,
  RotateCcw,
  Ban,
  CheckCircle,
  Plus,
  X,
  AlertTriangle,
  Crown
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function AdminModal({ isOpen, onClose, token }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'dictionary' | 'settings' | 'overview'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [presets, setPresets] = useState([]);
  const [newPresetText, setNewPresetText] = useState('');
  const [systemSettings, setSystemSettings] = useState({
    maintenance_mode: 'false',
    announcement: '',
    chat_free_text_allowed: 'true'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  useEffect(() => {
    if (isOpen && token) {
      loadAllAdminData();
    }
  }, [isOpen, token]);

  const showFeedback = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, presetsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/chat-presets', { headers }),
        fetch('/api/admin/settings', { headers })
      ]);

      if (statsRes.ok) setStats((await statsRes.json()));
      if (usersRes.ok) setUsers((await usersRes.json()).users || []);
      if (presetsRes.ok) setPresets((await presetsRes.json()).presets || []);
      if (settingsRes.ok) setSystemSettings((await settingsRes.json()).settings || {});
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // User actions
  const handleToggleBan = async (user) => {
    sounds.playClick();
    const action = user.is_banned ? 'odblokować' : 'zablokować (zbanować)';
    if (!window.confirm(`Czy na pewno chcesz ${action} użytkownika ${user.username}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isBanned: !user.is_banned })
      });
      if (res.ok) {
        showFeedback(`Zmieniono status blokady dla ${user.username}`);
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRole = async (user) => {
    sounds.playClick();
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Zmienić rolę dla ${user.username} na: ${nextRole}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: nextRole })
      });
      if (res.ok) {
        showFeedback(`Zaktualizowano rolę dla ${user.username}`);
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetStats = async (user) => {
    sounds.playClick();
    if (!window.confirm(`Zresetować punkty i statystyki dla gracza ${user.username}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-stats`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        showFeedback(`Zresetowano statystyki dla ${user.username}`);
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (user) => {
    sounds.playClick();
    if (!window.confirm(`UWAGA: Usunąć bezpowrotnie konto ${user.username}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        showFeedback(`Usunięto użytkownika ${user.username}`);
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Chat dictionary actions
  const handleAddPreset = async (e) => {
    e.preventDefault();
    if (!newPresetText.trim()) return;

    try {
      const res = await fetch('/api/admin/chat-presets', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: newPresetText.trim() })
      });
      if (res.ok) {
        setNewPresetText('');
        showFeedback('Dodano nową szybką wiadomość do słownika czatu!');
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePreset = async (id) => {
    sounds.playClick();
    try {
      const res = await fetch(`/api/admin/chat-presets/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        showFeedback('Usunięto frazę ze słownika');
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // System settings actions
  const handleSaveSetting = async (key, val) => {
    sounds.playClick();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, value: String(val) })
      });
      if (res.ok) {
        setSystemSettings(prev => ({ ...prev, [key]: String(val) }));
        showFeedback(`Zapisano ustawienie: ${key}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-chakra font-bold tracking-wide">Centrum Dowodzenia Administratora</h2>
                <span className="text-[10px] bg-amber-500/30 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-300">Zarządzanie graczami, słownikiem czatu bitewnego i parametrami gry</p>
            </div>
          </div>

          <button
            onClick={() => { sounds.playClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {message && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2 text-xs flex items-center space-x-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Tabs navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto">
          {[
            { id: 'users', label: 'Użytkownicy', icon: Users, count: users.length },
            { id: 'dictionary', label: 'Słownik Czatu Bitewnego', icon: MessageSquare, count: presets.length },
            { id: 'settings', label: 'Ustawienia Globalne & Komunikaty', icon: Settings },
            { id: 'overview', label: 'Statystyki Serwera', icon: Activity }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { sounds.playClick(); setActiveTab(tab.id); }}
                className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isSel
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSel ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content area */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          
          {/* TAB 1: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Lista zarejestrowanych graczy w bazie Supabase. Możesz zarządzać rolami, blokować konta oraz resetować wyniki.</span>
                <button
                  onClick={loadAllAdminData}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Odśwież listę
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Gracz</th>
                      <th className="py-2.5 px-3">Rola</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Statystyki (W / L)</th>
                      <th className="py-2.5 px-3 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center space-x-2">
                          <span>{u.username}</span>
                          {u.username.toLowerCase() === 'dominika' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">Główny Admin</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {u.is_banned ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                              ZBANOWANY
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                              AKTYWNY
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          <div>
                            <span className="text-emerald-600 font-bold">{u.wins} W</span> / <span className="text-rose-600">{u.losses} P</span> <span className="text-[10px] text-slate-400 font-sans">(PvP)</span>
                          </div>
                          {(u.bot_wins > 0 || u.bot_losses > 0) && (
                            <div className="text-[10px] text-purple-700">
                              Bot: {u.bot_wins || 0}W / {u.bot_losses || 0}P
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1">
                          <button
                            onClick={() => handleToggleRole(u)}
                            title="Zmień rolę (Admin/Gracz)"
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 transition"
                          >
                            Rola
                          </button>
                          <button
                            onClick={() => handleToggleBan(u)}
                            title={u.is_banned ? 'Odblokuj' : 'Zablokuj'}
                            className={`p-1 rounded transition ${
                              u.is_banned ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleResetStats(u)}
                            title="Zresetuj statystyki"
                            className="p-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5 inline" />
                          </button>
                          {u.username.toLowerCase() !== 'dominika' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Usuń konto"
                              className="p-1 rounded bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DICTIONARY / CHAT PRESETS */}
          {activeTab === 'dictionary' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed">
                <strong>Słownik szybkich wiadomości:</strong> Gracze podczas bitwy mogą jednym kliknięciem wysyłać gotowe kwestie (np. <em>"Pudło! 😜"</em>, <em>"Gramy rewanż?"</em>). Tutaj możesz dodawać nowe zwroty lub usuwać nieodpowiednie.
              </div>

              {/* Add form */}
              <form onSubmit={handleAddPreset} className="flex gap-2">
                <input
                  type="text"
                  value={newPresetText}
                  onChange={(e) => setNewPresetText(e.target.value)}
                  placeholder="Wpisz nową gotową wiadomość, np. 'Ale fart!'..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={100}
                />
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dodaj frazę</span>
                </button>
              </form>

              {/* Presets grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {presets.map(p => (
                  <div
                    key={p.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs shadow-2xs hover:border-slate-300 transition"
                  >
                    <span className="font-medium text-slate-800">💬 "{p.text}"</span>
                    <button
                      onClick={() => handleDeletePreset(p.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                      title="Usuń ze słownika"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              
              {/* Free chat vs dictionary-only chat toggle */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                    Tryb czatu: Słownik czy Wolny tekst?
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Gdy wyłączysz wolny tekst, gracze będą mogli porozumiewać się <strong>wyłącznie frazami ze słownika</strong> (brak wulgaryzmów i spamu).
                  </div>
                </div>
                <button
                  onClick={() => handleSaveSetting('chat_free_text_allowed', systemSettings.chat_free_text_allowed === 'true' ? 'false' : 'true')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                    systemSettings.chat_free_text_allowed === 'true'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {systemSettings.chat_free_text_allowed === 'true' ? 'Dowolny tekst (WŁĄCZONY)' : 'Tylko Słownik (BEZPIECZNY)'}
                </button>
              </div>

              {/* Toggles for Modifiers / Addons */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                <div>
                  <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                    Dostępność Modułów & Dodatków Rozgrywki
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Włącz lub wyłącz poszczególne urozmaicenia gry dla wszystkich użytkowników serwera.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    { key: 'mod_mines_enabled', label: '💣 Miny Morskie', desc: 'Trafienie w minę zabiera kolejkę' },
                    { key: 'mod_recon_enabled', label: '🛩️ Zwiad Lotniczy', desc: 'Skan radaru kwadratu 3x3' },
                    { key: 'mod_sonar_enabled', label: '📡 Impuls Sonaru', desc: 'Echo akustyczne wiersza lub kolumny' },
                    { key: 'mod_salvo_enabled', label: '⚡ Podwójna Salwa Flagowca', desc: '2 strzały gdy okręt flagowy cały' }
                  ].map(mod => {
                    const isEnabled = systemSettings[mod.key] !== 'false';
                    return (
                      <div
                        key={mod.key}
                        onClick={() => handleSaveSetting(mod.key, isEnabled ? 'false' : 'true')}
                        className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                          isEnabled
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-slate-100 border-slate-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{mod.label}</div>
                          <div className="text-[10px] text-slate-500">{mod.desc}</div>
                        </div>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                          isEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                        }`}>
                          {isEnabled ? 'WŁĄCZONY' : 'WYŁĄCZONY'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Max mines in game */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                    Liczba Min Morskich na gracza
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Maksymalna ilość min generowana na gracza przy włączonym modyfikatorze min.
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => handleSaveSetting('max_mines', cnt)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                        String(systemSettings.max_mines || '2') === String(cnt)
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Maintenance mode toggle */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <div className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Tryb prac technicznych (Maintenance Mode)</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Blokuje tworzenie nowych gier dla zwykłych graczy.
                  </div>
                </div>
                <button
                  onClick={() => handleSaveSetting('maintenance_mode', systemSettings.maintenance_mode === 'true' ? 'false' : 'true')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                    systemSettings.maintenance_mode === 'true'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {systemSettings.maintenance_mode === 'true' ? 'WŁĄCZONY' : 'WYŁĄCZONY'}
                </button>
              </div>

              {/* Global announcement banner */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs">
                <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                  Komunikat globalny (Ogłoszenie w Lobby)
                </div>
                <div className="text-xs text-slate-500">
                  Wpisz wiadomość, która wyświetli się wszystkim graczom na samej górze ekranu.
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={systemSettings.announcement || ''}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, announcement: e.target.value }))}
                    placeholder="Np. Turniej w ten weekend o 18:00! Zapraszamy!"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => handleSaveSetting('announcement', systemSettings.announcement)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-xs"
                  >
                    Opublikuj
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: OVERVIEW / STATS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-center">
                  <div className="text-2xl font-bold font-chakra text-indigo-700">{stats?.stats?.usersCount || 0}</div>
                  <div className="text-[11px] text-slate-600 font-medium">Zarejestrowani Gracze</div>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <div className="text-2xl font-bold font-chakra text-emerald-700">{stats?.stats?.matchesCount || 0}</div>
                  <div className="text-[11px] text-slate-600 font-medium">Rozegrane Mecze</div>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-center">
                  <div className="text-2xl font-bold font-chakra text-purple-700">{stats?.activeRoomsCount || 0}</div>
                  <div className="text-[11px] text-slate-600 font-medium">Aktywne Pokoje Na Żywo</div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                  <div className="text-2xl font-bold font-chakra text-amber-700">{stats?.stats?.presetsCount || 0}</div>
                  <div className="text-[11px] text-slate-600 font-medium">Frazy w Słowniku</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-800">Propozycje dodatkowych narzędzi dla Administratora:</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Podgląd gier na żywo (Spectator Mode):</strong> Możliwość wejścia do aktywnego pokoju i obserwacji bitwy bez ingerencji w planszę.</li>
                  <li><strong>Dziennik zdarzeń (Audit Log):</strong> Kto i kiedy dokonał jakiej zmiany w panelu admina.</li>
                  <li><strong>Zarządzanie turniejami:</strong> Automatyczne drabinki pucharowe dla zapisanych graczy.</li>
                  <li><strong>Filtr zakazanych słów (Blacklist):</strong> Automatyczna gwiazdkowa cenzura niedozwolonych wyrazów na czacie.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>Zalogowano jako Administrator: <strong className="text-indigo-900">Dominika</strong></div>
          <button
            onClick={() => { sounds.playClick(); onClose(); }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition"
          >
            Zamknij panel
          </button>
        </div>

      </div>
    </div>
  );
}
