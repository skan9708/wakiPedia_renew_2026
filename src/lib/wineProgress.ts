export type WineProgress = {
  level: number;
  completedBottles: number;
  current: number;
  required: number;
  remaining: number;
  nextMilestone: number;
  percent: number;
};

export type WineLevelTier = { minLevel: number; maxLevel: number | null; name: string };

export const WINE_LEVEL_TIERS: WineLevelTier[] = [
  { minLevel: 1, maxLevel: 3, name: '와인생활 시작' },
  { minLevel: 4, maxLevel: 6, name: '와린이' },
  { minLevel: 7, maxLevel: 10, name: '와인 탐험가' },
  { minLevel: 11, maxLevel: 15, name: '와인 덕후' },
  { minLevel: 16, maxLevel: 20, name: '취향 수집가' },
  { minLevel: 21, maxLevel: 30, name: '와인 마스터' },
  { minLevel: 31, maxLevel: null, name: '와인 전설' },
];

export function getWineLevelTier(level: number): WineLevelTier {
  return WINE_LEVEL_TIERS.find((tier) => level >= tier.minLevel && (tier.maxLevel === null || level <= tier.maxLevel))
    ?? WINE_LEVEL_TIERS[0];
}

// Reaching level N means completing the previous N - 1 bottles.
export function wineCountAtLevel(level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return safeLevel * safeLevel - 1;
}

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
