import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { ALL_TERMS, COMPARISON_TOPICS } from '../data/termsData';
import { calculateSM2, getIntervalPreview, getMasteryLevel, isItemDue } from '../utils/srs';
import { playSuccess, playError, playClick, playFanfare } from '../utils/audio';
import { CheckCircle2, RotateCcw, HelpCircle, Sparkles, Mountain, Eye, ArrowRight, X, AlertCircle, Compass } from 'lucide-react';
import landscapeImg from '../assets/landscape.jpg';

export default function TermsTrainer({ srsStorage, onSaveSRS }) {
  // Sub-tabs: 'interactive-diagram' | 'cards'
  const [subTab, setSubTab] = useState('interactive-diagram');

  // Matching state on the master landscape: { [targetId]: termId }
  const [matches, setMatches] = useState({});
  const [selectedChip, setSelectedChip] = useState(null);

  // Temporary wrong click feedback
  const [wrongFeedback, setWrongFeedback] = useState(null);
  // Detailed modal inspection of any term
  const [inspectingTerm, setInspectingTerm] = useState(null);

  // SM-2 Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsFilter, setCardsFilter] = useState('due');
  const [cardsCompleted, setCardsCompleted] = useState(false);

  // All 14 targets placed on the user's master illustration:
  const landscapeTargets = [
    // Volcano & Subterranean (left side)
    { id: 'crater', label: 'Кратер (вулкана)', x: 22.5, y: 23, hint: 'Воронка на вершине вулкана' },
    { id: 'lava-flow', label: 'Лава (излившаяся)', x: 33, y: 41, hint: 'Магма на открытом воздухе' },
    { id: 'vent', label: 'Жерло', x: 21.5, y: 53, hint: 'Вертикальный канал подъема' },
    { id: 'magma-chamber', label: 'Очаг магмы', x: 21, y: 82, hint: 'Резервуар магмы в толще коры' },
    { id: 'mantle', label: 'Мантия Земли', x: 12, y: 94, hint: 'Глубинная геосфера под корой' },

    // Slopes and transition
    { id: 'slope-gentle', label: 'Пологий склон', x: 47, y: 36, hint: 'Плавный травянистый подъем (центр-лево)' },
    { id: 'slope-sheer', label: 'Отвесный склон', x: 62, y: 44, hint: 'Вертикальная стена 90° под пиком' },

    // Mountain & Valley (center & right)
    { id: 'peak', label: 'Вершина (пик)', x: 67, y: 14, hint: 'Высшая точка горы' },
    { id: 'ridge', label: 'Хребет', x: 83, y: 22, hint: 'Вытянутая горная цепь' },
    { id: 'pass', label: 'Перевал', x: 78, y: 31, hint: 'Понижение в гребне с тропой' },
    { id: 'glacier', label: 'Ледник', x: 76, y: 46, hint: 'Сползающий ледяной язык' },
    { id: 'slope-steep', label: 'Крутой склон', x: 88, y: 38, hint: 'Резкий скалистый подъем на правой горе' },
    { id: 'valley', label: 'Долина', x: 64, y: 67, hint: 'Понижение с горной рекой' },
    { id: 'foot', label: 'Подножие', x: 85, y: 80, hint: 'Переход склона в равнину' },
  ];

  // Distribute 14 terms evenly: 7 on the left, 7 on the right
  const leftTerms = [
    ALL_TERMS.find((t) => t.id === 'term-crater'),
    ALL_TERMS.find((t) => t.id === 'term-vent'),
    ALL_TERMS.find((t) => t.id === 'term-lava-flow'),
    ALL_TERMS.find((t) => t.id === 'term-magma-chamber'),
    ALL_TERMS.find((t) => t.id === 'term-mantle'),
    ALL_TERMS.find((t) => t.id === 'term-slope-gentle'),
    ALL_TERMS.find((t) => t.id === 'term-slope-sheer'),
  ].filter(Boolean);

  const rightTerms = [
    ALL_TERMS.find((t) => t.id === 'term-peak'),
    ALL_TERMS.find((t) => t.id === 'term-ridge'),
    ALL_TERMS.find((t) => t.id === 'term-pass'),
    ALL_TERMS.find((t) => t.id === 'term-glacier'),
    ALL_TERMS.find((t) => t.id === 'term-slope-steep'),
    ALL_TERMS.find((t) => t.id === 'term-valley'),
    ALL_TERMS.find((t) => t.id === 'term-foot'),
  ].filter(Boolean);

  // Handle slot matching: ZERO SPOILERS!
  const handleAssignTarget = (targetId, term) => {
    const isCorrect = term.diagramTarget === targetId;

    if (isCorrect) {
      playSuccess();
      const next = { ...matches, [targetId]: term.id };
      setMatches(next);
      setSelectedChip(null);
      setWrongFeedback(null);
      setInspectingTerm(term);

      if (Object.keys(next).length === landscapeTargets.length) {
        playFanfare();
        confetti({ particleCount: 100, spread: 90 });
      }
    } else {
      playError();
      const clickedTargetInfo = landscapeTargets.find((t) => t.id === targetId);
      setWrongFeedback({
        message: `Мимо! Точка «${clickedTargetInfo?.label}» не соответствует термину «${term.name}». Попробуйте другое место!`,
        targetId,
      });
    }
  };

  // Due flashcards
  const dueCards = useMemo(() => {
    return ALL_TERMS.filter((term) => isItemDue(srsStorage[term.id]));
  }, [srsStorage]);

  const cardsQueue = useMemo(() => {
    const list = cardsFilter === 'due' && dueCards.length > 0 ? [...dueCards] : [...ALL_TERMS];
    return list;
  }, [cardsFilter, dueCards]);

  const currentCard = cardsQueue[cardIndex] || null;

  // Grade SM-2 Flashcard
  const handleGradeCard = (grade) => {
    playClick();
    if (!currentCard) return;

    const currentSrs = srsStorage[currentCard.id];
    const newSrs = calculateSM2(currentSrs, grade);
    const updatedStorage = {
      ...srsStorage,
      [currentCard.id]: newSrs,
    };
    onSaveSRS(updatedStorage);

    setIsFlipped(false);

    if (cardIndex + 1 < cardsQueue.length) {
      setCardIndex((prev) => prev + 1);
    } else {
      setCardsCompleted(true);
      playFanfare();
      confetti({ particleCount: 120, spread: 90 });
    }
  };

  const cardSrs = currentCard && srsStorage ? srsStorage[currentCard.id] : null;
  const intervalPreview = useMemo(() => getIntervalPreview(cardSrs), [cardSrs]);
  const mastery = useMemo(() => getMasteryLevel(cardSrs), [cardSrs]);

  return (
    <div className="max-w-[1750px] w-full mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col gap-4">
      {/* Top Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClick();
              setSubTab('interactive-diagram');
              setWrongFeedback(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
              subTab === 'interactive-diagram'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Compass className="w-4 h-4" />
            Интерактивная панорама рельефа
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-100">
              {Object.keys(matches).length}/{landscapeTargets.length}
            </span>
          </button>

          <button
            onClick={() => {
              playClick();
              setSubTab('cards');
              setWrongFeedback(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
              subTab === 'cards'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Карточки
            {dueCards.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black animate-pulse">
                {dueCards.length}
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium hidden md:block">
          💡 Выберите карточку термина сбоку, затем нажмите на подходящую метку <b>[ ? ]</b> на картине
        </div>
      </div>

      {/* SUB-TAB 1: UNIFIED MASTER LANDSCAPE WITH SIDEBAR TERMS */}
      {subTab === 'interactive-diagram' && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-md border border-slate-200 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2">
                Горы и вулканы: интерактивная схема строения
              </h2>
            </div>
            <button
              onClick={() => {
                playClick();
                setMatches({});
                setSelectedChip(null);
                setWrongFeedback(null);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Сбросить прогресс
            </button>
          </div>

          {/* Feedback banner on wrong click */}
          {wrongFeedback && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{wrongFeedback.message}</span>
              </div>
              <button onClick={() => setWrongFeedback(null)}>
                <X className="w-4 h-4 text-red-500 hover:text-red-800" />
              </button>
            </div>
          )}

          {/* 3-COLUMN WORKBENCH: Left 7 Terms - Center Image - Right 7 Terms */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 xl:gap-5 items-start">
            {/* LEFT COLUMN: 7 Terms */}
            <div className="lg:col-span-2 flex flex-col gap-2.5 order-2 lg:order-1">
              {leftTerms.map((term) => {
                const isMatched = Object.values(matches).includes(term.id);
                const isSelected = selectedChip?.id === term.id;

                return (
                  <button
                    key={term.id}
                    onClick={() => {
                      playClick();
                      if (isMatched) {
                        setInspectingTerm(term);
                      } else {
                        setSelectedChip(isSelected ? null : term);
                        setWrongFeedback(null);
                      }
                    }}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-between ${
                      isMatched
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300 opacity-90'
                        : isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-400 scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="min-w-0 pr-1.5 flex-1">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">{term.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {term.shortDef}
                      </div>
                    </div>
                    {isMatched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* CENTER COLUMN: Master Landscape Image Canvas (Takes 8 of 12 columns for maximum visibility) */}
            <div
              style={{ aspectRatio: '1376 / 768' }}
              className="lg:col-span-8 relative rounded-3xl overflow-hidden border-2 border-slate-300 shadow-xl order-1 lg:order-2 select-none bg-slate-100"
            >
              <img
                src={landscapeImg}
                alt="Горы и вулканы в разрезе"
                className="w-full h-full object-cover"
              />

              {/* TARGET PINS: NO SPOILERS! ONLY [ ? ] MARK */}
              {landscapeTargets.map((target) => {
                const matchedTermId = matches[target.id];
                const matchedTerm = ALL_TERMS.find((t) => t.id === matchedTermId);
                const hasActiveSelection = !!selectedChip;

                return (
                  <div
                    key={target.id}
                    onClick={() => {
                      if (selectedChip) {
                        handleAssignTarget(target.id, selectedChip);
                      } else if (matchedTerm) {
                        setInspectingTerm(matchedTerm);
                      } else {
                        setWrongFeedback({
                          message: 'Сначала выберите термин в левой или правой колонке, затем нажмите на метку [ ? ] на картине!',
                          targetId: target.id,
                        });
                      }
                    }}
                    style={{ left: `${target.x}%`, top: `${target.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                      matchedTerm ? 'z-20' : hasActiveSelection ? 'z-30 hover:scale-110' : 'z-10'
                    }`}
                  >
                    {matchedTerm ? (
                      <div className="bg-emerald-600 text-white font-black text-[11px] sm:text-xs px-2.5 py-1 rounded-xl shadow-xl border-2 border-white flex items-center gap-1 hover:bg-emerald-500 whitespace-nowrap transition-transform hover:scale-105">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{matchedTerm.name}</span>
                      </div>
                    ) : (
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-black shadow-lg backdrop-blur-md transition-all flex items-center justify-center select-none ${
                          hasActiveSelection
                            ? 'bg-amber-400 text-slate-950 border-2 border-slate-950 ring-4 ring-amber-400/50 scale-110 animate-bounce shadow-amber-400/50 hover:bg-yellow-300'
                            : 'bg-slate-950/85 text-amber-300 border-2 border-amber-400/80 hover:bg-slate-900 hover:scale-110'
                        }`}
                        title="Нажмите сюда, чтобы сопоставить выбранный термин"
                      >
                        ?
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* RIGHT COLUMN: 7 Terms */}
            <div className="lg:col-span-2 flex flex-col gap-2.5 order-3">
              {rightTerms.map((term) => {
                const isMatched = Object.values(matches).includes(term.id);
                const isSelected = selectedChip?.id === term.id;

                return (
                  <button
                    key={term.id}
                    onClick={() => {
                      playClick();
                      if (isMatched) {
                        setInspectingTerm(term);
                      } else {
                        setSelectedChip(isSelected ? null : term);
                        setWrongFeedback(null);
                      }
                    }}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-between ${
                      isMatched
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300 opacity-90'
                        : isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-400 scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="min-w-0 pr-1.5 flex-1">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">{term.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {term.shortDef}
                      </div>
                    </div>
                    {isMatched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Geological comparisons: Лава vs Мантия & 3 вида склонов */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            {COMPARISON_TOPICS.map((topic) => (
              <div key={topic.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  {topic.title}
                </h4>
                <p className="text-xs text-slate-600 mb-2.5 leading-relaxed">{topic.summary}</p>

                <div className="space-y-1.5 mb-2.5">
                  {topic.differences.map((diff, i) => (
                    <div key={i} className="text-xs bg-white p-2 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-800 block">{diff.aspect}</span>
                      {diff.mantle && (
                        <div className="text-slate-700 mt-0.5">
                          <span className="text-amber-800 font-bold">• Мантия: </span>
                          {diff.mantle}
                        </div>
                      )}
                      {diff.lava && (
                        <div className="text-slate-700 mt-0.5">
                          <span className="text-red-700 font-bold">• Лава: </span>
                          {diff.lava}
                        </div>
                      )}
                      {diff.angle && (
                        <div className="text-slate-700 mt-0.5">
                          <span className="font-bold text-emerald-800">{diff.angle}: </span>
                          {diff.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-amber-100/70 border border-amber-300 text-amber-950 p-2 rounded-xl text-[11px] font-bold leading-relaxed">
                  💡 {topic.mnemonic}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SM-2 FLASHCARDS & DETAILED DEFINITIONS */}
      {subTab === 'cards' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Режим карточек:</span>
              <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setCardsFilter('due');
                    setCardIndex(0);
                    setIsFlipped(false);
                    setCardsCompleted(false);
                  }}
                  className={`px-3 py-1 rounded-lg ${
                    cardsFilter === 'due' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  К повторению ({dueCards.length})
                </button>
                <button
                  onClick={() => {
                    setCardsFilter('all');
                    setCardIndex(0);
                    setIsFlipped(false);
                    setCardsCompleted(false);
                  }}
                  className={`px-3 py-1 rounded-lg ${
                    cardsFilter === 'all' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Все карточки ({ALL_TERMS.length})
                </button>
              </div>
            </div>

            <div className="text-xs font-medium text-slate-500">
              Карточка: {cardsCompleted ? cardsQueue.length : cardIndex + 1} / {cardsQueue.length}
            </div>
          </div>

          {!cardsCompleted && currentCard && (
            <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-slate-200 transition-all">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                    {currentCard.category === 'volcano' || currentCard.category === 'interior'
                      ? 'Вулканы и недра'
                      : currentCard.category === 'slope'
                      ? 'Виды склонов'
                      : 'Строение горы'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mastery.color}`}>
                    {mastery.title} {'★'.repeat(mastery.stars)}
                  </span>
                </div>
                <span className="text-xs text-slate-400">Нажмите для ответа</span>
              </div>

              <div className="min-h-[120px] flex flex-col justify-center items-center text-center my-3">
                <span className="text-xs uppercase font-extrabold text-slate-400 mb-1">Географический термин</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
                  {currentCard.name}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm max-w-md">
                  Вспомните точное научное определение и ключевые признаки этого понятия.
                </p>
              </div>

              {!isFlipped ? (
                <button
                  onClick={() => {
                    playClick();
                    setIsFlipped(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-800 text-white font-black text-sm shadow-lg shadow-purple-800/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Показать развернутое определение
                </button>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-purple-50/90 rounded-2xl p-4 border border-purple-200 text-slate-800 text-xs sm:text-sm space-y-2.5">
                    <div>
                      <span className="font-black text-purple-950 block mb-1">Научное определение:</span>
                      <p className="leading-relaxed text-slate-800">{currentCard.fullDef}</p>
                    </div>
                    {currentCard.example && (
                      <div className="text-xs text-purple-900 bg-purple-100/70 p-2.5 rounded-xl border border-purple-200/50">
                        <span className="font-bold">Пример в природе: </span>
                        {currentCard.example}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5 text-center uppercase tracking-wider">
                      Оцените насколько легко было вспомнить:
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleGradeCard(1)}
                        className="py-2.5 px-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold transition-all text-xs flex flex-col items-center"
                      >
                        <span>Снова</span>
                        <span className="text-[10px] font-medium opacity-80">{intervalPreview.again}</span>
                      </button>
                      <button
                        onClick={() => handleGradeCard(2)}
                        className="py-2.5 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold transition-all text-xs flex flex-col items-center"
                      >
                        <span>Трудно</span>
                        <span className="text-[10px] font-medium opacity-80">{intervalPreview.hard}</span>
                      </button>
                      <button
                        onClick={() => handleGradeCard(3)}
                        className="py-2.5 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-all text-xs flex flex-col items-center"
                      >
                        <span>Хорошо</span>
                        <span className="text-[10px] font-medium opacity-80">{intervalPreview.good}</span>
                      </button>
                      <button
                        onClick={() => handleGradeCard(4)}
                        className="py-2.5 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold transition-all text-xs flex flex-col items-center"
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

          {cardsCompleted && (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 text-center shadow-xl border border-slate-200 animate-in zoom-in-95">
              <CheckCircle2 className="w-14 h-14 text-purple-600 mx-auto mb-3" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Все карточки пройдены!</h3>
              <p className="text-sm text-slate-600 mb-4">
                Отличная память! Интервалы повторения обновлены.
              </p>
              <button
                onClick={() => {
                  setCardsFilter('all');
                  setCardIndex(0);
                  setIsFlipped(false);
                  setCardsCompleted(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-700 text-white font-bold text-xs"
              >
                Повторить все термины заново
              </button>
            </div>
          )}

          {/* Interactive Special Topic: Лава vs Мантия & Виды склонов */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {COMPARISON_TOPICS.map((topic) => (
              <div key={topic.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <h4 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  {topic.title}
                </h4>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">{topic.summary}</p>

                <div className="space-y-2 mb-3">
                  {topic.differences.map((diff, i) => (
                    <div key={i} className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-800 block mb-1">{diff.aspect}</span>
                      {diff.mantle && (
                        <div className="text-slate-700">
                          <span className="text-amber-800 font-bold">• Мантия: </span>
                          {diff.mantle}
                        </div>
                      )}
                      {diff.lava && (
                        <div className="text-slate-700 mt-1">
                          <span className="text-red-700 font-bold">• Лава: </span>
                          {diff.lava}
                        </div>
                      )}
                      {diff.angle && (
                        <div className="text-slate-700">
                          <span className="font-bold text-emerald-800">{diff.angle}: </span>
                          {diff.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl text-xs font-bold leading-relaxed">
                  💡 {topic.mnemonic}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAILED TERM INSPECTION MODAL */}
      {inspectingTerm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                  Энциклопедическая справка
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{inspectingTerm.name}</h3>
              </div>
              <button
                onClick={() => setInspectingTerm(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">Развернутое определение:</span>
                {inspectingTerm.fullDef}
              </div>

              {inspectingTerm.example && (
                <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-purple-950 text-xs">
                  <span className="font-bold">Пример: </span>
                  {inspectingTerm.example}
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectingTerm(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Понятно, закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
