import React, { useState, useEffect } from 'react';
import {
  getLetters,
  getNumbers,
  getRequiredFleet,
  FLEET_COLORS,
  getFleetStyle,
  canPlaceShip,
  getShipRelativeCells,
  generateRandomFleet,
  buildGridFromShips
} from '../utils/rules';
import {
  Shuffle,
  Trash2,
  RotateCw,
  CheckCircle2,
  ShieldAlert,
  Palette,
  Check,
  Layers,
  Move,
  Bomb
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function PlacementBoard({ onReady, isBotGame, boardSize = 10, options = {} }) {
  const [placedShips, setPlacedShips] = useState([]);
  const [placedMines, setPlacedMines] = useState([]);
  const [mineMode, setMineMode] = useState(false);
  const [selectedDockShip, setSelectedDockShip] = useState(null); // Dock ship OR dragged ship
  const [isVertical, setIsVertical] = useState(false);
  const [hoverCoord, setHoverCoord] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [customColor, setCustomColor] = useState('#2563eb');

  // Mines are enabled if options.mines is true OR if options.mines is undefined (default enabled)
  const minesEnabled = options.mines !== false;
  const maxMines = minesEnabled ? (Number(options.minesCount) || 2) : 0;

  // Drag-and-drop state
  const [draggedShip, setDraggedShip] = useState(null);
  const [draggedMine, setDraggedMine] = useState(false); // dragging mine from dock or board

  const fleetStyle = getFleetStyle(customColor);
  const letters = getLetters(boardSize);
  const numbers = getNumbers(boardSize);
  const requiredFleet = getRequiredFleet(boardSize);

  // Initial random placement
  useEffect(() => {
    handleRandomize();
  }, [boardSize]);

  const grid = buildGridFromShips(placedShips, boardSize);

  // Compute remaining ships in dock
  const placedMap = {};
  placedShips.forEach(s => {
    const key = `${s.size}_${s.shape || 'line'}`;
    placedMap[key] = (placedMap[key] || 0) + 1;
  });

  const dockFleet = requiredFleet.map(def => {
    const key = `${def.size}_${def.shape || 'line'}`;
    const placed = placedMap[key] || 0;
    return {
      ...def,
      remaining: def.count - placed
    };
  });

  const totalRequired = requiredFleet.reduce((acc, curr) => acc + curr.count, 0);
  const totalRemaining = dockFleet.reduce((acc, curr) => acc + curr.remaining, 0);

  const handleRandomize = () => {
    sounds.playClick();
    const newFleet = generateRandomFleet(boardSize);
    setPlacedShips(newFleet);
    setSelectedDockShip(null);
    setDraggedShip(null);
    setErrorMessage('');

    // If mines enabled, generate random mines in empty water
    if (maxMines > 0) {
      const occupied = new Set();
      newFleet.forEach(s => s.cells.forEach(c => occupied.add(`${c.r},${c.c}`)));
      const randomMines = [];
      let attempts = 0;
      while (randomMines.length < maxMines && attempts < 500) {
        attempts++;
        const r = Math.floor(Math.random() * boardSize);
        const c = Math.floor(Math.random() * boardSize);
        const key = `${r},${c}`;
        if (!occupied.has(key) && !randomMines.some(m => m.r === r && m.c === c)) {
          randomMines.push({ r, c });
          occupied.add(key);
        }
      }
      setPlacedMines(randomMines);
    } else {
      setPlacedMines([]);
    }
  };

  const handleClear = () => {
    sounds.playClick();
    setPlacedShips([]);
    setPlacedMines([]);
    setSelectedDockShip(null);
    setDraggedShip(null);
    setErrorMessage('');
  };

  const handleToggleRotate = () => {
    sounds.playClick();
    setIsVertical(prev => !prev);
  };

  // Keyboard shortcut 'R' and Mouse Wheel to rotate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        setIsVertical(prev => !prev);
      }
    };

    const handleWheel = (e) => {
      if (hoverCoord || selectedDockShip || draggedShip) {
        e.preventDefault();
        setIsVertical(prev => !prev);
        sounds.playClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [hoverCoord, selectedDockShip, draggedShip]);

  // Active moving ship (either dragged from board or selected from dock)
  const activeShipSpec = draggedShip || selectedDockShip;

  // Click on board cell
  const handleCellClick = (r, c) => {
    sounds.playClick();

    // Helper: is this cell occupied by any ship?
    const isOccupiedByShip = placedShips.some(s => s.cells.some(cell => cell.r === r && cell.c === c));

    // If in Mine Placement mode
    if (mineMode && maxMines > 0) {
      // Check if clicked cell has a mine already -> remove it
      const existingMineIdx = placedMines.findIndex(m => m.r === r && m.c === c);
      if (existingMineIdx !== -1) {
        setPlacedMines(prev => prev.filter((_, idx) => idx !== existingMineIdx));
        setErrorMessage('');
        return;
      }

      // Check if cell is occupied by a ship
      if (isOccupiedByShip) {
        setErrorMessage('Mina morska musi znajdować się w wolnej wodzie (nie na statku)!');
        return;
      }

      // Check max limit
      if (placedMines.length >= maxMines) {
        setErrorMessage(`Rozstawiłeś już maksymalną liczbę min (${maxMines})! Kliknij na postawioną minę, by ją usunąć.`);
        return;
      }

      setPlacedMines(prev => [...prev, { r, c }]);
      setErrorMessage('');
      return;
    }

    // Check if clicked on a placed mine -> pickup or remove mine
    const clickedMineIdx = placedMines.findIndex(m => m.r === r && m.c === c);
    if (clickedMineIdx !== -1 && !activeShipSpec) {
      setPlacedMines(prev => prev.filter((_, idx) => idx !== clickedMineIdx));
      setErrorMessage('Usunąłeś minę z planszy (zwrócona do paska doków).');
      return;
    }

    const clickedShipId = grid[r][c];

    // If we have an active ship to place
    if (activeShipSpec) {
      const valid = canPlaceShip(
        grid,
        r,
        c,
        activeShipSpec.size,
        isVertical,
        activeShipSpec.shape || 'line',
        boardSize,
        draggedShip ? draggedShip.id : null
      );

      if (!valid) {
        setErrorMessage('Nieprawidłowe położenie! Statki nie mogą się ze sobą stykać ani bokami, ani rogami.');
        return;
      }

      // If moving existing placed ship -> remove old position first
      let updatedShips = placedShips;
      if (draggedShip) {
        updatedShips = placedShips.filter(s => s.id !== draggedShip.id);
      }

      const shipId = draggedShip ? draggedShip.id : `ship_${activeShipSpec.size}_${Date.now()}`;
      const relCells = getShipRelativeCells(activeShipSpec.size, isVertical, activeShipSpec.shape || 'line');
      const cells = relCells.map(rc => ({
        r: r + rc.dr,
        c: c + rc.dc,
        hit: false
      }));

      const newShip = {
        id: shipId,
        name: activeShipSpec.name,
        size: activeShipSpec.size,
        shape: activeShipSpec.shape || 'line',
        isVertical,
        cells,
        sunk: false
      };

      setPlacedShips([...updatedShips, newShip]);
      setDraggedShip(null);
      setErrorMessage('');

      // Auto select next dock ship if coming from dock
      if (!draggedShip && selectedDockShip.remaining - 1 <= 0) {
        const nextAvail = dockFleet.find(d => (d.size !== selectedDockShip.size || d.shape !== selectedDockShip.shape) && d.remaining > 0);
        setSelectedDockShip(nextAvail || null);
      }
      return;
    }

    // If clicked on existing ship with NO active ship -> pickup/drag this ship!
    if (clickedShipId) {
      const existing = placedShips.find(s => s.id === clickedShipId);
      if (existing) {
        setDraggedShip(existing);
        setIsVertical(existing.isVertical);
        setSelectedDockShip(null);
        setErrorMessage('Podniosłeś statek! Kliknij nowe pole lub obróć kółkiem myszy.');
      }
    }
  };

  // Drag and drop HTML5 handlers for board ships & mines
  const handleDragStartFromBoard = (e, ship) => {
    e.dataTransfer.setData('text/plain', ship.id);
    setDraggedShip(ship);
    setIsVertical(ship.isVertical);
    setSelectedDockShip(null);
    setDraggedMine(false);
  };

  const handleDragStartFromDock = (e, ship) => {
    e.dataTransfer.setData('text/plain', `dock_${ship.size}_${ship.shape || 'line'}`);
    setSelectedDockShip(ship);
    setDraggedShip(null);
    setDraggedMine(false);
  };

  const handleDragStartMineFromDock = (e) => {
    e.dataTransfer.setData('text/plain', 'dock_mine');
    setDraggedMine({ fromBoard: false });
    setSelectedDockShip(null);
    setDraggedShip(null);
  };

  const handleDragStartMineFromBoard = (e, r, c) => {
    e.dataTransfer.setData('text/plain', `board_mine_${r}_${c}`);
    setDraggedMine({ fromBoard: true, r, c });
    setSelectedDockShip(null);
    setDraggedShip(null);
  };

  const handleDrop = (e, r, c) => {
    e.preventDefault();

    // Check if dragging a mine
    if (draggedMine) {
      sounds.playClick();
      // Cannot place mine on top of a ship
      const isOccupiedByShip = placedShips.some(s => s.cells.some(cell => cell.r === r && cell.c === c));
      if (isOccupiedByShip) {
        setErrorMessage('Mina morska musi znajdować się w wolnej wodzie (nie na statku)!');
        setDraggedMine(null);
        return;
      }

      let newMines = placedMines;
      if (draggedMine.fromBoard) {
        // remove old mine position
        newMines = placedMines.filter(m => !(m.r === draggedMine.r && m.c === draggedMine.c));
      }

      // Check if new position already has mine
      if (newMines.some(m => m.r === r && m.c === c)) {
        setErrorMessage('W tym miejscu już znajduje się mina.');
        setDraggedMine(null);
        return;
      }

      if (newMines.length >= maxMines) {
        setErrorMessage(`Osiągnięto limit min (${maxMines}).`);
        setDraggedMine(null);
        return;
      }

      setPlacedMines([...newMines, { r, c }]);
      setDraggedMine(null);
      setErrorMessage('');
      return;
    }

    handleCellClick(r, c);
  };

  // Check validity for hover preview
  const isHoverValid = hoverCoord && activeShipSpec
    ? canPlaceShip(
        grid,
        hoverCoord.r,
        hoverCoord.c,
        activeShipSpec.size,
        isVertical,
        activeShipSpec.shape || 'line',
        boardSize,
        draggedShip ? draggedShip.id : null
      )
    : false;

  const hoverCells = [];
  if (hoverCoord && activeShipSpec) {
    const relCells = getShipRelativeCells(activeShipSpec.size, isVertical, activeShipSpec.shape || 'line');
    relCells.forEach(rc => {
      hoverCells.push({
        r: hoverCoord.r + rc.dr,
        c: hoverCoord.c + rc.dc
      });
    });
  }

  const handleReadyClick = () => {
    if (totalRemaining > 0) {
      setErrorMessage(`Musisz rozstawić wszystkie statki! Zostało jeszcze: ${totalRemaining}.`);
      return;
    }
    sounds.playClick();
    onReady(placedShips, customColor, placedMines);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col items-center">
      
      {/* Title & Instructions */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-semibold mb-2">
          <Layers className="w-3.5 h-3.5" />
          <span>Plansza {boardSize}×{boardSize} • {totalRequired} Statków</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold font-chakra text-slate-900 tracking-wide">
          Rozmieść Swoją Flotę
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl mx-auto">
          Przeciągaj statki myszką lub kliknij, aby je przenieść w inne miejsce. Obracaj statki <strong>kółkiem myszy (scroll)</strong> lub klawiszem <strong>R</strong>!
        </p>

        {/* Fleet Color Wheel & Preset Picker */}
        <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
            <Palette className="w-4 h-4 text-blue-600" />
            <span>Kolor floty:</span>
          </div>

          <div className="relative flex items-center">
            <label
              htmlFor="color-wheel-input"
              className="cursor-pointer group flex items-center space-x-2 px-2.5 py-1 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-white transition shadow-2xs"
            >
              <div
                className="w-4 h-4 rounded-full border border-white shadow-xs"
                style={{ backgroundColor: customColor }}
              />
              <span className="text-xs font-mono font-bold text-slate-800">
                {customColor.toUpperCase()}
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

          <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
            {FLEET_COLORS.slice(0, 6).map(color => (
              <button
                key={color.id}
                onClick={() => { sounds.playClick(); setCustomColor(color.hex); }}
                className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating alert/instruction when moving a ship */}
      {draggedShip && (
        <div className="mb-3 px-4 py-1.5 bg-indigo-50 border border-indigo-300 rounded-xl text-indigo-900 text-xs flex items-center space-x-2 font-medium shadow-xs animate-pulse">
          <Move className="w-4 h-4 text-indigo-600" />
          <span>Przenosisz: <strong>{draggedShip.name}</strong>. Kliknij na nowe pole planszy lub obróć kółkiem myszy.</span>
        </div>
      )}

      {/* Floating alert/instruction when in mine placement mode */}
      {mineMode && (
        <div className="mb-3 px-4 py-1.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center space-x-2 font-medium shadow-xs animate-pulse">
          <Bomb className="w-4 h-4 text-rose-600" />
          <span>Tryb Min Morskich aktywny: Kliknij w wolną kratkę wodną planszy, aby postawić minę ({placedMines.length}/{maxMines}). Kliknij postawioną minę, by ją usunąć.</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 px-4 py-2 bg-rose-50 border border-rose-300 rounded-lg text-rose-700 text-xs flex items-center space-x-2 animate-bounce shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Dynamic Board */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="inline-block p-3 sm:p-4 bg-white border-2 border-slate-300 rounded-2xl shadow-md overflow-x-auto max-w-full">
            
            <div
              className="grid gap-1 items-center"
              style={{
                gridTemplateColumns: `24px repeat(${boardSize}, minmax(22px, 32px))`
              }}
            >
              <div className="w-6 h-6"></div>

              {letters.map(l => (
                <div key={l} className="h-6 flex items-center justify-center text-slate-700 font-mono text-xs font-bold select-none">
                  {l}
                </div>
              ))}

              {numbers.map((num, rIdx) => (
                <React.Fragment key={num}>
                  <div className="w-6 h-7 sm:h-8 flex items-center justify-end pr-1 text-slate-700 font-mono text-xs font-bold select-none">
                    {num}
                  </div>

                  {letters.map((_, cIdx) => {
                    const shipId = grid[rIdx][cIdx];
                    const shipObj = placedShips.find(s => s.id === shipId);
                    const isOccupied = Boolean(shipId);
                    const isBeingMoved = draggedShip && draggedShip.id === shipId;
                    const isPreview = hoverCells.some(h => h.r === rIdx && h.c === cIdx);
                    const isMineCell = placedMines.some(m => m.r === rIdx && m.c === cIdx);

                    let cellClass = 'bg-slate-50 border-slate-300 hover:bg-slate-100 hover:border-slate-400';
                    let inlineStyle = {};

                    if (isOccupied) {
                      cellClass = isBeingMoved
                        ? 'border-dashed border-indigo-400 opacity-40'
                        : 'border-transparent text-white shadow-2xs cursor-grab active:cursor-grabbing';
                      inlineStyle = fleetStyle.style;
                    } else if (isMineCell) {
                      cellClass = 'bg-rose-50 border-rose-400 text-rose-600 shadow-2xs hover:bg-rose-100';
                    } else if (isPreview) {
                      cellClass = isHoverValid
                        ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400'
                        : 'bg-rose-100 border-rose-500 ring-2 ring-rose-400';
                    } else if (mineMode) {
                      cellClass = 'bg-slate-50 border-slate-300 hover:bg-rose-50 hover:border-rose-400';
                    }

                    return (
                      <button
                        key={`${rIdx}-${cIdx}`}
                        draggable={isOccupied || isMineCell}
                        onDragStart={(e) => {
                          if (isOccupied && shipObj) {
                            handleDragStartFromBoard(e, shipObj);
                          } else if (isMineCell) {
                            handleDragStartMineFromBoard(e, rIdx, cIdx);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!hoverCoord || hoverCoord.r !== rIdx || hoverCoord.c !== cIdx) {
                            setHoverCoord({ r: rIdx, c: cIdx });
                          }
                        }}
                        onDrop={(e) => handleDrop(e, rIdx, cIdx)}
                        onClick={() => handleCellClick(rIdx, cIdx)}
                        onMouseEnter={() => setHoverCoord({ r: rIdx, c: cIdx })}
                        onMouseLeave={() => setHoverCoord(null)}
                        style={inlineStyle}
                        className={`h-7 sm:h-8 rounded-md border flex items-center justify-center transition-all duration-150 cursor-pointer ${cellClass}`}
                        title={
                          isOccupied
                            ? 'Kliknij lub przeciągnij, aby przenieść w inne miejsce'
                            : isMineCell
                            ? 'Mina morska: przeciągnij w inne miejsce lub kliknij, aby usunąć'
                            : mineMode
                            ? 'Kliknij, aby postawić minę'
                            : ''
                        }
                      >
                        {isOccupied && (
                          <div className="w-2 h-2 rounded-full bg-white/80"></div>
                        )}
                        {!isOccupied && isMineCell && (
                          <Bomb className="w-4 h-4 text-rose-600 animate-bounce" />
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}

            </div>

          </div>

          {/* Quick controls beneath board */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              onClick={() => {
                sounds.playClick();
                setMineMode(!mineMode);
                setSelectedDockShip(null);
                setDraggedShip(null);
                setErrorMessage(
                  !mineMode
                    ? `Tryb Min Morskich aktywny! Kliknij wolne pole wodne na planszy, aby umieścić minę (${placedMines.length}/${maxMines || 2}).`
                    : ''
                );
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer border ${
                mineMode
                  ? 'bg-rose-600 text-white border-rose-600 ring-4 ring-rose-400/40 animate-pulse'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
              }`}
            >
              <Bomb className="w-4 h-4 text-rose-600" />
              <span>
                {mineMode ? 'Zakończ rozstawianie min' : `Rozstaw miny (${placedMines.length}/${maxMines || 2})`}
              </span>
            </button>

            <button
              onClick={handleRandomize}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-blue-700 border border-slate-300 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-600" />
              <span>Losuj flotę</span>
            </button>

            <button
              onClick={handleToggleRotate}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 text-amber-600 transition-transform ${isVertical ? 'rotate-90' : ''}`} />
              <span>Obróć (Scroll / R): {isVertical ? 'Pion' : 'Poziom'}</span>
            </button>

            <button
              onClick={handleClear}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-300 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wyczyść</span>
            </button>
          </div>

        </div>

        {/* Right: Dock & Ship selection */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          
          <h3 className="text-base sm:text-lg font-bold font-chakra text-slate-900 mb-2 flex items-center justify-between">
            <span>Doki Floty ({boardSize}×{boardSize})</span>
            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 font-bold">
              {totalRequired - totalRemaining}/{totalRequired} rozstawione
            </span>
          </h3>

          <p className="text-xs text-slate-500 mb-3">
            Przeciągaj statki i miny myszką z doków lub planszy. Kliknięcie postawionego statku pozwala przenieść go w inne miejsce.
          </p>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {/* Mines Dock Card */}
            {maxMines > 0 && (
              <div
                draggable={placedMines.length < maxMines}
                onDragStart={handleDragStartMineFromDock}
                onClick={() => {
                  sounds.playClick();
                  setMineMode(!mineMode);
                  setSelectedDockShip(null);
                  setDraggedShip(null);
                  setErrorMessage(
                    !mineMode
                      ? `Tryb Min Morskich aktywny! Kliknij wolne pole wodne na planszy lub przeciągnij minę (${placedMines.length}/${maxMines}).`
                      : ''
                  );
                }}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  mineMode
                    ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400/40 shadow-xs'
                    : placedMines.length >= maxMines
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-rose-200 hover:border-rose-400 hover:bg-rose-50/40'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 shadow-2xs">
                    <Bomb className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-950 flex items-center space-x-1.5">
                      <span>Miny Morskie (Przeciągnij)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Przeciągnij na wolną wodę lub kliknij pole
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    placedMines.length >= maxMines
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {placedMines.length} / {maxMines}
                  </span>
                </div>
              </div>
            )}

            {dockFleet.map((ship) => {
              const isSelected = selectedDockShip?.size === ship.size && selectedDockShip?.shape === ship.shape;
              const isDone = ship.remaining === 0;

              return (
                <div
                  key={`${ship.id}_${ship.size}_${ship.shape || 'line'}`}
                  draggable={!isDone}
                  onDragStart={(e) => !isDone && handleDragStartFromDock(e, ship)}
                  onClick={() => {
                    if (!isDone) {
                      sounds.playClick();
                      setSelectedDockShip(ship);
                      setDraggedShip(null);
                      setErrorMessage('');
                    }
                  }}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400/40 shadow-xs'
                      : isDone
                      ? 'bg-slate-50 border-slate-200 opacity-50 cursor-default'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {ship.shape === 'L' ? (
                      <div className="grid grid-cols-3 gap-0.5 p-1 bg-amber-50 rounded border border-amber-300">
                        <div style={!isDone ? fleetStyle.style : {}} className="w-3.5 h-3.5 rounded-xs border"></div>
                        <div style={!isDone ? fleetStyle.style : {}} className="w-3.5 h-3.5 rounded-xs border"></div>
                        <div style={!isDone ? fleetStyle.style : {}} className="w-3.5 h-3.5 rounded-xs border"></div>
                        <div style={!isDone ? fleetStyle.style : {}} className="w-3.5 h-3.5 rounded-xs border"></div>
                        <div className="w-3.5 h-3.5 opacity-0"></div>
                        <div className="w-3.5 h-3.5 opacity-0"></div>
                      </div>
                    ) : (
                      <div className="flex space-x-0.5">
                        {Array.from({ length: ship.size }).map((_, i) => (
                          <div
                            key={i}
                            style={!isDone ? fleetStyle.style : {}}
                            className={`w-4 h-4 rounded-xs border flex items-center justify-center ${
                              isDone ? 'bg-slate-200 border-slate-300' : 'shadow-2xs'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {ship.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {ship.shape === 'L' ? 'Kształt litery L (3×2)' : `${ship.size} ${ship.size === 1 ? 'kratka' : 'kratki'}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isDone ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {ship.remaining} / {ship.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ready Button */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <button
              onClick={handleReadyClick}
              disabled={totalRemaining > 0}
              className={`w-full py-3 px-4 rounded-xl font-bold font-chakra text-sm flex items-center justify-center space-x-2 transition shadow-md ${
                totalRemaining === 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer animate-pulse'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {totalRemaining === 0
                  ? 'Zatwierdź flotę (Przejdź do Kamień-Papier-Nożyce)'
                  : `Rozmieść jeszcze ${totalRemaining} ${totalRemaining === 1 ? 'statek' : 'statki'}`}
              </span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
