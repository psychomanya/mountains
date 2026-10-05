import React from 'react';
import { ALL_MAP_ITEMS } from '../data/mountainsData';
import { ALL_TERMS } from '../data/termsData';
import { getMasteryLevel, isItemDue } from '../utils/srs';
import { playClick } from '../utils/audio';
import { Trophy, Award, Calendar, CheckCircle2, RotateCcw, Compass, MapPin, Mountain, Flame, Star } from 'lucide-react';

export default function ExpeditionStats({ mapSRS, termsSRS, onResetAll }) {
  // Compute Map Stats
  const mapLearned = ALL_MAP_ITEMS.filter((item) => (mapSRS[item.id]?.repetitions || 0) > 0);
  const mapMastered = ALL_MAP_ITEMS.filter((item) => (mapSRS[item.id]?.repetitions || 0) >= 3);
  const mapDue = ALL_MAP_ITEMS.filter((item) => isItemDue(mapSRS[item.id]));

  // Compute Terms Stats
  const termsLearned = ALL_TERMS.filter((item) => (termsSRS[item.id]?.repetitions || 0) > 0);
  const termsMastered = ALL_TERMS.filter((item) => (termsSRS[item.id]?.repetitions || 0) >= 3);
  const termsDue = ALL_TERMS.filter((item) => isItemDue(termsSRS[item.id]));

  // Overall Score
  const totalItems = ALL_MAP_ITEMS.length + ALL_TERMS.length;
  const totalLearned = mapLearned.length + termsLearned.length;
  const totalMastered = mapMastered.length + termsMastered.length;
  const percentComplete = Math.round((totalLearned / totalItems) * 100);

  // Determine Title / Rank
  let rankTitle = 'Новичок экспедиции';
  let rankStars = 1;
  let rankColor = 'from-slate-700 to-slate-900';

  if (totalMastered >= 25) {
    rankTitle = 'Мастер горных вершин';
    rankStars = 5;
    rankColor = 'from-purple-800 to-indigo-950';
  } else if (totalLearned >= 20) {
    rankTitle = 'Покоритель континентов';
    rankStars = 4;
    rankColor = 'from-amber-600 to-amber-900';
  } else if (totalLearned >= 10) {
    rankTitle = 'Опытный топограф';
    rankStars = 3;
    rankColor = 'from-teal-700 to-emerald-950';
  } else if (totalLearned >= 3) {
    rankTitle = 'Следопыт-исследователь';
    rankStars = 2;
    rankColor = 'from-emerald-700 to-slate-900';
  }

  // Badges
  const badges = [
    {
      id: 'first-step',
      title: 'Первый привал',
      desc: 'Выучен хотя бы один горный объект',
      unlocked: totalLearned >= 1,
      icon: Compass,
    },
    {
      id: 'summits-master',
      title: 'Покоритель 5 вершин',
      desc: 'Все 5 ключевых вершин планеты выучены с фактами',
      unlocked: ALL_MAP_ITEMS.filter((i) => i.type === 'summit').every((i) => (mapSRS[i.id]?.repetitions || 0) > 0),
      icon: Mountain,
    },
    {
      id: 'geologist',
      title: 'Вулканолог-эксперт',
      desc: 'Строение вулкана и недр освоены на отлично',
      unlocked: (termsSRS['term-crater']?.repetitions || 0) > 0 && (termsSRS['term-vent']?.repetitions || 0) > 0,
      icon: Flame,
    },
    {
      id: 'map-pro',
      title: 'Картограф планеты',
      desc: 'Все горные цепи мира найдены на карте',
      unlocked: ALL_MAP_ITEMS.filter((i) => i.type === 'range').every((i) => (mapSRS[i.id]?.repetitions || 0) > 0),
      icon: MapPin,
    },
    {
      id: 'master',
      title: 'Золотая медаль географа',
      desc: 'Более 20 объектов переведены на интервал долгосрочной памяти',
      unlocked: totalMastered >= 20,
      icon: Trophy,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 flex flex-col gap-6">
      {/* Rank & Profile Card */}
      <div className={`bg-gradient-to-r ${rankColor} text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-wrap items-center justify-between gap-6`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-300 text-xs uppercase font-extrabold tracking-wider">
                Звание исследователя
              </span>
              <div className="text-amber-400 text-xs">
                {'★'.repeat(rankStars)}
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">{rankTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1">
              Изучено {totalLearned} из {totalItems} объектов ({percentComplete}%)
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full sm:w-64 bg-black/30 rounded-2xl p-3 border border-white/10">
          <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-200">
            <span>Прогресс атласа</span>
            <span>{percentComplete}%</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-500 rounded-full"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Independent Schedule Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Map Schedule */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-base">Расписание: Карта</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">{ALL_MAP_ITEMS.length} объектов</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center my-3">
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <div className="text-lg font-black text-emerald-800">{mapLearned.length}</div>
              <div className="text-[10px] text-emerald-700 font-semibold uppercase">В процессе</div>
            </div>
            <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100">
              <div className="text-lg font-black text-purple-800">{mapMastered.length}</div>
              <div className="text-[10px] text-purple-700 font-semibold uppercase">Освоено (Мастер)</div>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
              <div className="text-lg font-black text-amber-800">{mapDue.length}</div>
              <div className="text-[10px] text-amber-700 font-semibold uppercase">К повтору сегодня</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Интервалы увеличиваются при правильных ответах от 1 до 6+ дней.
          </p>
        </div>

        {/* Terms Schedule */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mountain className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-slate-900 text-base">Расписание: Термины</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">{ALL_TERMS.length} понятий</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center my-3">
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <div className="text-lg font-black text-emerald-800">{termsLearned.length}</div>
              <div className="text-[10px] text-emerald-700 font-semibold uppercase">В процессе</div>
            </div>
            <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100">
              <div className="text-lg font-black text-purple-800">{termsMastered.length}</div>
              <div className="text-[10px] text-purple-700 font-semibold uppercase">Освоено (Мастер)</div>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
              <div className="text-lg font-black text-amber-800">{termsDue.length}</div>
              <div className="text-[10px] text-amber-700 font-semibold uppercase">К повтору сегодня</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Охватывает рельеф, типы склонов, жерло, кратер и отличие лавы от мантии.
          </p>
        </div>
      </div>

      {/* Badges / Achievements */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          Достижения исследователя
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                  b.unlocked
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                    : 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    b.unlocked ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black">{b.title}</h4>
                  <p className="text-[11px] mt-0.5 leading-snug">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Progress Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => {
            if (window.confirm('Вы уверены, что хотите сбросить весь прогресс и начать сначала?')) {
              playClick();
              onResetAll();
            }
          }}
          className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Сбросить прогресс обучения
        </button>
      </div>
    </div>
  );
}
