import React, { useState, useEffect } from 'react';
import { X, Trophy, Calendar, Award, Flame, RefreshCw } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function LeaderboardModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('daily'); // 'daily' or 'all-time'
  const [dailyData, setDailyData] = useState([]);
  const [allTimeData, setAllTimeData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboards();
    }
  }, [isOpen, selectedDate]);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const [resDaily, resAllTime] = await Promise.all([
        fetch(`/api/leaderboard/daily?date=${selectedDate}`),
        fetch('/api/leaderboard/all-time')
      ]);

      const dataDaily = await resDaily.json();
      const dataAllTime = await resAllTime.json();

      setDailyData(dataDaily.leaderboard || []);
      setAllTimeData(dataAllTime.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-800 flex flex-col max-h-[88vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-chakra text-slate-900 tracking-wide">
              Hala Sław Floty
            </h2>
            <p className="text-xs text-slate-500">
              Sprawdź najlepszych graczy dnia oraz ranking wszech czasów
            </p>
          </div>
        </div>

        {/* Tab Controls & Date picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => { setTab('daily'); sounds.playClick(); }}
              className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                tab === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Ranking Dzienny</span>
            </button>
            <button
              onClick={() => { setTab('all-time'); sounds.playClick(); }}
              className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                tab === 'all-time'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Ranking Ogólny</span>
            </button>
          </div>

          {tab === 'daily' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600">Dzień:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={fetchLeaderboards}
                className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition"
                title="Odśwież"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 text-slate-700 font-mono uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3">Kapitan</th>
                {tab === 'daily' ? (
                  <>
                    <th className="py-2.5 px-3 text-center">Wygrane Dziś</th>
                    <th className="py-2.5 px-3 text-center">Rozegrane</th>
                    <th className="py-2.5 px-3 text-right">Win Rate</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3 text-center">Wygrane</th>
                    <th className="py-2.5 px-3 text-center">Porażki</th>
                    <th className="py-2.5 px-3 text-right">Skuteczność</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
                    Ładowanie rankingu...
                  </td>
                </tr>
              ) : (tab === 'daily' ? dailyData : allTimeData).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Brak rozegranych bitew w wybranym dniu. Wygraj pierwszą bitwę, aby zająć 1. miejsce!
                  </td>
                </tr>
              ) : (
                (tab === 'daily' ? dailyData : allTimeData).map((row, index) => {
                  const isGold = index === 0;
                  const isSilver = index === 1;
                  const isBronze = index === 2;

                  return (
                    <tr
                      key={row.userId || row.username + index}
                      className={`hover:bg-slate-50 transition ${
                        isGold ? 'bg-amber-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono">
                        {isGold ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-bold">1</span>
                        ) : isSilver ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold">2</span>
                        ) : isBronze ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-bold">3</span>
                        ) : (
                          <span className="text-slate-500">{index + 1}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        <div className="flex items-center space-x-1.5">
                          {isGold && <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                          <span className="truncate max-w-[160px] font-medium">{row.username}</span>
                        </div>
                      </td>
                      {tab === 'daily' ? (
                        <>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">
                            {row.wins}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {row.games}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-semibold">
                            {row.winRate}%
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">
                            {row.wins}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-rose-600">
                            {row.losses}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-semibold">
                            {row.win_rate}%
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Rankingi aktualizowane natychmiast po każdej wygranej bitwie.</span>
          <button onClick={onClose} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition font-medium">
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
}
