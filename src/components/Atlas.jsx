import React, { useState } from 'react';
import { MOUNTAIN_RANGES, KEY_SUMMITS } from '../data/mountainsData';
import { ALL_TERMS, COMPARISON_TOPICS } from '../data/termsData';
import { playClick } from '../utils/audio';
import { Search, MapPin, Mountain, BookOpen, ExternalLink, Flame, HelpCircle } from 'lucide-react';

export default function Atlas() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'ranges' | 'summits' | 'terms'

  const filteredRanges = MOUNTAIN_RANGES.filter(
    (item) =>
      (filter === 'all' || filter === 'ranges') &&
      (item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.continent.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSummits = KEY_SUMMITS.filter(
    (item) =>
      (filter === 'all' || filter === 'summits') &&
      (item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.factInParentheses.toLowerCase().includes(search.toLowerCase()) ||
        item.country.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredTerms = ALL_TERMS.filter(
    (item) =>
      (filter === 'all' || filter === 'terms') &&
      (item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.shortDef.toLowerCase().includes(search.toLowerCase()) ||
        item.fullDef.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 flex flex-col gap-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-700/40">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-emerald-800/80 px-3 py-1 rounded-full border border-emerald-600/40">
            Энциклопедия географа
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 mb-2 text-white">
            Справочник «Атлас исследователя»
          </h2>
          <p className="text-sm text-emerald-100">
            Изучайте местоположение горных систем планеты, факты о величайших вершинах и физические термины строения гор и вулканов.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, факту или термину..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/10 text-white placeholder-slate-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm backdrop-blur-md"
            />
          </div>

          <div className="flex gap-1.5 bg-black/30 p-1 rounded-2xl border border-white/10 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => {
                playClick();
                setFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'all' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => {
                playClick();
                setFilter('ranges');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'ranges' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-200'
              }`}
            >
              Горные цепи (14)
            </button>
            <button
              onClick={() => {
                playClick();
                setFilter('summits');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'summits' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-200'
              }`}
            >
              Вершины и факты (5)
            </button>
            <button
              onClick={() => {
                playClick();
                setFilter('terms');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'terms' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-200'
              }`}
            >
              Термины (14)
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: 5 KEY SUMMITS WITH FACTS */}
      {(filter === 'all' || filter === 'summits') && filteredSummits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Mountain className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-black text-slate-900">
              Главные вершины планеты (с обязательными фактами)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSummits.map((summit) => (
              <div
                key={summit.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-lg font-black text-slate-900">{summit.name}</h4>
                    <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg">
                      {summit.elevation} м
                    </span>
                  </div>

                  {/* Fact in parentheses highlighted */}
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-2.5 rounded-r-xl mb-3 text-xs font-bold text-amber-900">
                    ★ {summit.factInParentheses}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                    {summit.fullFact}
                  </p>

                  {summit.fact2 && (
                    <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/50 text-xs text-slate-700 mb-3">
                      <span className="font-bold text-amber-950">Интересный факт: </span>
                      {summit.fact2}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Горная система: <b>{summit.range}</b></span>
                  <span>Страна: <b>{summit.country}</b></span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION: 14 MOUNTAIN RANGES */}
      {(filter === 'all' || filter === 'ranges') && filteredRanges.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-black text-slate-900">
              Крупнейшие горные массивы мира (14 систем)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRanges.map((range) => (
              <div
                key={range.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-lg font-black text-slate-900">{range.name}</h4>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {range.continent}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-2.5">
                    {range.description}
                  </p>

                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-700 mb-2">
                    <span className="font-semibold text-slate-900">Факт 1: </span>
                    {range.fact}
                  </div>

                  {range.fact2 && (
                    <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-100 text-xs text-slate-700 mb-3">
                      <span className="font-semibold text-emerald-950">Факт 2: </span>
                      {range.fact2}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Высшая точка:</span>
                  <span className="font-bold text-slate-800">{range.maxPeak}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION: TERMS & VOLCANOES */}
      {(filter === 'all' || filter === 'terms') && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-black text-slate-900">
              Словарь терминов: «Горы и вулканы»
            </h3>
          </div>

          {/* Mantle vs Lava special block */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-amber-950 font-black text-base mb-2">
              <Flame className="w-5 h-5 text-red-600" />
              Ключевое отличие: Лава против Мантии
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
              Школьники часто путают лаву, магму и мантию. Важно запомнить:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-2xl border border-amber-200">
                <span className="font-extrabold text-amber-900 block text-sm mb-1">МАНТИЯ:</span>
                Глубочайшая геосфера Земли (до 2900 км в глубину) под земной корой. В ней рождается магма под колоссальным давлением и жаром. Это часть строения самой планеты!
              </div>
              <div className="bg-white p-3 rounded-2xl border border-red-200">
                <span className="font-extrabold text-red-800 block text-sm mb-1">ЛАВА:</span>
                Это расплавленная магма, которая <b>уже излилась на поверхность Земли</b> через жерло или трещину и потеряла растворенные газы и пар на открытом воздухе.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTerms.map((term) => (
              <div
                key={term.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-base font-extrabold text-slate-900">{term.name}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      {term.category}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">{term.shortDef}</p>
                  <p className="text-xs text-slate-600 mb-3">{term.fullDef}</p>
                </div>

                {term.example && (
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 italic">
                    Пример: {term.example}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
