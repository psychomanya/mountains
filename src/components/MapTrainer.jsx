import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { MOUNTAIN_RANGES, KEY_SUMMITS, ALL_MAP_ITEMS } from '../data/mountainsData';
import { calculateSM2, getIntervalPreview, getMasteryLevel, isItemDue } from '../utils/srs';
import { playSuccess, playError, playClick, playFanfare } from '../utils/audio';
import { CheckCircle2, XCircle, Eye, RefreshCw, Trophy, Sparkles, Navigation, Layers, Info, ArrowRight, X } from 'lucide-react';

// Custom SVG mountain marker icon for summits
const createMountainIcon = (isTarget = false, isDiscovered = false) => {
  const fillColor = isTarget ? '#e11d48' : isDiscovered ? '#10b981' : '#ea580c';
  const size = isTarget ? 38 : 30;
  const svgHtml = `
    <div style="transform: translate(-50%, -100%);">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fillColor}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)); cursor: pointer;">
        <polygon points="12 2 2 22 22 22" />
        <polygon points="12 8 8 16 16 16" fill="#ffffff" opacity="0.85" />
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-mountain-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export default function MapTrainer({ srsStorage, onSaveSRS }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({ polygons: {}, markers: {} });

  // Mode: 'due' (only SM-2 due items) or 'all' (all 19 items)
  const [sessionFilter, setSessionFilter] = useState('due');
  const [activeQueue, setActiveQueue] = useState(() => [...ALL_MAP_ITEMS].sort(() => Math.random() - 0.5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState(null); // 'correct' | 'wrong' | 'revealed' | null
  const [lastClickedItem, setLastClickedItem] = useState(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Default tile source: 'shadedRelief' has 100% ZERO TEXT LABELS (no cheat hints)
  const [tileSource, setTileSource] = useState('shadedRelief'); // 'shadedRelief' | 'satellite'

  // Determine which items should be in current session
  const dueItems = useMemo(() => {
    return ALL_MAP_ITEMS.filter((item) => isItemDue(srsStorage[item.id]));
  }, [srsStorage]);

  // Initialize or reset session queue
  const startSession = (filter = sessionFilter) => {
    let queue = [];
    if (filter === 'due') {
      queue = dueItems.length > 0 ? [...dueItems] : [...ALL_MAP_ITEMS];
    } else {
      queue = [...ALL_MAP_ITEMS];
    }
    queue.sort(() => Math.random() - 0.5);

    setActiveQueue(queue);
    setCurrentIndex(0);
    setCurrentResult(null);
    setLastClickedItem(null);
    setSessionCompleted(false);
  };

  useEffect(() => {
    startSession(sessionFilter);
  }, [sessionFilter]);

  const currentTarget = activeQueue[currentIndex] || null;

  // Reliable, label-free tile layers accessible in RU (Relief and Satellite)
  const tileUrls = {
    shadedRelief: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    const map = L.map(mapContainerRef.current, {
      center: [25.0, 20.0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false,
      worldCopyJump: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = L.tileLayer(tileUrls[tileSource], {
      attribution: '&copy; Esri World Physical &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    mapInstanceRef.current._tileLayer = tileLayer;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }
    };
  }, []);

  // Handle tile switch
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current._tileLayer) return;
    mapInstanceRef.current._tileLayer.setUrl(tileUrls[tileSource]);
  }, [tileSource]);

  // Render polygons and summit markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous layers
    Object.values(layersRef.current.polygons).forEach((poly) => map.removeLayer(poly));
    Object.values(layersRef.current.markers).forEach((m) => map.removeLayer(m));
    layersRef.current = { polygons: {}, markers: {} };

    // Add Mountain Ranges: orange filled regions with detailed topography
    MOUNTAIN_RANGES.forEach((range) => {
      const isTarget = currentTarget && currentTarget.id === range.id;
      const isRevealed = currentResult === 'revealed' && isTarget;
      const isCorrect = currentResult === 'correct' && isTarget;

      // Unanswered: vibrant mountain orange
      let color = '#ea580c';
      let fillColor = '#f97316';
      let fillOpacity = 0.72;
      let weight = 2.5;

      if (isCorrect) {
        color = '#047857';
        fillColor = '#10b981';
        fillOpacity = 0.92;
        weight = 3.5;
      } else if (isRevealed) {
        color = '#b45309';
        fillColor = '#f59e0b';
        fillOpacity = 0.95;
        weight = 3.5;
      }

      const polygon = L.polygon(range.polygon, {
        color,
        fillColor,
        fillOpacity,
        weight,
        smoothFactor: 1,
      }).addTo(map);

      polygon.on('click', () => {
        handleItemClick(range);
      });

      polygon.on('mouseover', () => {
        if (!isCorrect && !isRevealed) {
          polygon.setStyle({
            fillColor: '#fb923c',
            color: '#c2410c',
            fillOpacity: 0.88,
            weight: 3.5,
          });
        }
      });

      polygon.on('mouseout', () => {
        if (!isCorrect && !isRevealed) {
          polygon.setStyle({
            fillColor,
            color,
            fillOpacity,
            weight,
          });
        }
      });

      layersRef.current.polygons[range.id] = polygon;
    });

    // Add Key Summits
    KEY_SUMMITS.forEach((summit) => {
      const isTarget = currentTarget && currentTarget.id === summit.id;
      const isRevealed = currentResult === 'revealed' && isTarget;
      const isCorrect = currentResult === 'correct' && isTarget;

      const marker = L.marker(summit.coordinates, {
        icon: createMountainIcon(isTarget, isCorrect || isRevealed),
      }).addTo(map);

      marker.on('click', () => {
        handleItemClick(summit);
      });

      layersRef.current.markers[summit.id] = marker;
    });
  }, [currentTarget, currentResult]);

  // Click handler when student clicks an object
  const handleItemClick = (clickedItem) => {
    if (sessionCompleted || !currentTarget) return;

    setLastClickedItem(clickedItem);

    if (clickedItem.id === currentTarget.id) {
      // Correct!
      playSuccess();
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.8 },
      });
      setCurrentResult('correct');
    } else {
      // Wrong item clicked
      playError();
      setCurrentResult('wrong');
    }
  };

  // Student asks to reveal location
  const handleReveal = () => {
    if (!currentTarget || !mapInstanceRef.current) return;
    playClick();
    setCurrentResult('revealed');

    // Pan smoothly to target
    if (currentTarget.type === 'range') {
      mapInstanceRef.current.flyToBounds(currentTarget.bounds, { duration: 1.5, maxZoom: 6 });
    } else {
      mapInstanceRef.current.flyTo(currentTarget.coordinates, 6, { duration: 1.5 });
    }
  };

  // Move to next question with SM-2 grading
  const handleNextQuestion = (grade = 3) => {
    playClick();
    if (!currentTarget) return;

    const currentSrs = srsStorage[currentTarget.id];
    const newSrs = calculateSM2(currentSrs, grade);

    const updatedStorage = {
      ...srsStorage,
      [currentTarget.id]: newSrs,
    };

    onSaveSRS(updatedStorage);

    // Move to next in queue
    if (currentIndex + 1 < activeQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentResult(null);
      setLastClickedItem(null);
    } else {
      // Session finished!
      setSessionCompleted(true);
      playFanfare();
      confetti({
        particleCount: 140,
        spread: 100,
        origin: { y: 0.6 },
      });
    }
  };

  // Preview intervals for current item
  const currentItemSRS = currentTarget && srsStorage ? srsStorage[currentTarget.id] : null;
  const intervalPreview = useMemo(() => {
    return getIntervalPreview(currentItemSRS);
  }, [currentItemSRS]);

  const mastery = useMemo(() => {
    return getMasteryLevel(currentItemSRS);
  }, [currentItemSRS]);

  return (
    <div className="relative flex flex-col h-[calc(100dvh-46px)] w-full overflow-hidden bg-slate-100">
      {/* TOP CONTROL BAR: Mode, Tile and Progress */}
      <div className="bg-slate-900 text-white z-20 px-3 py-2 sm:px-6 shadow-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Progress counter */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-amber-400">Вопрос:</span>
            <span className="bg-slate-800 text-white px-2.5 py-1 rounded-lg border border-slate-700">
              {sessionCompleted ? activeQueue.length : currentIndex + 1} / {activeQueue.length}
            </span>
            <span className={`hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${mastery.color}`}>
              {mastery.title} {'★'.repeat(mastery.stars)}
            </span>
          </div>

          {/* Quick status if object already found */}
          {(currentResult === 'correct' || currentResult === 'revealed') && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {currentResult === 'correct' ? 'Верно!' : 'Показано на карте'}
              </span>
              <button
                onClick={() => handleNextQuestion(3)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-md transition-all flex items-center gap-1 animate-pulse"
              >
                <span>Следующий вопрос</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Controls: Mode & Tile switcher */}
          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex rounded-xl bg-slate-800 p-0.5 text-xs font-semibold border border-slate-700">
              <button
                onClick={() => setSessionFilter('due')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  sessionFilter === 'due' ? 'bg-amber-400 text-slate-950 font-bold shadow' : 'text-slate-300'
                }`}
                title="Только созревшие по интервалу повторения"
              >
                К повтору ({dueItems.length})
              </button>
              <button
                onClick={() => setSessionFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  sessionFilter === 'all' ? 'bg-amber-400 text-slate-950 font-bold shadow' : 'text-slate-300'
                }`}
                title={`Все ${ALL_MAP_ITEMS.length} объектов`}
              >
                Все ({ALL_MAP_ITEMS.length})
              </button>
            </div>

            {/* Tile selector (All label-free, no cheat text) */}
            <div className="flex rounded-xl bg-slate-800 p-0.5 text-xs font-semibold border border-slate-700">
              <button
                type="button"
                onClick={() => setTileSource('shadedRelief')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  tileSource === 'shadedRelief'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Физический рельеф гор (без подписей)"
              >
                <span>🏔️</span>
                <span className="hidden sm:inline">Рельеф</span>
              </button>
              <button
                type="button"
                onClick={() => setTileSource('satellite')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  tileSource === 'satellite'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Спутниковая съемка (без подписей)"
              >
                <span>🛰️</span>
                <span className="hidden sm:inline">Спутник</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PROMINENT TASK BANNER (Уменьшен в 1.5 раза) */}
      {!sessionCompleted && currentTarget && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl animate-in slide-in-from-top-2">
          <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl sm:rounded-2xl shadow-xl border-2 sm:border-3 border-amber-300 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-md flex-shrink-0">
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 leading-none">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-amber-300/90 px-1.5 py-0.5 rounded">
                    {currentTarget.type === 'range' ? 'Горная система' : 'Вершина мира'}
                  </span>
                  {currentTarget.factInParentheses && (
                    <span className="text-[10px] font-black text-slate-900 bg-black/10 px-1.5 py-0.5 rounded truncate">
                      ★ {currentTarget.factInParentheses}
                    </span>
                  )}
                </div>

                <div className="text-base sm:text-xl font-black text-slate-950 tracking-tight leading-tight mt-0.5 truncate">
                  НАЙДИТЕ: <span className="underline decoration-slate-950 decoration-2 sm:decoration-3">{currentTarget.name}</span>
                </div>
              </div>
            </div>

            {/* Hint button right in the banner */}
            {!currentResult && (
              <button
                onClick={handleReveal}
                className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-bold items-center gap-1 shadow-md transition-all flex-shrink-0"
                title="Показать правильное местоположение"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Где это?</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Map Canvas */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Result Modal with Facts and Clear Next Steps */}
        {currentResult && currentTarget && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-lg bg-white/98 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-2xl border-4 border-slate-200 transition-all animate-in fade-in slide-in-from-bottom-4">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                {currentResult === 'correct' ? (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : currentResult === 'wrong' ? (
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black flex-shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black flex-shrink-0">
                    <Info className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {currentResult === 'correct' && 'В точку! Это ' + currentTarget.name}
                    {currentResult === 'wrong' && 'Мимо! Вы нажали: ' + (lastClickedItem?.name || 'не туда')}
                    {currentResult === 'revealed' && 'Вот где находится: ' + currentTarget.name}
                  </h3>
                  {currentTarget.factInParentheses && (
                    <p className="text-xs font-black text-amber-800">
                      ★ {currentTarget.factInParentheses}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setCurrentResult(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                title="Скрыть карточку"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fact and Description */}
            <div className="bg-slate-50 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-700 space-y-1.5 mb-3.5 border border-slate-200">
              <p>
                <span className="font-extrabold text-slate-900">Расположение: </span>
                {currentTarget.continent || currentTarget.range + ', ' + currentTarget.country}
              </p>
              {currentTarget.maxPeak && (
                <p>
                  <span className="font-extrabold text-slate-900">Высшая точка: </span>
                  {currentTarget.maxPeak}
                </p>
              )}
              {currentTarget.elevation && (
                <p>
                  <span className="font-extrabold text-slate-900">Высота: </span>
                  {currentTarget.elevation} м
                </p>
              )}
              <p className="text-slate-700 italic pt-1 border-t border-slate-200/60">
                <span className="font-bold text-slate-900 not-italic">Факт 1: </span>
                {currentTarget.fullFact || currentTarget.fact}
              </p>
              {currentTarget.fact2 && (
                <p className="text-slate-700 italic pt-1 border-t border-slate-200/40">
                  <span className="font-bold text-emerald-950 not-italic">Факт 2: </span>
                  {currentTarget.fact2}
                </p>
              )}
            </div>

            {/* If wrong: Try again or reveal */}
            {currentResult === 'wrong' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentResult(null)}
                  className="flex-1 py-3 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm transition-all"
                >
                  Попробовать снова
                </button>
                <button
                  onClick={handleReveal}
                  className="py-3 px-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  Показать где это
                </button>
              </div>
            )}

            {/* If correct or revealed: PROMINENT NEXT BUTTON + RATINGS */}
            {(currentResult === 'correct' || currentResult === 'revealed') && (
              <div className="space-y-3">
                {/* BIG PRIMARY "NEXT QUESTION" BUTTON */}
                <button
                  onClick={() => handleNextQuestion(3)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-95 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 animate-bounce hover:animate-none"
                >
                  <span>Следующий вопрос</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Optional Detailed Rating */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5 text-center uppercase tracking-wider">
                    Или выберите интервал повторения:
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => handleNextQuestion(1)}
                      className="flex flex-col items-center py-2 px-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold transition-all text-xs active:scale-95"
                    >
                      <span>Снова</span>
                      <span className="text-[10px] font-medium opacity-80">{intervalPreview.again}</span>
                    </button>
                    <button
                      onClick={() => handleNextQuestion(2)}
                      className="flex flex-col items-center py-2 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold transition-all text-xs active:scale-95"
                    >
                      <span>Трудно</span>
                      <span className="text-[10px] font-medium opacity-80">{intervalPreview.hard}</span>
                    </button>
                    <button
                      onClick={() => handleNextQuestion(3)}
                      className="flex flex-col items-center py-2 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-all text-xs active:scale-95"
                    >
                      <span>Хорошо</span>
                      <span className="text-[10px] font-medium opacity-80">{intervalPreview.good}</span>
                    </button>
                    <button
                      onClick={() => handleNextQuestion(4)}
                      className="flex flex-col items-center py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold transition-all text-xs active:scale-95"
                    >
                      <span>Легко</span>
                      <span className="text-[10px] font-medium opacity-80">{intervalPreview.easy}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating bottom "Help / Show where" button when student is looking for location */}
        {!currentResult && !sessionCompleted && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 md:hidden">
            <button
              onClick={handleReveal}
              className="px-4 py-2.5 rounded-full bg-slate-950 text-amber-400 font-bold text-xs shadow-xl border-2 border-amber-400/80 backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Eye className="w-4 h-4" />
              Показать где это на карте
            </button>
          </div>
        )}

        {/* Session Finished Screen */}
        {sessionCompleted && (
          <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border-4 border-amber-400 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                Экспедиция завершена!
              </h2>
              <p className="text-sm text-slate-600 mb-5">
                Вы успешно повторили все горные цепи и вершины! Ваши интервалы обновлены и сохранены в браузере.
              </p>

              <button
                onClick={() => startSession('all')}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-700/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Пройти все {ALL_MAP_ITEMS.length} объектов снова
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
