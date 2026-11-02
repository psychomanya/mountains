import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  LITHOSPHERE_CORE_FACTS,
  EARTH_STRUCTURE_TERMS,
  TECTONIC_PLATES,
  PROCESS_TERMS,
  ALL_LITHOSPHERE_CARDS,
} from '../data/lithosphereData';
import { calculateSM2, getIntervalPreview, getMasteryLevel, isItemDue } from '../utils/srs';
import { playSuccess, playError, playClick, playFanfare } from '../utils/audio';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Globe,
  Flame,
  Activity,
  ArrowRight,
  RotateCcw,
  Eye,
  EyeOff,
  Info,
  Building,
  Waves,
  Mountain,
  AlertTriangle,
  Compass,
} from 'lucide-react';

import earthStructureImg from '../assets/earth_structure.jpg';
import tectonicPlatesImg from '../assets/tectonic_plates.png';
import earthquakeAnatomyImg from '../assets/earthquake_anatomy.jpg';
import volcanoAnatomyImg from '../assets/volcano_anatomy.jpg';

export default function LithosphereTrainer({ srsStorage = {}, onSaveSRS }) {
  // Modes: 'structure' | 'plates' | 'processes' | 'cards'
  const [activeMode, setActiveMode] = useState('structure');

  // =========================================================================
  // MODE 1: ВНУТРЕННЕЕ СТРОЕНИЕ ЗЕМЛИ (БЕЗ ПОДСКАЗОК, ЛИТОСФЕРА В ЗАГОЛОВКЕ)
  // =========================================================================
  const [structureMatches, setStructureMatches] = useState({});
  const [selectedStructureTerm, setSelectedStructureTerm] = useState(null);
  const [structureWrongFeedback, setStructureWrongFeedback] = useState(null);
  const [inspectingItem, setInspectingItem] = useState(null);

  // 4 targets on earth_structure.jpg: placed neatly at the ends of the pointer arrows
  const structureTargets = [
    { id: 'target-crust', termId: 'litho-crust', slotNumber: 1, x: 49, y: 7, w: 105, h: 36 },
    { id: 'target-mantle', termId: 'litho-mantle', slotNumber: 2, x: 67, y: 9.5, w: 110, h: 36 },
    { id: 'target-inner-core', termId: 'litho-inner-core', slotNumber: 3, x: 78, y: 17, w: 170, h: 36 },
    { id: 'target-outer-core', termId: 'litho-outer-core', slotNumber: 4, x: 81, y: 27, w: 170, h: 36 },
  ];

  // ONLY 4 internal layers (Литосфера removed from choices per user request #2)
  const layerTermsOnly = useMemo(() => {
    return EARTH_STRUCTURE_TERMS.filter((t) => t.id !== 'litho-lithosphere' && t.category === 'structure');
  }, []);

  const handleAssignStructureTarget = (target, term) => {
    if (!term) return;
    const isCorrect = term.diagramTarget === target.id;
    if (isCorrect) {
      playSuccess();
      const next = { ...structureMatches, [target.id]: term.id };
      setStructureMatches(next);
      setSelectedStructureTerm(null);
      setStructureWrongFeedback(null);
      setInspectingItem(term);

      if (Object.keys(next).length === structureTargets.length) {
        playFanfare();
        confetti({ particleCount: 70, spread: 80 });
      }
    } else {
      playError();
      setStructureWrongFeedback(`Неверно! Эта стрелка не указывает на «${term.name}». Попробуйте другую!`);
    }
  };

  // =========================================================================
  // MODE 2: ЛИТОСФЕРНЫЕ ПЛИТЫ (КВИЗ С НАДЁЖНО ЗАКРЫТЫМИ НАЗВАНИЯМИ)
  // =========================================================================
  const [plateQueue, setPlateQueue] = useState(() => [...TECTONIC_PLATES].sort(() => Math.random() - 0.5));
  const [plateTargetIndex, setPlateTargetIndex] = useState(0);
  const [platesSolved, setPlatesSolved] = useState({});
  const [plateWrongFeedback, setPlateWrongFeedback] = useState(null);
  const [plateRevealedId, setPlateRevealedId] = useState(null);
  const [showBottomLegend, setShowBottomLegend] = useState(false);

  const currentPlateTarget = plateQueue[plateTargetIndex] || null;
  const isPlatesQuizCompleted = Object.keys(platesSolved).length === TECTONIC_PLATES.length;

  // Крупные плиты: оранжевые блоки, подходящие по размеру и форме, строго внутри плит
  const majorPlateBlocks = [
    // 1. Тихоокеанская (западная часть - слева, вертикальная полоса в океане)
    {
      plateId: 'plate-pacific',
      label: 'Тихоокеанская плита',
      x: 13.7,
      y: 43.5,
      w: 46,
      h: 215,
      rotation: 0,
      isVertical: true,
    },
    // 1b. Тихоокеанская (восточная часть - справа, вдоль изгиба океана)
    {
      plateId: 'plate-pacific',
      label: 'Тихоокеанская плита',
      x: 87.0,
      y: 32.5,
      w: 220,
      h: 52,
      rotation: 43,
    },
    // 2. Северо-Американская (горизонтальный блок в центре континента)
    {
      plateId: 'plate-north-american',
      label: 'Северо-Американская',
      x: 30.9,
      y: 23.2,
      w: 205,
      h: 56,
      rotation: 0,
    },
    // 3. Плита Наска (аккуратный наклонный блок внутри океанического сектора)
    {
      plateId: 'plate-nazca',
      label: 'Плита Наска',
      x: 25.5,
      y: 51.0,
      w: 90,
      h: 48,
      rotation: 55,
    },
    // 4. Южно-Американская (повернут на +42° строго внутри континента, закрывает 2 строки)
    {
      plateId: 'plate-south-american',
      label: 'Южно-Американская',
      x: 36.0,
      y: 53.0,
      w: 210,
      h: 74,
      rotation: 42,
    },
    // 5. Евразиатская (блок в центре континента)
    {
      plateId: 'plate-eurasian',
      label: 'Евразиатская',
      x: 60.5,
      y: 18.5,
      w: 195,
      h: 42,
      rotation: 0,
    },
    // 6. Африканская (повернут на +40° строго вдоль контура Африки)
    {
      plateId: 'plate-african',
      label: 'Африканская',
      x: 50.0,
      y: 40.0,
      w: 190,
      h: 54,
      rotation: 40,
    },
    // 7. Индо-Австралийская (внутри границ плиты, перекрывает обе строки)
    {
      plateId: 'plate-indo-australian',
      label: 'Индо-Австралийская',
      x: 77.0,
      y: 51.3,
      w: 220,
      h: 62,
      rotation: 0,
    },
    // 8. Антарктическая (вдоль южной полосы)
    {
      plateId: 'plate-antarctic',
      label: 'Антарктическая',
      x: 49.5,
      y: 71.5,
      w: 225,
      h: 34,
      rotation: 0,
    },
  ];

  // Малые плиты: компактный круглый маркер на плите + стильная выноска с линией в свободную зону
  const smallPlateCallouts = [
    {
      plateId: 'plate-cocos',
      number: 1,
      name: 'Плита Кокос',
      pin: { x: 23.3, y: 39.0 },
      callout: { x: 20.0, y: 45.0, w: 130, h: 32 },
    },
    {
      plateId: 'plate-caribbean',
      number: 2,
      name: 'Карибская плита',
      pin: { x: 27.9, y: 36.8 },
      callout: { x: 34.0, y: 31.0, w: 145, h: 32 },
    },
    {
      plateId: 'plate-arabian',
      number: 3,
      name: 'Аравийская плита',
      pin: { x: 58.3, y: 32.7 },
      callout: { x: 65.5, y: 39.5, w: 145, h: 32 },
    },
    {
      plateId: 'plate-philippine',
      number: 4,
      name: 'Филиппинская плита',
      pin: { x: 79.2, y: 32.9 },
      callout: { x: 86.0, y: 23.5, w: 155, h: 32 },
    },
  ];

  const handlePlateBlockClick = (plateId) => {
    if (!currentPlateTarget) return;

    if (plateId === currentPlateTarget.id) {
      playSuccess();
      const nextSolved = { ...platesSolved, [plateId]: true };
      setPlatesSolved(nextSolved);
      setPlateWrongFeedback(null);
      setPlateRevealedId(null);
      setInspectingItem(currentPlateTarget);

      if (Object.keys(nextSolved).length === TECTONIC_PLATES.length) {
        playFanfare();
        confetti({ particleCount: 90, spread: 85 });
      } else {
        let nextIdx = plateTargetIndex + 1;
        while (nextIdx < plateQueue.length && nextSolved[plateQueue[nextIdx].id]) {
          nextIdx++;
        }
        if (nextIdx >= plateQueue.length) {
          nextIdx = plateQueue.findIndex((p) => !nextSolved[p.id]);
        }
        setPlateTargetIndex(nextIdx);
      }
    } else {
      playError();
      const clickedPlate = TECTONIC_PLATES.find((p) => p.id === plateId);
      setPlateWrongFeedback(
        `Мимо! Вы нажали на плиту «${clickedPlate ? clickedPlate.name : 'другую'}». Найдите «${currentPlateTarget.name}»!`
      );
    }
  };

  const handleRevealCurrentPlate = () => {
    if (!currentPlateTarget) return;
    playClick();
    setPlateRevealedId(currentPlateTarget.id);
  };

  const handleResetPlatesQuiz = () => {
    playClick();
    const shuffled = [...TECTONIC_PLATES].sort(() => Math.random() - 0.5);
    setPlateQueue(shuffled);
    setPlateTargetIndex(0);
    setPlatesSolved({});
    setPlateWrongFeedback(null);
    setPlateRevealedId(null);
  };

  // =========================================================================
  // MODE 3: ЗЕМЛЕТРЯСЕНИЯ И ВУЛКАНЫ (С ВЫСОКОДЕТАЛИЗИРОВАННЫМИ 3D ИЛЛЮСТРАЦИЯМИ)
  // =========================================================================
  const [processSubTab, setProcessSubTab] = useState('earthquake'); // 'earthquake' | 'volcano'
  const [selectedEarthquakeHotspot, setSelectedEarthquakeHotspot] = useState('epicenter');
  const [selectedVolcanoHotspot, setSelectedVolcanoHotspot] = useState('crater');

  // Interactive hotspots on earthquake_anatomy.jpg (1376 x 768)
  const earthquakeHotspots = [
    {
      id: 'focus',
      name: 'Очаг (гипоцентр)',
      icon: '⚡',
      x: 50,
      y: 72,
      badge: '⚡ ОЧАГ (под землёй)',
      title: 'Очаг землетрясения (глубоко под землёй)',
      description: 'Место, где происходит разрыв и смещение горных пород вдоль тектонического разлома. В конспекте: «Очаг — место, где происходит разрыв (он под землёй)».',
      rule: 'От очага во все стороны сферически расходятся разрушительные сейсмические волны.',
    },
    {
      id: 'epicenter',
      name: 'Эпицентр',
      icon: '★',
      x: 50,
      y: 35,
      badge: '★ ЭПИЦЕНТР (на поверхности)',
      title: 'Эпицентр землетрясения',
      description: 'Точка на поверхности Земли ровно над очагом. В конспекте: «Эпицентр — точка на поверхности над очагом (там трясёт сильнее всего)».',
      rule: 'Именно в эпицентре фиксируются наибольшие разрушения, трещины в грунте и максимальная амплитуда колебаний.',
    },
    {
      id: 'buildings',
      name: 'Обрушение зданий',
      icon: '🏢',
      x: 22,
      y: 22,
      badge: '🏢 ОБРУШЕНИЕ ЗДАНИЙ',
      title: 'Опасность: Разрушение зданий и оползни',
      description: 'Резкие подземные толчки вызывают разрушение фундаментов, перекос конструкций, обвал мостов и каменных зданий. В конспекте: «Опасны обрушением зданий, оползнями, цунами».',
      rule: 'Силу землетрясения измеряют по шкале Рихтера (в баллах).',
    },
    {
      id: 'tsunami',
      name: 'Цунами',
      icon: '🌊',
      x: 75,
      y: 22,
      badge: '🌊 ЦУНАМИ (гигантская волна)',
      title: 'Опасность: Цунами',
      description: 'Когда разлом пластов происходит под дном океана, вертикальный сдвиг морского дна мгновенно толкает огромные массы воды, порождая гигантские разрушительные волны цунами.',
      rule: 'Волны накатывают на побережье, сметая прибрежные города и порты.',
    },
  ];

  // Interactive hotspots on volcano_anatomy.jpg (1200 x 896)
  const volcanoHotspots = [
    {
      id: 'magma',
      name: 'Очаг магмы',
      icon: '⚡',
      x: 50,
      y: 78,
      badge: '⚡ ОЧАГ МАГМЫ (под землёй)',
      title: 'Очаг магмы',
      description: 'Резервуар расплавленного силикатного вещества глубоко в земной коре и верхней мантии. В конспекте: «Вулкан состоит из очага (глубоко под землёй), жерла и кратера».',
      rule: 'Под высоким давлением раскалённая магма поднимается по каналу вверх.',
    },
    {
      id: 'vent',
      name: 'Жерло вулкана',
      icon: '◀',
      x: 50,
      y: 55,
      badge: '◀ ЖЕРЛО (канал вулкана)',
      title: 'Жерло вулкана',
      description: 'Вертикальный канал или трубка, по которой магма под колоссальным давлением поднимается из очага к поверхности.',
      rule: 'В конспекте: «состоит из жерла (канал)». При закупорке жерла вязкой магмой происходит мощный взрыв.',
    },
    {
      id: 'crater',
      name: 'Кратер',
      icon: '▼',
      x: 50,
      y: 38,
      badge: '▼ КРАТЕР (выход наверху)',
      title: 'Кратер вулкана',
      description: 'Воронкообразное или чашеобразное углубление на вершине вулканической горы, через которое из глубин Земли выходит магма.',
      rule: 'В конспекте: «Вулкан — это гора с кратером, через которое из глубин Земли выходит магма».',
    },
    {
      id: 'lava',
      name: 'Лава на склонах',
      icon: '🔥',
      x: 35,
      y: 52,
      badge: '🔥 ЛАВА (стекает по склону)',
      title: 'Лава вулкана',
      description: 'Расплавленная магма, которая уже излилась на поверхность Земли, потеряла растворённые газы и водяной пар, и течёт по склонам.',
      rule: 'В конспекте: «На поверхности магма становится лавой. Извержение может быть спокойным (лава стекает)».',
    },
    {
      id: 'ash',
      name: 'Облако пепла и газы',
      icon: '💨',
      x: 50,
      y: 15,
      badge: '💨 ОБЛАКО ПЕПЛА И ГАЗЫ',
      title: 'Облако пепла, газы и бомбы',
      description: 'Вместе с лавой из кратера вылетают пепел, раскалённые газы и вулканические камни (бомбы).',
      rule: 'В конспекте: «а вместе с ней вылетают пепел, газы и камни. Извержение может быть взрывным (пепел, взрыв)».',
    },
  ];

  // =========================================================================
  // MODE 4: КАРТОЧКИ SM-2
  // =========================================================================
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsFilter, setCardsFilter] = useState('due'); // 'due' | 'all'
  const [cardsCompleted, setCardsCompleted] = useState(false);

  const dueCards = useMemo(() => {
    return ALL_LITHOSPHERE_CARDS.filter((card) => isItemDue(srsStorage[card.id]));
  }, [srsStorage]);

  const activeCards = useMemo(() => {
    if (cardsFilter === 'due') {
      return dueCards.length > 0 ? dueCards : ALL_LITHOSPHERE_CARDS;
    }
    return ALL_LITHOSPHERE_CARDS;
  }, [cardsFilter, dueCards]);

  const currentCard = activeCards[cardIndex] || null;
  const currentCardSRS = currentCard ? srsStorage[currentCard.id] : null;
  const cardIntervals = useMemo(() => getIntervalPreview(currentCardSRS), [currentCardSRS]);

  const handleCardGrade = (grade) => {
    playClick();
    if (!currentCard) return;

    const currentSRS = srsStorage[currentCard.id];
    const newSRS = calculateSM2(currentSRS, grade);
    onSaveSRS({ ...srsStorage, [currentCard.id]: newSRS });

    setIsFlipped(false);
    if (cardIndex + 1 < activeCards.length) {
      setCardIndex((prev) => prev + 1);
    } else {
      setCardsCompleted(true);
      playFanfare();
      confetti({ particleCount: 90, spread: 80 });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-2.5 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">
      {/* Hero Banner with exact core facts from docx */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-amber-600/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-900/80 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                Тема по конспекту
              </span>
              <span className="text-xs text-amber-200/80 font-bold">
                Толщина: {LITHOSPHERE_CORE_FACTS.thickness}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-1.5 mb-1 text-white flex items-center gap-2">
              <Layers className="w-7 h-7 text-amber-400" />
              {LITHOSPHERE_CORE_FACTS.title}
            </h2>
            <p className="text-sm text-amber-100 font-medium leading-relaxed">
              {LITHOSPHERE_CORE_FACTS.definition}
            </p>
          </div>

          {/* Sub-modes selector */}
          <div className="flex flex-wrap gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10 text-xs font-bold">
            <button
              onClick={() => {
                playClick();
                setActiveMode('structure');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeMode === 'structure' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-200 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Строение Земли</span>
            </button>

            <button
              onClick={() => {
                playClick();
                setActiveMode('plates');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeMode === 'plates' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-200 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Литосферные плиты</span>
            </button>

            <button
              onClick={() => {
                playClick();
                setActiveMode('processes');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeMode === 'processes' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-200 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Землетрясения и вулканы</span>
            </button>

            <button
              onClick={() => {
                playClick();
                setActiveMode('cards');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeMode === 'cards' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-200 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Карточки ({dueCards.length > 0 ? dueCards.length : ALL_LITHOSPHERE_CARDS.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: ВНУТРЕННЕЕ СТРОЕНИЕ ЗЕМЛИ
          1. Убраны подсказки (текст на картинке 100% закрыт плотными блоками)
          2. Определение Литосферы выведено прямо в заголовок теста
          3. Плашка Литосфера удалена из списка вариантов
         ========================================================================= */}
      {activeMode === 'structure' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm">
            {/* Header with Definition of Lithosphere prominent (User request #2) */}
            <div className="mb-4">
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-2 border-amber-400/80 rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md">
                    Определение темы
                  </span>
                  <span className="text-xs font-bold text-slate-700">Обязательно знать наизусть:</span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-amber-950 leading-snug">
                  ЛИТОСФЕРА — твёрдая оболочка Земли (состоит из земной коры и верхней части мантии).
                </h4>
                <p className="text-xs text-slate-700 mt-1 font-medium">
                  Толщина литосферы: <b>от нескольких километров под океанами до 100–200 км под материками</b>.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>Квиз: Внутреннее строение Земли</span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Найдено: {Object.keys(structureMatches).length} из {structureTargets.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Выберите слой внизу и укажите номер стрелки на схеме (все подсказки скрыты):
                  </p>
                </div>

                {Object.keys(structureMatches).length > 0 && (
                  <button
                    onClick={() => {
                      playClick();
                      setStructureMatches({});
                      setSelectedStructureTerm(null);
                      setStructureWrongFeedback(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold px-2 py-1 rounded-lg hover:bg-slate-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сбросить тест</span>
                  </button>
                )}
              </div>
            </div>

            {/* Selectable Chips: ONLY the 4 internal layers (NO Литосфера chip, NO hints) */}
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-black text-slate-600 self-center mr-1">Выберите слой:</span>
              {layerTermsOnly.map((term) => {
                const isMatched = Object.values(structureMatches).includes(term.id);
                const isSelected = selectedStructureTerm?.id === term.id;
                return (
                  <button
                    key={term.id}
                    onClick={() => {
                      playClick();
                      if (isMatched) {
                        setInspectingItem(term);
                      } else {
                        setSelectedStructureTerm(isSelected ? null : term);
                        setStructureWrongFeedback(null);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm ${
                      isMatched
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : isSelected
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500 shadow-md scale-105'
                        : 'bg-white text-slate-800 border border-slate-300 hover:border-amber-400'
                    }`}
                  >
                    {isMatched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{term.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Error banner */}
            {structureWrongFeedback && (
              <div className="mb-4 bg-red-50 border-2 border-red-300 text-red-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
                <span>{structureWrongFeedback}</span>
                <button onClick={() => setStructureWrongFeedback(null)}>
                  <XCircle className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}

            {/* Interactive Image with Solid Cover Blocks (100% opaque, completely hiding text) */}
            <div className="relative max-w-xl mx-auto rounded-3xl overflow-hidden shadow-lg border-2 border-slate-300 bg-white">
              <img
                src={earthStructureImg}
                alt="Внутреннее строение Земли"
                className="w-full h-auto object-contain block select-none pointer-events-none"
              />

              {/* Target slots overlay: 100% opaque, covers the printed words on the image */}
              {structureTargets.map((target) => {
                const matchedTermId = structureMatches[target.id];
                const matchedTerm = layerTermsOnly.find((t) => t.id === matchedTermId);
                const isMatched = Boolean(matchedTerm);

                return (
                  <div
                    key={target.id}
                    style={{
                      left: `${target.x}%`,
                      top: `${target.y}%`,
                      width: `${target.w}px`,
                      height: `${target.h}px`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
                  >
                    <button
                      onClick={() => {
                        if (selectedStructureTerm) {
                          handleAssignStructureTarget(target, selectedStructureTerm);
                        } else if (isMatched) {
                          setInspectingItem(matchedTerm);
                        }
                      }}
                      className={`w-full h-full rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-1 border-2 select-none ${
                        isMatched
                          ? 'bg-emerald-500 text-white border-emerald-300 ring-2 ring-emerald-300 scale-105'
                          : selectedStructureTerm
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-600 ring-2 ring-amber-500 animate-pulse'
                          : 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
                      }`}
                      title={isMatched ? matchedTerm.name : `Стрелка № ${target.slotNumber}`}
                    >
                      {isMatched ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                          <span className="truncate">{matchedTerm.name}</span>
                        </>
                      ) : (
                        <span>? Слой № {target.slotNumber}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Exact facts from text revealed as educational cards */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                <b className="text-amber-950 block text-sm mb-1">Ядро</b>
                Самое горячее, в центре Земли. <b>Температура достигает до 6000 °C</b>.
              </div>
              <div className="bg-orange-50 p-3.5 rounded-2xl border border-orange-200">
                <b className="text-orange-950 block text-sm mb-1">Мантия</b>
                Огромный слой между ядром и корой (<b>вещество горячее и вязкое</b>).
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                <b className="text-emerald-950 block text-sm mb-1">Земная кора</b>
                Тонкий твёрдый слой, на котором мы живём. <b>Разбита на литосферные плиты</b>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 2: ЛИТОСФЕРНЫЕ ПЛИТЫ
          1. Убрано дублирование названий плит текстом
          2. Текст на картинке 100% надёжно закрыт плотными блоками (без просветов)
          3. Полноценный квиз в стиле поиска горных цепей: «Найдите на карте: [Плита]»
         ========================================================================= */}
      {activeMode === 'plates' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm">
            {/* Header / Quiz Controller */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-amber-600" />
                  <span>Квиз: Литосферные плиты Земли</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Земная кора разбита на литосферные плиты (движутся на несколько см в год). Угадайте их на карте:
                </p>
              </div>

              {/* Progress counter & reset */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  Найдено: {Object.keys(platesSolved).length} из {TECTONIC_PLATES.length}
                </span>
                <button
                  onClick={handleResetPlatesQuiz}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold px-2 py-1 rounded-lg hover:bg-slate-100"
                  title="Начать заново в случайном порядке"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Перезапустить</span>
                </button>
              </div>
            </div>

            {/* Current Target Question Box (like Mountains map quiz!) */}
            {!isPlatesQuizCompleted && currentPlateTarget && (
              <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-4 mb-4 text-slate-950 shadow-md border-2 border-amber-300 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-lg shadow-sm">
                    {plateTargetIndex + 1}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-300 px-2 py-0.5 rounded-md">
                      Задание квиза
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-slate-950 mt-0.5">
                      Найдите на карте: <span className="underline decoration-slate-950 decoration-2">{currentPlateTarget.name}</span>
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRevealCurrentPlate}
                    className="px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-950 text-amber-300 text-xs font-black transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Показать где это</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quiz Completion Banner */}
            {isPlatesQuizCompleted && (
              <div className="bg-emerald-500 text-white rounded-2xl p-4 mb-4 shadow-lg flex items-center justify-between gap-3 animate-in zoom-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black text-xl shadow">
                    🏆
                  </div>
                  <div>
                    <h4 className="text-base font-black">Превосходно! Все 12 литосферных плит найдены!</h4>
                    <p className="text-xs text-emerald-100">
                      Вы отлично знаете карту границ столкновения и раздвижения литосферных плит.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetPlatesQuiz}
                  className="px-3.5 py-2 rounded-xl bg-white text-emerald-800 text-xs font-black hover:bg-emerald-50 shadow"
                >
                  Пройти ещё раз
                </button>
              </div>
            )}

            {/* Error Feedback Banner */}
            {plateWrongFeedback && (
              <div className="mb-3 bg-red-50 border-2 border-red-300 text-red-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
                <span>{plateWrongFeedback}</span>
                <button onClick={() => setPlateWrongFeedback(null)}>
                  <XCircle className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}

            {/* Boundaries Legend Rules from docx */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3 text-xs font-bold">
              <div className="bg-red-50 border-2 border-red-300 p-2.5 rounded-xl text-red-950 flex items-center gap-2">
                <span className="text-lg font-black text-red-600">〰️</span>
                <span>
                  <b>Зубчатая красная линия:</b> Столкновение плит → <b>образуются горы и происходят землетрясения</b>.
                </span>
              </div>
              <div className="bg-blue-50 border-2 border-blue-300 p-2.5 rounded-xl text-blue-950 flex items-center gap-2">
                <span className="text-lg font-black text-blue-600">➖</span>
                <span>
                  <b>Прямая красная линия:</b> Раздвижение плит → <b>появляются разломы, извергаются вулканы</b>.
                </span>
              </div>
            </div>

            {/* Interactive Map with 100% OPAQUE Text Masking Blocks */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-lg border-2 border-slate-300 bg-white select-none">
              <img
                src={tectonicPlatesImg}
                alt="Карта литосферных плит"
                className="w-full h-auto object-contain block select-none pointer-events-none"
              />

              {/* SVG CALLOUT LEADER LINES FOR SMALL PLATES */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {smallPlateCallouts.map((item) => {
                  const isSolved = Boolean(platesSolved[item.plateId]);
                  const isRevealed = plateRevealedId === item.plateId;
                  const strokeColor = isSolved ? '#10b981' : isRevealed ? '#f59e0b' : '#f97316';

                  return (
                    <g key={`callout-line-${item.plateId}`}>
                      <line
                        x1={`${item.pin.x}%`}
                        y1={`${item.pin.y}%`}
                        x2={`${item.callout.x}%`}
                        y2={`${item.callout.y}%`}
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        strokeDasharray={isSolved ? 'none' : '4 3'}
                      />
                      <circle
                        cx={`${item.pin.x}%`}
                        cy={`${item.pin.y}%`}
                        r="4"
                        fill={strokeColor}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* 1. MAJOR PLATES: Orange, proportioned to fit strictly inside plate boundaries */}
              {majorPlateBlocks.map((block, idx) => {
                const isSolved = Boolean(platesSolved[block.plateId]);
                const isRevealed = plateRevealedId === block.plateId;

                return (
                  <div
                    key={`${block.plateId}-${idx}`}
                    style={{
                      left: `${block.x}%`,
                      top: `${block.y}%`,
                      width: `${block.w}px`,
                      height: `${block.h}px`,
                      transform: `translate(-50%, -50%) ${block.rotation ? `rotate(${block.rotation}deg)` : ''}`,
                    }}
                    className="absolute z-20 flex items-center justify-center"
                  >
                    <button
                      onClick={() => handlePlateBlockClick(block.plateId)}
                      className={`w-full h-full ${block.isVertical ? 'rounded-2xl' : 'rounded-xl'} font-black text-center transition-all shadow-md flex items-center justify-center px-2 py-1 border-2 select-none ${
                        isSolved
                          ? 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-300 text-xs shadow-lg'
                          : isRevealed
                          ? 'bg-yellow-400 text-slate-950 border-yellow-200 ring-4 ring-yellow-400 animate-bounce text-xs'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-orange-300 hover:border-amber-200 cursor-pointer hover:scale-105 active:scale-95'
                      }`}
                      title={isSolved ? block.label : 'Нажмите, чтобы выбрать эту плиту'}
                    >
                      {isSolved ? (
                        <span className="text-[11px] font-black flex items-center gap-1 justify-center truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{block.label}</span>
                        </span>
                      ) : isRevealed ? (
                        <span className="text-[11px] font-black animate-pulse truncate">
                          {block.label}
                        </span>
                      ) : (
                        <span className="text-xs font-black tracking-wide">
                          {block.isVertical ? '?' : '? Плита'}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}

              {/* 2. SMALL PLATES: Compact pin on plate + elegant callout tag in open space */}
              {smallPlateCallouts.map((item) => {
                const isSolved = Boolean(platesSolved[item.plateId]);
                const isRevealed = plateRevealedId === item.plateId;

                return (
                  <React.Fragment key={item.plateId}>
                    {/* Compact pin marker on the small plate */}
                    <div
                      style={{ left: `${item.pin.x}%`, top: `${item.pin.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                    >
                      <button
                        onClick={() => handlePlateBlockClick(item.plateId)}
                        className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center transition-all shadow-md border-2 select-none ${
                          isSolved
                            ? 'bg-emerald-600 text-white border-white ring-2 ring-emerald-300 scale-105'
                            : isRevealed
                            ? 'bg-yellow-400 text-slate-950 border-white ring-4 ring-yellow-400 animate-bounce'
                            : 'bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-white border-white cursor-pointer hover:scale-110 active:scale-95'
                        }`}
                        title={isSolved ? item.name : `Малая плита № ${item.number}`}
                      >
                        {isSolved ? '✓' : item.number}
                      </button>
                    </div>

                    {/* Callout tag (выноска) */}
                    <div
                      style={{
                        left: `${item.callout.x}%`,
                        top: `${item.callout.y}%`,
                        width: `${item.callout.w}px`,
                        height: `${item.callout.h}px`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
                    >
                      <button
                        onClick={() => handlePlateBlockClick(item.plateId)}
                        className={`w-full h-full rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center px-2 py-1 border-2 select-none ${
                          isSolved
                            ? 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-300'
                            : isRevealed
                            ? 'bg-yellow-400 text-slate-950 border-yellow-200 ring-4 ring-yellow-400 animate-bounce'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-orange-300 hover:border-amber-200 cursor-pointer hover:scale-105 active:scale-95'
                        }`}
                        title={isSolved ? item.name : `Плита № ${item.number}`}
                      >
                        {isSolved ? (
                          <span className="truncate flex items-center gap-1 font-black text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{item.name}</span>
                          </span>
                        ) : isRevealed ? (
                          <span className="truncate font-black text-[11px] animate-pulse">
                            {item.name}
                          </span>
                        ) : (
                          <span className="font-black text-[11px] flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                              {item.number}
                            </span>
                            <span>Плита: ?</span>
                          </span>
                        )}
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* BOTTOM LEGEND SHIELD: hides the answers to 1-4 printed on the bottom of the image */}
              <div
                style={{ top: '78%', height: '22%' }}
                className="absolute inset-x-0 bottom-0 z-15 bg-slate-900 text-white border-t-2 border-amber-400/80 p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      🔒 Подсказка к малым плитам 1–4
                    </span>
                    <span className="text-[11px] text-slate-300">
                      (Текст внизу карты скрыт, чтобы вы отгадали плиты по памяти)
                    </span>
                  </div>

                  <button
                    onClick={() => setShowBottomLegend(!showBottomLegend)}
                    className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg"
                  >
                    {showBottomLegend ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showBottomLegend ? 'Скрыть подсказку' : 'Показать подсказку'}</span>
                  </button>
                </div>

                {showBottomLegend ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 animate-in fade-in">
                    <div className="bg-white/10 p-1.5 rounded-lg border border-white/10"><b>1:</b> Кокос</div>
                    <div className="bg-white/10 p-1.5 rounded-lg border border-white/10"><b>2:</b> Карибская</div>
                    <div className="bg-white/10 p-1.5 rounded-lg border border-white/10"><b>3:</b> Аравийская</div>
                    <div className="bg-white/10 p-1.5 rounded-lg border border-white/10"><b>4:</b> Филиппинская</div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    Подсказка скрыта. Вспомните: Кокос у Центральной Америки, Карибская между Америками, Аравийская на Ближнем Востоке, Филиппинская в Тихом океане.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 3: ЗЕМЛЕТРЯСЕНИЯ И ВУЛКАНЫ
          Снабжены великолепными 3D-иллюстрациями в разрезе (National Geographic style):
          Очаг, Эпицентр, Цунами, Разрушенные здания, Жерло, Кратер, Лава, Пепел.
         ========================================================================= */}
      {activeMode === 'processes' && (
        <div className="flex flex-col gap-4">
          {/* Subtabs: Землетрясения vs Вулканы */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                playClick();
                setProcessSubTab('earthquake');
              }}
              className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                processSubTab === 'earthquake'
                  ? 'bg-red-600 text-white border-red-400 shadow-lg scale-[1.01]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
              }`}
            >
              <Activity className="w-4 h-4 text-amber-300" />
              <span>Землетрясения (3D-разрез: Очаг, Эпицентр, Цунами, Здания)</span>
            </button>

            <button
              onClick={() => {
                playClick();
                setProcessSubTab('volcano');
              }}
              className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                processSubTab === 'volcano'
                  ? 'bg-orange-600 text-white border-orange-400 shadow-lg scale-[1.01]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Вулканы (3D-разрез: Очаг, Жерло, Кратер, Лава, Пепел)</span>
            </button>
          </div>

          {/* SUBTAB 1: ЗЕМЛЕТРЯСЕНИЯ С ВЫСОКОДЕТАЛИЗИРОВАННОЙ 3D ИЛЛЮСТРАЦИЕЙ */}
          {processSubTab === 'earthquake' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-red-200 shadow-sm flex flex-col gap-5">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                  3D Геологический разрез по конспекту
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-red-600" />
                  <span>Анатомия землетрясения: Очаг, Эпицентр и Последствия</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  <b>Землетрясение</b> — резкие колебания земной поверхности при разрядке напряжения от трения и столкновения плит. Нажмите на плашки схемы для детального разбора:
                </p>
              </div>

              {/* 3D CUTAWAY ILLUSTRATION WITH INTERACTIVE HOTSPOT PINS */}
              <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border-2 border-red-300 shadow-xl bg-slate-950">
                <img
                  src={earthquakeAnatomyImg}
                  alt="3D разрез землетрясения"
                  className="w-full h-auto object-cover block select-none pointer-events-none"
                />

                {/* Hotspot Badges directly positioned on the 3D cutaway */}
                {earthquakeHotspots.map((spot) => {
                  const isSelected = selectedEarthquakeHotspot === spot.id;
                  return (
                    <button
                      key={spot.id}
                      onClick={() => {
                        playClick();
                        setSelectedEarthquakeHotspot(spot.id);
                      }}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-xl flex items-center gap-1.5 border-2 ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-600 ring-4 ring-amber-400/70 scale-110 z-20'
                          : 'bg-slate-900/95 hover:bg-slate-900 text-white border-amber-400/80 hover:scale-105'
                      }`}
                    >
                      <span>{spot.icon}</span>
                      <span>{spot.badge.replace(/[⚡★🏢🌊]\s*/, '')}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Hotspot Explanation Card */}
              {(() => {
                const spot = earthquakeHotspots.find((s) => s.id === selectedEarthquakeHotspot) || earthquakeHotspots[0];
                return (
                  <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-2xl p-4 sm:p-5 border-2 border-red-300 shadow-md animate-in fade-in">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{spot.icon}</span>
                      <h4 className="text-base sm:text-lg font-black text-red-950">{spot.title}</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed mb-2">
                      {spot.description}
                    </p>
                    <div className="text-xs font-bold text-red-900 bg-white/80 p-2.5 rounded-xl border border-red-200">
                      📌 <b>Ключевой факт конспекта:</b> {spot.rule}
                    </div>
                  </div>
                );
              })()}

              {/* 4 Cards Breakdown from docx */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-red-50 p-3.5 rounded-2xl border-2 border-red-200">
                  <span className="text-red-900 font-black text-sm block mb-1">Очаг землетрясения</span>
                  Место, где происходит разрыв пластов (<b>он находится глубоко под землёй</b>).
                </div>
                <div className="bg-amber-50 p-3.5 rounded-2xl border-2 border-amber-300">
                  <span className="text-amber-950 font-black text-sm block mb-1">Эпицентр</span>
                  Точка на поверхности ровно над очагом (<b>там трясёт сильнее всего</b>).
                </div>
                <div className="bg-blue-50 p-3.5 rounded-2xl border-2 border-blue-200">
                  <span className="text-blue-950 font-black text-sm block mb-1">Цунами и опасности</span>
                  Землетрясения опасны <b>обрушением зданий, оползнями и цунами</b> (при подводных толчках).
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200">
                  <span className="text-slate-900 font-black text-sm block mb-1">Шкала Рихтера</span>
                  Силу землетрясения измеряют <b>по шкале Рихтера (в баллах)</b>.
                </div>
              </div>

              <div className="bg-red-100/70 p-3.5 rounded-2xl border border-red-300 text-xs text-red-950 font-bold flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <span>
                  <b>Самые частые зоны:</b> Тихоокеанское «огненное кольцо», где расположено больше всего границ плит и действующих вулканов.
                </span>
              </div>
            </div>
          )}

          {/* SUBTAB 2: ВУЛКАНЫ С ВЫСОКОДЕТАЛИЗИРОВАННОЙ 3D ИЛЛЮСТРАЦИЕЙ */}
          {processSubTab === 'volcano' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-orange-200 shadow-sm flex flex-col gap-5">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full">
                  3D Геологический разрез вулкана
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-600" />
                  <span>Строение вулкана: Очаг магмы, Жерло, Кратер, Лава и Пепел</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  <b>Вулкан</b> — гора с кратером, через которое из глубин Земли выходит магма (на поверхности становится лавой, пеплом и газами). Нажмите на элементы:
                </p>
              </div>

              {/* 3D CUTAWAY VOLCANO WITH INTERACTIVE HOTSPOT PINS */}
              <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border-2 border-orange-300 shadow-xl bg-slate-950">
                <img
                  src={volcanoAnatomyImg}
                  alt="3D разрез вулкана"
                  className="w-full h-auto object-cover block select-none pointer-events-none"
                />

                {/* Hotspot Badges on Volcano 3D */}
                {volcanoHotspots.map((spot) => {
                  const isSelected = selectedVolcanoHotspot === spot.id;
                  return (
                    <button
                      key={spot.id}
                      onClick={() => {
                        playClick();
                        setSelectedVolcanoHotspot(spot.id);
                      }}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-xl flex items-center gap-1.5 border-2 ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-600 ring-4 ring-amber-400/70 scale-110 z-20'
                          : 'bg-slate-900/95 hover:bg-slate-900 text-white border-amber-400/80 hover:scale-105'
                      }`}
                    >
                      <span>{spot.icon}</span>
                      <span>{spot.badge.replace(/[⚡◀▼🔥💨]\s*/, '')}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Volcano Hotspot Explanation Card */}
              {(() => {
                const spot = volcanoHotspots.find((s) => s.id === selectedVolcanoHotspot) || volcanoHotspots[0];
                return (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 sm:p-5 border-2 border-orange-300 shadow-md animate-in fade-in">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{spot.icon}</span>
                      <h4 className="text-base sm:text-lg font-black text-orange-950">{spot.title}</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed mb-2">
                      {spot.description}
                    </p>
                    <div className="text-xs font-bold text-orange-900 bg-white/80 p-2.5 rounded-xl border border-orange-200">
                      📌 <b>Ключевой факт конспекта:</b> {spot.rule}
                    </div>
                  </div>
                );
              })()}

              {/* Exact Rules and Classifications from docx */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-200">
                  <span className="text-orange-950 font-black text-sm block mb-1">Строение вулкана</span>
                  Состоит из <b>очага</b> (глубоко под землёй), <b>жерла</b> (канал) и <b>кратера</b> (выход наверху).
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-200">
                  <span className="text-amber-950 font-black text-sm block mb-1">Виды извержений</span>
                  Извержение может быть <b>спокойным</b> (лава просто стекает по склону) или <b>взрывным</b> (столб пепла, взрывы, газы).
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border-2 border-stone-300">
                  <span className="text-stone-900 font-black text-sm block mb-1">Действующие и потухшие</span>
                  <b>Действующие</b> извергаются время от времени. <b>Потухшие</b> — уже не извергаются.
                </div>
              </div>

              <div className="bg-amber-100/70 p-3.5 rounded-2xl border border-amber-300 text-xs text-amber-950 font-bold flex items-center gap-2">
                <span className="text-lg">🌋</span>
                <span>
                  <b>Размещение:</b> Вулканы чаще всего находятся на границах плит, но бывают и в других «горячих точках» (пример из конспекта: <b>Гавайские острова</b>).
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 4: SM-2 КАРТОЧКИ ДЛЯ ИНТЕРВАЛЬНОГО ПОВТОРЕНИЯ
         ========================================================================= */}
      {activeMode === 'cards' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                onClick={() => {
                  setCardsFilter('due');
                  setCardIndex(0);
                  setIsFlipped(false);
                  setCardsCompleted(false);
                }}
                className={`px-3 py-1 rounded-lg transition-all ${
                  cardsFilter === 'due' ? 'bg-amber-400 text-slate-950 shadow-sm font-black' : 'text-slate-600'
                }`}
              >
                К повтору ({dueCards.length})
              </button>
              <button
                onClick={() => {
                  setCardsFilter('all');
                  setCardIndex(0);
                  setIsFlipped(false);
                  setCardsCompleted(false);
                }}
                className={`px-3 py-1 rounded-lg transition-all ${
                  cardsFilter === 'all' ? 'bg-amber-400 text-slate-950 shadow-sm font-black' : 'text-slate-600'
                }`}
              >
                Все ({ALL_LITHOSPHERE_CARDS.length})
              </button>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Карточка {cardIndex + 1} из {activeCards.length}
            </span>
          </div>

          {!cardsCompleted && currentCard && (
            <div className="w-full max-w-lg flex flex-col gap-4">
              <div
                onClick={() => {
                  playClick();
                  setIsFlipped(!isFlipped);
                }}
                className="w-full min-h-[220px] bg-gradient-to-br from-slate-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer shadow-xl border-2 border-amber-400/40 hover:scale-[1.01] transition-transform select-none"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-black/40 px-2 py-0.5 rounded">
                    {currentCard.category}
                  </span>
                  <span className="text-xs text-slate-400">Нажмите, чтобы перевернуть</span>
                </div>

                <div className="my-4 text-center">
                  {!isFlipped ? (
                    <div>
                      <h4 className="text-xl sm:text-2xl font-black text-amber-300 mb-2">
                        {currentCard.title}
                      </h4>
                      <p className="text-xs text-slate-300">Что это такое по конспекту?</p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in">
                      <p className="text-sm sm:text-base font-bold text-white mb-2 leading-relaxed">
                        {currentCard.description}
                      </p>
                      {currentCard.details && (
                        <p className="text-xs text-amber-200/90 mb-1">{currentCard.details}</p>
                      )}
                      {currentCard.fact && (
                        <div className="text-xs text-amber-300 font-black mt-2">
                          ★ {currentCard.fact}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Повторений: {currentCardSRS?.repetitions || 0}</span>
                  <span>{isFlipped ? 'Оцените знание внизу' : 'Показать ответ'}</span>
                </div>
              </div>

              {isFlipped && (
                <div className="flex gap-2 animate-in fade-in">
                  <button
                    onClick={() => handleCardGrade(1)}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow transition-all"
                  >
                    Повторить ({cardIntervals[1]} дн.)
                  </button>
                  <button
                    onClick={() => handleCardGrade(3)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition-all"
                  >
                    Хорошо ({cardIntervals[3]} дн.)
                  </button>
                  <button
                    onClick={() => handleCardGrade(5)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition-all"
                  >
                    Легко ({cardIntervals[5]} дн.)
                  </button>
                </div>
              )}
            </div>
          )}

          {cardsCompleted && (
            <div className="text-center py-8 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-3xl font-black shadow-lg">
                ★
              </div>
              <h3 className="text-xl font-black text-slate-900">Сессия повторения завершена!</h3>
              <p className="text-xs text-slate-600 max-w-sm">
                Все карточки литосферы на сегодня повторены. Интервалы памяти обновлены.
              </p>
              <button
                onClick={() => {
                  setCardsFilter('all');
                  setCardIndex(0);
                  setIsFlipped(false);
                  setCardsCompleted(false);
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 shadow"
              >
                Повторить все карточки заново
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
