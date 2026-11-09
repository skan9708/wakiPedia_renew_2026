import { useEffect, useId, useState } from 'react';
import { getWineProgress } from '@/lib/wineProgress';

const BOTTLE_SHAPE = 'M43 8 H67 V27 C67 33 72 36 77 43 L84 53 C89 61 91 67 91 78 V151 C91 164 84 171 72 171 H38 C26 171 19 164 19 151 V78 C19 67 21 61 26 53 L33 43 C38 36 43 33 43 27 Z';

function getBottleStyle(level: number) {
  if (level >= 10) return { name: '와인 셀러', trim: '#B38C46', background: '#F8F2E5' };
  if (level >= 6) return { name: '취향 수집가', trim: '#8A4052', background: '#F8EFF1' };
  if (level >= 3) return { name: '와인 탐험가', trim: '#C57D76', background: '#FBF1ED' };
  if (level === 2) return { name: '와인 입문', trim: '#A7B621', background: '#F2F4D9' };
  return { name: '첫 기록', trim: '#A7B621', background: '#F2F4D9' };
}

export function WineBottleProgress({ wineCount, onRecord }: { wineCount: number; onRecord: () => void }) {
  const progress = getWineProgress(wineCount);
  const style = getBottleStyle(progress.level);
  const clipId = useId();
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedPercent(progress.percent));
    return () => cancelAnimationFrame(frame);
  }, [progress.percent]);

  return (
    <div className="rounded-2xl border border-[#e9e2dc] bg-[#fcfaf7] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#745f51]">나의 와인 셀러</p>
          <h3 className="mt-1 text-lg font-bold text-[#352e2c]">Lv.{progress.level} {style.name}</h3>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-[#584d44]" style={{ backgroundColor: style.background }}>
          완성한 병 {progress.completedBottles}개
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 sm:gap-5">
        <div
          role="progressbar"
          aria-label={`레벨 ${progress.level} 와인병 채우기`}
          aria-valuemin={0}
          aria-valuemax={progress.required}
          aria-valuenow={progress.current}
          aria-valuetext={`이번 병 ${progress.current}종, 완성까지 ${progress.remaining}종`}
          className="w-[96px] shrink-0"
        >
          <svg viewBox="0 0 110 180" className="h-[156px] w-[96px]" aria-hidden="true">
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
          <p className="text-xs text-[#745f51]">이번 병 채우기</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#352e2c]">
            {progress.current}<span className="ml-1 text-sm font-medium text-[#85776e]">/ {progress.required}종</span>
          </p>
          <p className="mt-2 text-sm leading-5 text-[#584d44]">
            {wineCount === 0 ? '첫 와인을 기록해 병을 채워보세요.' : `다음 병까지 ${progress.remaining}종 남았어요.`}
          </p>
          <p className="mt-1 text-xs text-[#85776e]">총 {wineCount}종 기록 · 다음 병은 {progress.nextMilestone}종째</p>
          <button type="button" onClick={onRecord} className="mt-3 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            와인 기록하기
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#85776e]">공개·비공개 기록 모두 포함 · 같은 와인은 한 종류로 계산</p>
    </div>
  );
}
