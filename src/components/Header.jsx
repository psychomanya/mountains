import React, { useState } from 'react';
import { Volume2, VolumeX, MapPin, Compass, BookOpen, Award, Mountain } from 'lucide-react';
import { toggleSound, getSoundEnabled, playClick } from '../utils/audio';

export default function Header({ activeTab, setActiveTab, mapDueCount, termsDueCount, overallRank }) {
  const [soundOn, setSoundOn] = useState(getSoundEnabled());

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) {
      playClick();
    }
  };

  const navItems = [
    {
      id: 'map',
      label: 'Карта гор',
      icon: MapPin,
      dueBadge: mapDueCount,
      color: 'emerald',
    },
    {
      id: 'terms',
      label: 'Термины и вулканы',
      icon: Mountain,
      dueBadge: termsDueCount,
      color: 'amber',
    },
    {
      id: 'atlas',
      label: 'Справочник-Атлас',
      icon: BookOpen,
      dueBadge: null,
      color: 'blue',
    },
    {
      id: 'stats',
      label: 'Дневник экспедиции',
      icon: Award,
      dueBadge: null,
      color: 'purple',
    },
  ];

  return (
    <header className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-md border-b border-emerald-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm text-slate-950 font-black flex-shrink-0">
            <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-[spin_12s_linear_infinite]" />
          </div>
          <h1 className="text-sm sm:text-base font-black tracking-tight text-amber-200 whitespace-nowrap">
            Горы и вершины
          </h1>
        </div>

        {/* Navigation Tabs (Заметные, но компактные по высоте) */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playClick();
                  setActiveTab(item.id);
                }}
                className={`relative px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap shadow-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 border border-amber-300 scale-[1.02]'
                    : 'bg-emerald-950/80 hover:bg-emerald-800/90 text-white hover:text-amber-200 border border-emerald-700/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{item.label}</span>
                {item.dueBadge > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-amber-400 text-slate-950 animate-pulse shadow-sm'
                    }`}
                    title={`К повторению сегодня: ${item.dueBadge}`}
                  >
                    {item.dueBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* User Rank preview badge */}
          {overallRank && (
            <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-600/40 text-[11px]">
              <span className="text-amber-300 font-bold">{overallRank.title}</span>
              <span className="text-amber-400 text-[10px]">{'★'.repeat(overallRank.stars)}</span>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-700/50 text-emerald-200 hover:text-white transition-colors"
            title={soundOn ? 'Выключить звук' : 'Включить звук'}
            aria-label="Переключить звук"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
