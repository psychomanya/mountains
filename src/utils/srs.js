// SuperMemo SM-2 Spaced Repetition Algorithm Implementation

export const DEFAULT_ITEM_SRS = {
  repetitions: 0,
  interval: 0, // in days
  easeFactor: 2.5,
  dueDate: null, // null means never reviewed, available immediately
  lastReviewDate: null,
  history: [],
};

/**
 * Calculate the next review schedule based on SM-2
 * @param {Object} current - current SRS item state
 * @param {number} grade - 1 (Снова), 2 (Трудно), 3 (Хорошо), 4 (Легко)
 * @returns {Object} updated SRS state
 */
export function calculateSM2(current = DEFAULT_ITEM_SRS, grade) {
  const item = current || DEFAULT_ITEM_SRS;
  const now = Date.now();
  let { repetitions = 0, interval = 0, easeFactor = 2.5 } = item;

  // Clone state
  let nextRepetitions = repetitions;
  let nextInterval = interval;
  let nextEaseFactor = easeFactor;
  let nextDueDate;

  const MIN_EF = 1.3;
  const MAX_EF = 3.0;

  switch (grade) {
    case 1: // Снова (Again) - complete failure
      nextRepetitions = 0;
      nextInterval = 0;
      nextEaseFactor = Math.max(MIN_EF, nextEaseFactor - 0.2);
      // Review again in 10 minutes
      nextDueDate = new Date(now + 10 * 60 * 1000).toISOString();
      break;

    case 2: // Трудно (Hard) - remembered with great effort
      if (nextRepetitions === 0) {
        nextInterval = 1;
        nextRepetitions = 1;
      } else {
        nextInterval = Math.max(1, Math.round(nextInterval * 1.2));
      }
      nextEaseFactor = Math.max(MIN_EF, nextEaseFactor - 0.15);
      nextDueDate = new Date(now + nextInterval * 24 * 60 * 60 * 1000).toISOString();
      break;

    case 3: // Хорошо (Good) - standard correct recall
      if (nextRepetitions === 0) {
        nextInterval = 1;
      } else if (nextRepetitions === 1) {
        nextInterval = 4;
      } else {
        nextInterval = Math.max(2, Math.round(nextInterval * nextEaseFactor));
      }
      nextRepetitions += 1;
      nextEaseFactor = Math.max(MIN_EF, Math.min(MAX_EF, nextEaseFactor + 0.05));
      nextDueDate = new Date(now + nextInterval * 24 * 60 * 60 * 1000).toISOString();
      break;

    case 4: // Легко (Easy) - instant confident recall
      if (nextRepetitions === 0) {
        nextInterval = 2;
      } else if (nextRepetitions === 1) {
        nextInterval = 6;
      } else {
        nextInterval = Math.max(3, Math.round(nextInterval * nextEaseFactor * 1.3));
      }
      nextRepetitions += 1;
      nextEaseFactor = Math.min(MAX_EF, nextEaseFactor + 0.15);
      nextDueDate = new Date(now + nextInterval * 24 * 60 * 60 * 1000).toISOString();
      break;

    default:
      nextDueDate = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  }

  return {
    repetitions: nextRepetitions,
    interval: nextInterval,
    easeFactor: Number(nextEaseFactor.toFixed(2)),
    dueDate: nextDueDate,
    lastReviewDate: new Date(now).toISOString(),
    history: [
      ...(item.history || []).slice(-9),
      { date: new Date(now).toISOString(), grade, interval: nextInterval }
    ]
  };
}

/**
 * Predict next intervals for button labels in UI
 */
export function getIntervalPreview(current = DEFAULT_ITEM_SRS) {
  const item = current || DEFAULT_ITEM_SRS;
  const again = '10 мин';
  let hard = '1 дн';
  let good = '1 дн';
  let easy = '2 дн';

  const reps = item.repetitions || 0;
  const int = item.interval || 0;
  const ef = item.easeFactor || 2.5;

  if (reps === 0) {
    hard = '1 дн';
    good = '1 дн';
    easy = '2 дн';
  } else if (reps === 1) {
    hard = Math.max(1, Math.round(int * 1.2)) + ' дн';
    good = '4 дн';
    easy = '6 дн';
  } else {
    hard = Math.max(1, Math.round(int * 1.2)) + ' дн';
    good = Math.max(2, Math.round(int * ef)) + ' дн';
    easy = Math.max(3, Math.round(int * ef * 1.3)) + ' дн';
  }

  return { again, hard, good, easy };
}

/**
 * Check if an item is currently due for review
 */
export function isItemDue(itemSrs) {
  if (!itemSrs || !itemSrs.dueDate) return true; // never reviewed
  return new Date(itemSrs.dueDate).getTime() <= Date.now();
}

/**
 * Filter items that are due today or unlearned
 */
export function getDueItems(items, srsStorage = {}) {
  const storage = srsStorage || {};
  return items.filter(item => {
    const state = storage[item.id];
    return isItemDue(state);
  });
}

/**
 * Human-readable badge / mastery level for children
 */
export function getMasteryLevel(srs) {
  if (!srs || srs.repetitions === 0) {
    return { title: 'Новичок', color: 'bg-slate-200 text-slate-700', stars: 1, level: 1 };
  }
  if (srs.repetitions === 1) {
    return { title: 'Следопыт', color: 'bg-emerald-100 text-emerald-800', stars: 2, level: 2 };
  }
  if (srs.repetitions === 2) {
    return { title: 'Топограф', color: 'bg-teal-100 text-teal-800', stars: 3, level: 3 };
  }
  if (srs.repetitions >= 3 && srs.interval < 15) {
    return { title: 'Покоритель вершин', color: 'bg-amber-100 text-amber-800', stars: 4, level: 4 };
  }
  return { title: 'Мастер гор', color: 'bg-purple-100 text-purple-800', stars: 5, level: 5 };
}

/**
 * Load SRS state from LocalStorage safely
 */
export function loadSRSStorage(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read SRS from localStorage', e);
  }
  return {};
}

/**
 * Save SRS state to LocalStorage
 */
export function saveSRSStorage(storageKey, state) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save SRS to localStorage', e);
  }
}
