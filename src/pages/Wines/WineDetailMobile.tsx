import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardReview, Review } from '@/components/common/CardReview';
import { RatingStars } from '@/components/common/RatingStars';
import { Heart } from 'lucide-react';

const reviewsSeed: Review[] = Array.from({ length: 3 }).map((_, i) => ({
  id: String(i + 1),
  wineId: 'montperat',
  creator: { id: `u${i+1}`, nickname: i===0 ? '치킨' : i===1 ? '와키' : '시음러' },
  rating: 3.5 + (i % 2),
  text: i===0 ? '이것은 테스트 리뷰 입니다.' : '풍부한 향과 밸런스가 좋았습니다.',
  likeCount: 1 + i,
  createdAt: new Date().toISOString(),
}));

export function WineDetailMobile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const wine = useMemo(() => ({
    id: id ?? 'montperat',
    nameKr: '샤또몽페라',
    nameEng: 'Chateau Mont-Perat',
    regions: 'France',
    breed: 'Merlot, Cabernet Franc',
    tags: ['프랑스', '메를로', '까베르네프랑'],
    imageUrl: 'https://plus.unsplash.com/premium_photo-1682097091093-dd18b37764a5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    ratingAverage: 4.5,
  }), [id]);

  const reviews = reviewsSeed;
  const [isFav, setIsFav] = useState(false);

  const avgRating = useMemo(() => Number(wine.ratingAverage ?? 0), [wine.ratingAverage]);
  const ratingDist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 1..5점
    for (const r of reviews) {
      const rounded = Math.round(r.rating);
      const clamped = Math.min(5, Math.max(1, rounded));
      counts[clamped - 1] += 1;
    }
    return counts;
  }, [reviews]);
  const maxCount = Math.max(1, ...ratingDist);

  // 내 스타일/키워드(데모 데이터) - 마이페이지와 동일 톤
  const myTaste = { body: 2, sweet: 1, acid: 2, tanin: 1 };
  const myKeywords = [
    { text: '블랙베리', weight: 5 },
    { text: '바닐라', weight: 5 },
    { text: '허브', weight: 3 },
    { text: '체리', weight: 7 },
    { text: '스모키', weight: 1 },
    { text: '초콜릿', weight: 3 },
    { text: '커피', weight: 2 },
    { text: '멜론', weight: 2 },
    { text: '오크', weight: 4 },
    { text: '민트', weight: 13 },
    { text: '라임', weight: 8 },
    { text: '플로럴', weight: 2 },
    { text: '스파이시', weight: 3 },
  ];

  return (
    <div className="space-y-4">
      {/* 이미지 */}
      <div className="w-full aspect-[16/10] bg-bgsubtle overflow-hidden pt-3">
        <img src={wine.imageUrl} alt={wine.nameKr} className="w-full h-full object-cover" />
      </div>

      {/* 타이틀 */}
      <div className="px-4">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold text-fg">{wine.nameEng}</div>
          <button
            type="button"
            aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            onClick={() => setIsFav((v) => !v)}
            className={`p-1 -m-1 ${isFav ? 'text-accent' : 'text-muted'}`}
          >
            <Heart className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="text-sm text-muted mt-1">{wine.nameKr}</div>

        <div className="flex flex-wrap gap-2 mt-3">
          {wine.tags.map((t) => (
            <span key={t} className="px-2 py-1 rounded-full bg-bgsubtle text-xs text-muted">{t}</span>
          ))}
        </div>

        <div className="text-sm text-muted mt-2">
          {wine.regions} · <span className="text-accent">{wine.breed}</span>
        </div>

        {/* 별점 요약 (좌: 총 평점 / 우: 평점 비율) */}
        <div className="mt-3 grid grid-cols-2 gap-6 items-center">
          {/* 사용자 총 평점 */}
          <div className="flex flex-col items-center justify-center self-center h-24">
            <div className="text-[12px] text-muted mb-2">사용자 총 평점</div>
            <div className="text-3xl font-semibold">{avgRating.toFixed(1)}</div>
            <div className="mt-1">
              <RatingStars value={avgRating} size="md" />
            </div>
          </div>

          {/* 평점 비율 */}
          <div className="pl-6 border-l border-border">
            <div className="text-[12px] text-muted mb-6 text-center">평점 비율</div>
            <div className="grid grid-cols-5 gap-4 items-end justify-items-center">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDist[star - 1];
                const heightPct = `${(count / maxCount) * 100}%`;
                const isActive = count > 0;
                return (
                  <div key={star} className="relative flex flex-col items-center">
                    {isActive && (
                      <span className="absolute -top-5 inline-flex items-center justify-center rounded-full bg-accent text-white text-[10px] px-1.5 h-4 min-w-[16px] leading-none">
                        {count}
                      </span>
                    )}
                    <div className="w-3 h-24 rounded-full bg-neutral-200 overflow-hidden flex items-end" aria-label={`${star}점 비율`} role="img">
                      <div
                        className={`w-full ${isActive ? 'bg-accent' : 'bg-transparent'}`}
                        style={{ height: heightPct, transition: 'height 200ms ease' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-5 gap-4 justify-items-center text-[12px] text-muted mt-2 px-0.5">
              {[5, 4, 3, 2, 1].map((s) => <span key={s}>{s}점</span>)}
            </div>
          </div>
        </div>

        {/* 내 스타일 */}
        <section className="mt-6">
          <h3 className="text-base font-semibold mb-3">와인 스타일</h3>
          <div className="space-y-5">
            <GaugeRow title="바디" left="매우 가벼움" right="매우 무거움" value={myTaste.body} />
            <GaugeRow title="당도" left="매우 드라이" right="매우 스윗" value={myTaste.sweet} />
            <GaugeRow title="산도" left="매우 부드러움" right="매우 시다" value={myTaste.acid} />
            <GaugeRow title="탄닌" left="매우 부드러움" right="매우 떫음" value={myTaste.tanin} />
          </div>
        </section>

        {/* 나의 와인 키워드 */}
        <section className="mt-6 pb-2">
          <h3 className="text-base font-semibold mb-2">와인 키워드</h3>
          <div className="card p-4">
            <WordCloud words={myKeywords} />
          </div>
        </section>

        {/* 행동 영역 */}
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button className="w-full py-3 rounded-2xl bg-accent text-white" onClick={() => navigate('/reviews/new')}>리뷰 등록하기</button>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/wines/${wine.id}/edit`)}
            onKeyDown={(e) => (e.key === 'Enter' ? navigate(`/wines/${wine.id}/edit`) : null)}
            aria-label="와인 정보 수정하기"
            className="text-[12px] text-neutral-400 self-end cursor-pointer select-none"
          >
            와인 정보 수정하기
          </div>
        </div>
      </div>

      {/* 리뷰 목록 */}
      <div className="px-4 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} onClick={() => navigate(`/reviews/${r.id}`)}>
            <CardReview review={r} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default WineDetailMobile;


type GaugeProps = { title: string; left: string; right: string; value: number };
function GaugeRow({ title, left, right, value }: GaugeProps) {
  const fillPct = `${(value / 4) * 100}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 shrink-0 text-sm text-muted">{title}</div>
      <div className="flex-1">
        <div className="relative h-10">
          <div className="absolute -top-4 left-0 text-[12px] text-muted">{left}</div>
          <div className="absolute -top-4 right-0 text-[12px] text-muted">{right}</div>
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[5px] bg-neutral-200 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[5px] bg-accent rounded-full" style={{ width: fillPct }} />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`w-4 h-4 rounded-full border-2 ${i <= value ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type CloudWord = { text: string; weight: number };
function WordCloud({ words }: { words: CloudWord[] }) {
  const sizePxFor = (w: number) => (w >= 10 ? 26 : w >= 8 ? 22 : w >= 5 ? 20 : w >= 3 ? 16 : 14);
  const classFor = (w: number) => (w >= 8 ? 'text-accent' : w >= 5 ? 'text-fg' : 'text-muted');
  const list = [...words].sort((a,b) => b.weight - a.weight).slice(0,10);

  const placed: Array<{ x: number; y: number; r: number; text: string; weight: number }> = [];
  const R = 90;
  list.forEach((w, idx) => {
    const font = sizePxFor(w.weight);
    const r = font * 0.7;
    let angle = idx * 0.6;
    let radius = 10;
    let found = false;
    for (let iter = 0; iter < 2000 && !found; iter++) {
      const x = R + radius * Math.cos(angle);
      const y = R + radius * Math.sin(angle);
      if (Math.hypot(x - R, y - R) + r > R) { angle += 0.25; radius += 1; continue; }
      let collide = false;
      for (const p of placed) {
        if (Math.hypot(x - p.x, y - p.y) < r + p.r + 6) { collide = true; break; }
      }
      if (!collide) { placed.push({ x, y, r, text: w.text, weight: w.weight }); found = true; }
      else { angle += 0.35; radius += 1; }
    }
  });

  const [tick, setTick] = (window as any).React?.useState?.(0) ?? [0, () => {}];
  (window as any).React?.useEffect?.(() => {
    const t = setInterval(() => setTick((v: number) => v + 1), 2000);
    return () => clearInterval(t);
  }, [setTick]);

  return (
    <div className="relative mx-auto w-full aspect-square max-w-[320px]">
      {placed.map((p, i) => {
        const fontSize = sizePxFor(p.weight);
        const jitterX = ((i + tick) % 3) - 1;
        const jitterY = ((tick + i * 2) % 3) - 1;
        const left = (p.x / (R * 2)) * 100;
        const top = (p.y / (R * 2)) * 100;
        return (
          <span
            key={`${p.text}-${i}`}
            className={`absolute ${classFor(p.weight)} select-none`}
            style={{ left: `${left}%`, top: `${top}%`, transform: `translate(-50%, -50%) translate(${jitterX}px, ${jitterY}px)`, fontSize }}
          >
            {p.text}
          </span>
        );
      })}
      <div className="absolute inset-0 rounded-full ring-1 ring-neutral-200 pointer-events-none" />
    </div>
  );
}

