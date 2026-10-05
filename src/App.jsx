import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MapTrainer from './components/MapTrainer';
import TermsTrainer from './components/TermsTrainer';
import Atlas from './components/Atlas';
import ExpeditionStats from './components/ExpeditionStats';
import { loadSRSStorage, saveSRSStorage, isItemDue } from './utils/srs';
import { ALL_MAP_ITEMS } from './data/mountainsData';
import { ALL_TERMS } from './data/termsData';

const MAP_SRS_KEY = 'mountains_srs_map_v2';
const TERMS_SRS_KEY = 'mountains_srs_terms_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [mapSRS, setMapSRS] = useState({});
  const [termsSRS, setTermsSRS] = useState({});

  // Load saved state on mount
  useEffect(() => {
    setMapSRS(loadSRSStorage(MAP_SRS_KEY));
    setTermsSRS(loadSRSStorage(TERMS_SRS_KEY));
  }, []);

  const handleSaveMapSRS = (nextState) => {
    setMapSRS(nextState);
    saveSRSStorage(MAP_SRS_KEY, nextState);
  };

  const handleSaveTermsSRS = (nextState) => {
    setTermsSRS(nextState);
    saveSRSStorage(TERMS_SRS_KEY, nextState);
  };

  const handleResetAll = () => {
    setMapSRS({});
    setTermsSRS({});
    saveSRSStorage(MAP_SRS_KEY, {});
    saveSRSStorage(TERMS_SRS_KEY, {});
  };

  // Due counts for Header badges
  const mapDueCount = useMemo(() => {
    return ALL_MAP_ITEMS.filter((item) => isItemDue(mapSRS[item.id])).length;
  }, [mapSRS]);

  const termsDueCount = useMemo(() => {
    return ALL_TERMS.filter((item) => isItemDue(termsSRS[item.id])).length;
  }, [termsSRS]);

  // Overall user rank
  const overallRank = useMemo(() => {
    const totalLearned =
      ALL_MAP_ITEMS.filter((i) => (mapSRS[i.id]?.repetitions || 0) > 0).length +
      ALL_TERMS.filter((i) => (termsSRS[i.id]?.repetitions || 0) > 0).length;

    if (totalLearned >= 25) {
      return { title: 'Мастер гор', stars: 5 };
    }
    if (totalLearned >= 15) {
      return { title: 'Покоритель вершин', stars: 4 };
    }
    if (totalLearned >= 8) {
      return { title: 'Топограф', stars: 3 };
    }
    if (totalLearned >= 2) {
      return { title: 'Следопыт', stars: 2 };
    }
    return { title: 'Новичок', stars: 1 };
  }, [mapSRS, termsSRS]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mapDueCount={mapDueCount}
        termsDueCount={termsDueCount}
        overallRank={overallRank}
      />

      <main className="flex-1 w-full">
        {activeTab === 'map' && (
          <MapTrainer srsStorage={mapSRS} onSaveSRS={handleSaveMapSRS} />
        )}

        {activeTab === 'terms' && (
          <TermsTrainer srsStorage={termsSRS} onSaveSRS={handleSaveTermsSRS} />
        )}

        {activeTab === 'atlas' && <Atlas />}

        {activeTab === 'stats' && (
          <ExpeditionStats
            mapSRS={mapSRS}
            termsSRS={termsSRS}
            onResetAll={handleResetAll}
          />
        )}
      </main>
    </div>
  );
}
