import React, { useState, useEffect } from 'react';
import {
  LETTERS,
  NUMBERS,
  REQUIRED_FLEET,
  FLEET_COLORS,
  getFleetStyle,
  canPlaceShip,
  generateRandomFleet,
  buildGridFromShips
} from '../utils/rules';
import { Shuffle, Trash2, RotateCw, CheckCircle2, ShieldAlert, Palette, Check } from 'lucide-react';
import { sounds } from '../utils/audio';

export default function PlacementBoard({ onReady, isBotGame }) {
  const [placedShips, setPlacedShips] = useState([]);
  const [selectedDockShip, setSelectedDockShip] = useState(null); // { size, name, id }
  const [isVertical, setIsVertical] = useState(false);
  const [hoverCoord, setHoverCoord] = useState(null); // { r, c }
  const [errorMessage, setErrorMessage] = useState('');
  const [customColor, setCustomColor] = useState('#2563eb'); // Default hex color

  const fleetStyle = getFleetStyle(customColor);

  // Initial random placement
  useEffect(() => {
    handleRandomize();
  }, []);

  const grid = buildGridFromShips(placedShips);

  // Compute remaining ships in dock
  const placedCounts = { 4: 0, 3: 0, 2: 0, 1: 0 };
  placedShips.forEach(s => {
    placedCounts[s.size] = (placedCounts[s.size] || 0) + 1;
  });

  const dockFleet = REQUIRED_FLEET.map(def => ({
    ...def,
    remaining: def.count - (placedCounts[def.size] || 0)
  }));

  const totalRemaining = dockFleet.reduce((acc, curr) => acc + curr.remaining, 0);

  const handleRandomize = () => {
    sounds.playClick();
    const newFleet = generateRandomFleet();
    setPlacedShips(newFleet);
    setSelectedDockShip(null);
    setErrorMessage('');
  };

  const handleClear = () => {
    sounds.playClick();
    setPlacedShips([]);
    setSelectedDockShip(null);
    setErrorMessage('');
  };

  const handleToggleRotate = () => {
    sounds.playClick();
    setIsVertical(prev => !prev);
  };

  // Keyboard shortcut 'R' to rotate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        setIsVertical(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCellClick = (r, c) => {
    sounds.playClick();

    // If clicked on an existing ship -> remove it to dock
    const clickedShipId = grid[r][c];
    if (clickedShipId) {
      setPlacedShips(prev => prev.filter(s => s.id !== clickedShipId));
      setErrorMessage('');
      return;
    }

    // If placing a selected ship from dock
    if (selectedDockShip) {
      if (selectedDockShip.remaining <= 0) return;

      const valid = canPlaceShip(grid, r, c, selectedDockShip.size, isVertical);
      if (!valid) {
        setErrorMessage('Nieprawidłowe położenie! Statki nie mogą się ze sobą stykać ani bokami, ani rogami.');
        return;
      }

      const shipId = `ship_${selectedDockShip.size}_${Date.now()}_${Math.random()}`;
      const cells = [];
      for (let i = 0; i < selectedDockShip.size; i++) {
        cells.push({
          r: isVertical ? r + i : r,
          c: isVertical ? c : c + i,
          hit: false
        });
      }

      const newShip = {
        id: shipId,
        name: selectedDockShip.name,
        size: selectedDockShip.size,
        isVertical,
        cells,
        sunk: false
      };

      setPlacedShips(prev => [...prev, newShip]);
      setErrorMessage('');

      if (selectedDockShip.remaining - 1 <= 0) {
        const nextAvail = dockFleet.find(d => d.size !== selectedDockShip.size && d.remaining > 0);
        setSelectedDockShip(nextAvail || null);
      }
    }
  };

  // Check validity for hover preview
  const isHoverValid = hoverCoord && selectedDockShip
    ? canPlaceShip(grid, hoverCoord.r, hoverCoord.c, selectedDockShip.size, isVertical)
    : false;

  const hoverCells = [];
  if (hoverCoord && selectedDockShip) {
    for (let i = 0; i < selectedDockShip.size; i++) {
      hoverCells.push({
        r: isVertical ? hoverCoord.r + i : hoverCoord.r,
        c: isVertical ? hoverCoord.c : hoverCoord.c + i
      });
    }
  }

  const handleReadyClick = () => {
    if (totalRemaining > 0) {
      setErrorMessage(`Musisz rozstawić wszystkie 10 statków! Zostało jeszcze: ${totalRemaining}.`);
      return;
    }
    sounds.playClick();
    onReady(placedShips, customColor);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 flex flex-col items-center">
      
      {/* Title & Instructions */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold font-chakra text-slate-900 tracking-wide">
          Rozmieść Swoją Flotę
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl mx-auto">
          Rozstaw 10 statków na planszy. Pomiędzy statkami zachowaj <strong>minimum 1 kratkę przerwy</strong>.
          Wybierz dowolny kolor floty z koła barw lub gotowych odcieni!
        </p>

        {/* Fleet Color Wheel & Preset Picker */}
        <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
          
          {/* Label */}
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
            <Palette className="w-4 h-4 text-blue-600" />
            <span>Kolor floty:</span>
          </div>

          {/* Color Wheel Trigger */}
          <div className="relative flex items-center">
            <label
              htmlFor="color-wheel-input"
              className="cursor-pointer group flex items-center space-x-2 px-2.5 py-1 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-white transition shadow-2xs"
              title="Kliknij, aby otworzyć koło barw"
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center shrink-0"
                style={{
                  background: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)'
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full border border-white"
                  style={{ backgroundColor: customColor }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">
                Koło barw ({customColor.toUpperCase()})
              </span>
            </label>
            <input
              id="color-wheel-input"
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>

          {/* Quick presets */}
          <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-3">
            {FLEET_COLORS.map(color => {
              const isSelected = customColor.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.id}
                  onClick={() => { sounds.playClick(); setCustomColor(color.hex); }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-xs' : 'opacity-85 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {errorMessage && (
        <div className="mb-4 px-4 py-2 bg-rose-50 border border-rose-300 rounded-lg text-rose-700 text-xs flex items-center space-x-2 animate-bounce shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: 10x10 Board with Mathematically Perfect Grid Alignment */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          <div className="inline-block p-4 bg-white border-2 border-slate-300 rounded-2xl shadow-md">
            
            {/* Unified 11x11 CSS Grid: Header letters and row cells share the exact same grid columns */}
            <div className="grid grid-cols-[28px_repeat(10,32px)] sm:grid-cols-[32px_repeat(10,36px)] gap-1 items-center">
              
              {/* Row 0: Top left empty corner */}
              <div className="w-7 sm:w-8 h-6 sm:h-7"></div>

              {/* Row 0: 10 Header letters A-J */}
              {LETTERS.map(letter => (
                <div
                  key={letter}
                  className="w-8 sm:w-9 h-6 sm:h-7 flex items-center justify-center text-slate-700 font-mono text-xs sm:text-sm font-bold select-none"
                >
                  {letter}
                </div>
              ))}

              {/* Rows 1-10: Number label on left + 10 interactive cells */}
              {NUMBERS.map((num, rIdx) => (
                <React.Fragment key={num}>
                  {/* Left row number */}
                  <div className="w-7 sm:w-8 h-8 sm:h-9 flex items-center justify-end pr-2 text-slate-700 font-mono text-xs sm:text-sm font-bold select-none">
                    {num}
                  </div>

                  {/* 10 cells in this row */}
                  {LETTERS.map((_, cIdx) => {
                    const shipId = grid[rIdx][cIdx];
                    const isOccupied = Boolean(shipId);
                    const isPreview = hoverCells.some(h => h.r === rIdx && h.c === cIdx);

                    let cellClass = 'bg-slate-50 border-slate-300 hover:bg-slate-100 hover:border-slate-400';
                    let inlineStyle = {};

                    if (isOccupied) {
                      cellClass = 'border-transparent text-white shadow-2xs';
                      inlineStyle = fleetStyle.style;
                    } else if (isPreview) {
                      cellClass = isHoverValid
                        ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400'
                        : 'bg-rose-100 border-rose-500 ring-2 ring-rose-400';
                    }

                    return (
                      <button
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => handleCellClick(rIdx, cIdx)}
                        onMouseEnter={() => setHoverCoord({ r: rIdx, c: cIdx })}
                        onMouseLeave={() => setHoverCoord(null)}
                        style={inlineStyle}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md border flex items-center justify-center transition-all duration-150 ${cellClass}`}
                      >
                        {isOccupied && (
                          <div className="w-2 h-2 rounded-full bg-white/80"></div>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}

            </div>

          </div>

          {/* Quick controls beneath board */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            <button
              onClick={handleRandomize}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-blue-700 border border-slate-300 text-xs font-semibold shadow-xs transition"
            >
              <Shuffle className="w-4 h-4 text-blue-600" />
              <span>Rozmieść losowo</span>
            </button>

            <button
              onClick={handleToggleRotate}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition"
            >
              <RotateCw className={`w-4 h-4 text-amber-600 transition-transform ${isVertical ? 'rotate-90' : ''}`} />
              <span>Obróć (Klawisz R): {isVertical ? 'Pionowo' : 'Poziomo'}</span>
            </button>

            <button
              onClick={handleClear}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-300 text-xs font-semibold shadow-xs transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wyczyść</span>
            </button>
          </div>

        </div>

        {/* Right: Dock & Ship selection */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          
          <h3 className="text-lg font-bold font-chakra text-slate-900 mb-2 flex items-center justify-between">
            <span>Doki Floty</span>
            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 font-bold">
              {10 - totalRemaining}/10 rozstawione
            </span>
          </h3>

          <p className="text-xs text-slate-500 mb-4">
            Kliknij statek z doku, a następnie kliknij pole na planszy. Kliknięcie postawionego statku usuwa go do doku.
          </p>

          {/* Ships List */}
          <div className="space-y-2.5">
            {dockFleet.map((ship) => {
              const isSelected = selectedDockShip?.size === ship.size;
              const isDone = ship.remaining === 0;

              return (
                <div
                  key={ship.size}
                  onClick={() => {
                    if (!isDone) {
                      sounds.playClick();
                      setSelectedDockShip(ship);
                      setErrorMessage('');
                    }
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400/40 shadow-xs'
                      : isDone
                      ? 'bg-slate-50 border-slate-200 opacity-50 cursor-default'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Ship Preview Blocks in dynamic custom color */}
                    <div className="flex space-x-1">
                      {Array.from({ length: ship.size }).map((_, i) => (
                        <div
                          key={i}
                          style={!isDone ? fleetStyle.style : {}}
                          className={`w-6 h-6 rounded border flex items-center justify-center ${
                            isDone
                              ? 'bg-slate-200 border-slate-300'
                              : 'shadow-2xs'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white/70"></div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {ship.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {ship.size} {ship.size === 1 ? 'kratka' : 'kratki'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      isDone ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-700'
                    }`}>
                      Pozostało: {ship.remaining} / {ship.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ready Button */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <button
              onClick={handleReadyClick}
              disabled={totalRemaining > 0}
              className={`w-full py-3 px-4 rounded-xl font-bold font-chakra text-sm sm:text-base flex items-center justify-center space-x-2 transition shadow-md ${
                totalRemaining === 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 cursor-pointer animate-pulse'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {totalRemaining === 0
                  ? 'Gotowy do bitwy! (Rozpocznij walkę)'
                  : `Rozmieść jeszcze ${totalRemaining} ${totalRemaining === 1 ? 'statek' : 'statki'}`}
              </span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
