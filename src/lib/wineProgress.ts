export type WineProgress = {
  level: number;
  completedBottles: number;
  current: number;
  required: number;
  remaining: number;
  nextMilestone: number;
  percent: number;
};

// Each new bottle takes two more distinct wines than the previous one.
export function getWineProgress(wineCount: number): WineProgress {
  const count = Number.isFinite(wineCount) ? Math.max(0, Math.floor(wineCount)) : 0;
  let completedBottles = 0;
  let countAtBottleStart = 0;
  let required = 3;

  while (count >= countAtBottleStart + required) {
    countAtBottleStart += required;
    completedBottles += 1;
    required += 2;
  }

  const current = count - countAtBottleStart;
  return {
    level: completedBottles + 1,
    completedBottles,
    current,
    required,
    remaining: required - current,
    nextMilestone: countAtBottleStart + required,
    percent: (current / required) * 100,
  };
}
