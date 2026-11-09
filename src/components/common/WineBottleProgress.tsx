import { useEffect, useId, useState } from 'react';
import { InfoTooltip } from '@/components/common/InfoTooltip';
import { getWineLevelTier, getWineProgress, wineCountAtLevel, WINE_LEVEL_TIERS } from '@/lib/wineProgress';

const BOTTLE_SHAPE = 'M43 8 H67 V27 C67 33 72 36 77 43 L84 53 C89 61 91 67 91 78 V151 C91 164 84 171 72 171 H38 C26 171 19 164 19 151 V78 C19 67 21 61 26 53 L33 43 C38 36 43 33 43 27 Z';

function getBottleStyle(tierStart: number) {
  if (tierStart >= 31) return { trim: '#8C692E', background: '#F6EDDA' };
  if (tierStart >= 21) return { trim: '#B38C46', background: '#F8F2E5' };
  if (tierStart >= 16) return { trim: '#A56C48', background: '#F9F0E9' };
  if (tierStart >= 11) return { trim: '#713A4B', background: '#F6EDF0' };
  if (tierStart >= 7) return { trim: '#974F59', background: '#F8EEF0' };
  if (tierStart >= 4) return { trim: '#C57D76', background: '#FBF1ED' };
  return { trim: '#A7B621', background: '#F2F4D9' };
}

function CommunityCellarIcon() {
  return (
    <svg viewBox="0 0 112 112" className="h-[88px] w-[88px]" aria-hidden="true">
      <path d="M9 104V47a47 47 0 0 1 94 0v57Z" fill="#f2ece5" stroke="#b9a99b" strokeWidth="2" />
      <path d="M19 56h74M19 93h74" stroke="#9c806f" strokeWidth="3" strokeLinecap="round" />
      <path d="M31 31h7v9l-3 5v10H24V45l4-5v-9h3Z" fill="#974f59" stroke="#70444b" strokeWidth="1.5" />
      <path d="M59 27h7v10l4 6v12H55V43l4-6V27Z" fill="#a7b621" stroke="#788619" strokeWidth="1.5" />
      <path d="M82 34h6v9l3 4v8H79v-8l3-4v-9Z" fill="#974f59" stroke="#70444b" strokeWidth="1.5" />
      <rect x="24" y="68" width="13" height="24" rx="2" fill="#bf8b70" />
      <rect x="39" y="63" width="12" height="29" rx="2" fill="#a7b621" />
      <rect x="53" y="70" width="12" height="22" rx="2" fill="#974f59" />
      <rect x="67" y="66" width="11" height="26" rx="2" fill="#dec5a9" />
      <rect x="80" y="72" width="9" height="20" rx="2" fill="#8f6c63" />
      <path d="M20 102h72" stroke="#9c806f" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function WineBottleProgress({ wineCount, communityReviewCount, onRecord }: { wineCount: number; communityReviewCount: number | null; onRecord: () => void }) {
  const progress = getWineProgress(wineCount);
  const tier = getWineLevelTier(progress.level);
  const style = getBottleStyle(tier.minLevel);
  const clipId = useId();
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedPercent(progress.percent));
    return () => cancelAnimationFrame(frame);
  }, [progress.percent]);

  return (
    <div className="rounded-2xl border border-[#e9e2dc] bg-[#fcfaf7] p-4 shadow-sm">
      <div className="grid gap-4 min-[400px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <InfoTooltip
              label="와인 기록 레벨 설명"
              small
              align="left"
              text={
                <div>
                  <p className="font-semibold">와인병 레벨 안내</p>
                  <p className="mt-2 text-xs leading-5 text-muted">공개·비공개 리뷰 모두 포함해 마셔본 와인을 셉니다. 같은 와인을 여러 번 기록해도 셀러에는 1병으로 표시해요.</p>
                  <p className="mt-2 text-xs leading-5 text-muted">첫 병은 와인 3개, 다음 병은 5개, 그다음은 7개를 기록하면 완성됩니다. 레벨 상한은 없어요.</p>
                  <p className="mt-2 text-xs leading-5 text-muted">이번 병은 {progress.current}/{progress.required}개 채웠고, 다음 병까지 {progress.remaining}개 남았어요.</p>
                  <p className="mt-2 text-xs font-medium">완성한 병 {progress.completedBottles}개 · 다음 병은 총 {progress.nextMilestone}개 기록하면 완성</p>
                  <p className="mt-3 border-t border-border pt-2 text-xs font-semibold">레벨별 이름</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted">
                    {WINE_LEVEL_TIERS.map((item) => {
                      const min = wineCountAtLevel(item.minLevel);
                      const max = item.maxLevel === null ? null : wineCountAtLevel(item.maxLevel + 1) - 1;
                      return (
                        <li key={item.minLevel} className="flex justify-between gap-2">
                          <span>Lv.{item.minLevel}{item.maxLevel === null ? '+' : `–${item.maxLevel}`} {item.name}</span>
                          <span className="shrink-0 tabular-nums">{min}{max === null ? '병부터' : `–${max}병`}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              }
            />
            <p className="text-xs font-semibold text-[#745f51]">나의 와인 셀러</p>
          </div>
          <h3 className="mt-1 text-lg font-bold text-[#352e2c]">Lv.{progress.level} {tier.name}</h3>
          <div className="mt-4 flex items-center gap-1.5">
            <div
              role="progressbar"
              aria-label={`레벨 ${progress.level} 와인병 채우기`}
              aria-valuemin={0}
              aria-valuemax={progress.required}
              aria-valuenow={progress.current}
              aria-valuetext={`이번 병 ${progress.current}개, 완성까지 ${progress.remaining}개`}
              className="w-[76px] shrink-0"
            >
              <svg viewBox="0 0 110 180" className="h-[124px] w-[76px]" aria-hidden="true">
                <defs>
                  <clipPath id={clipId}><path d={BOTTLE_SHAPE} /></clipPath>
                </defs>
                <path d={BOTTLE_SHAPE} fill="#eee8e5" />
                <g clipPath={`url(#${clipId})`}>
                  <rect x="19" y="28" width="72" height="143" fill="#f5efeb" />
                  <rect
                    x="19" y="28" width="72" height="143" fill="#974f59"
                    className="transition-transform duration-700 ease-out motion-reduce:transition-none"
                    style={{ transform: `translateY(${(1 - animatedPercent / 100) * 143}px)` }}
                  />
                  <path d="M32 70 Q30 62 39 49" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
                </g>
                <path d={BOTTLE_SHAPE} fill="none" stroke="#654e4b" strokeWidth="2.5" />
                <rect x="42" y="4" width="26" height="23" rx="3" fill={style.trim} />
                <path d="M43 27 H67" stroke="#654e4b" strokeWidth="2" />
                <rect x="29" y="103" width="52" height="37" rx="4" fill="#fffdf8" stroke={style.trim} strokeWidth="2" />
                <text x="55" y="119" textAnchor="middle" fill="#745f51" fontSize="7" fontWeight="bold">WAKI</text>
                <text x="55" y="132" textAnchor="middle" fill="#453936" fontSize="11" fontWeight="bold">LV.{progress.level}</text>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="whitespace-nowrap text-xl font-bold tabular-nums text-[#352e2c]">
                {progress.current}<span className="ml-1 text-xs font-medium text-[#85776e]">/ {progress.required}개</span>
              </p>
              <button type="button" onClick={onRecord} className="mt-3 whitespace-nowrap rounded-full bg-accent px-3 py-2 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                와인 기록하기
              </button>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-center justify-center border-t border-[#e9e2dc] pt-3 text-center min-[400px]:border-l min-[400px]:border-t-0 min-[400px]:pl-3 min-[400px]:pt-0">
          <CommunityCellarIcon />
          <p className="mt-2 whitespace-nowrap text-xs text-[#745f51]">
            마셔본 와인 <strong className="font-semibold tabular-nums text-[#352e2c]">{wineCount.toLocaleString('ko-KR')}병</strong>
          </p>
          <p className="mt-2 text-xs text-[#745f51]">와키에 쌓인 리뷰</p>
          <p className="text-lg font-bold tabular-nums text-[#352e2c]">
            {communityReviewCount === null ? '—' : communityReviewCount.toLocaleString('ko-KR')}
            {communityReviewCount !== null && <span className="ml-0.5 text-xs font-medium">개</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
