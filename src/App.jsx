import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MapTrainer from './components/MapTrainer';
import TermsTrainer from './components/TermsTrainer';
import Atlas from './components/Atlas';
import ExpeditionStats from './components/ExpeditionStats';
import LithosphereTrainer from './components/LithosphereTrainer';
import { loadSRSStorage, saveSRSStorage, isItemDue } from './utils/srs';
import { ALL_MAP_ITEMS } from './data/mountainsData';
import { ALL_TERMS } from './data/termsData';
import { ALL_LITHOSPHERE_CARDS } from './data/lithosphereData';

const MAP_SRS_KEY = 'mountains_srs_map_v2';
const TERMS_SRS_KEY = 'mountains_srs_terms_v2';
const LITHO_SRS_KEY = 'mountains_srs_litho_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [mapSRS, setMapSRS] = useState({});
  const [termsSRS, setTermsSRS] = useState({});
  const [lithoSRS, setLithoSRS] = useState({});

  // Load saved state on mount
  useEffect(() => {
    setMapSRS(loadSRSStorage(MAP_SRS_KEY));
    setTermsSRS(loadSRSStorage(TERMS_SRS_KEY));
    setLithoSRS(loadSRSStorage(LITHO_SRS_KEY));
  }, []);

  const handleSaveMapSRS = (nextState) => {
    setMapSRS(nextState);
    saveSRSStorage(MAP_SRS_KEY, nextState);
  };

  const handleSaveTermsSRS = (nextState) => {
    setTermsSRS(nextState);
    saveSRSStorage(TERMS_SRS_KEY, nextState);
  };

  const handleSaveLithoSRS = (nextState) => {
    setLithoSRS(nextState);
    saveSRSStorage(LITHO_SRS_KEY, nextState);
  };

  const handleResetAll = () => {
    setMapSRS({});
    setTermsSRS({});
    saveSRSStorage(MAP_SRS_KEY, {});
    saveSRSStorage(TERMS_SRS_KEY, {});
    setLithoSRS({});
    saveSRSStorage(LITHO_SRS_KEY, {});
  };

  // Due counts for Header badges
  const mapDueCount = useMemo(() => {
    return ALL_MAP_ITEMS.filter((item) => isItemDue(mapSRS[item.id])).length;
  }, [mapSRS]);

  const termsDueCount = useMemo(() => {
    return ALL_TERMS.filter((item) => isItemDue(termsSRS[item.id])).length;
  }, [termsSRS]);

  const lithoDueCount = useMemo(() => {
    return ALL_LITHOSPHERE_CARDS.filter((item) => isItemDue(lithoSRS[item.id])).length;
  }, [lithoSRS]);

  // Overall user rank
  const overallRank = useMemo(() => {
    const totalLearned =
      ALL_MAP_ITEMS.filter((i) => (mapSRS[i.id]?.repetitions || 0) > 0).length +
      ALL_TERMS.filter((i) => (termsSRS[i.id]?.repetitions || 0) > 0).length +
      ALL_LITHOSPHERE_CARDS.filter((i) => (lithoSRS[i.id]?.repetitions || 0) > 0).length;

    if (totalLearned >= 50) {
      return { title: 'Мастер географии и литосферы', stars: 5 };
    }
    if (totalLearned >= 30) {
      return { title: 'Покоритель вершин', stars: 4 };
    }
    if (totalLearned >= 15) {
      return { title: 'Топограф', stars: 3 };
    }
    if (totalLearned >= 5) {
      return { title: 'Следопыт', stars: 2 };
    }
    return { title: 'Новичок', stars: 1 };
  }, [mapSRS, termsSRS, lithoSRS]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mapDueCount={mapDueCount}
        termsDueCount={termsDueCount}
        lithoDueCount={lithoDueCount}
        overallRank={overallRank}
      />

      <main className="flex-1 w-full">
        {activeTab === 'map' && (
          <MapTrainer srsStorage={mapSRS} onSaveSRS={handleSaveMapSRS} />
        )}

        {activeTab === 'terms' && (
          <TermsTrainer srsStorage={termsSRS} onSaveSRS={handleSaveTermsSRS} />
        )}

        {activeTab === 'litho' && (
          <LithosphereTrainer srsStorage={lithoSRS} onSaveSRS={handleSaveLithoSRS} />
        )}

        {activeTab === 'atlas' && <Atlas />}

        {activeTab === 'stats' && (
          <ExpeditionStats
            mapSRS={mapSRS}
            termsSRS={termsSRS}
            lithoSRS={lithoSRS}
            onResetAll={handleResetAll}
          />
        )}
      </main>
    </div>
  );
}
