import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardReview, Review } from '@/components/common/CardReview';
import { RatingStars } from '@/components/common/RatingStars';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import defaultWineImg from '@/assets/default-wine.jpg';

type WineDetail = {
  id: number;
  nameKr: string;
  nameEng: string;
  regions: string | null;
  breed: string | null;
  imageUrl: string | null;
  ratingAverage: number | null;
  isFavorite: boolean;
  ratingDistribution: number[];
  avgBody: number | null;
  avgAcidity: number | null;
  avgSweetness: number | null;
  avgTannin: number | null;
  keywords: { text: string; weight: number }[];
  reviews: Review[];
};

export function WineDetailMobile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [wine, setWine] = useState<WineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [imgZoom, setImgZoom] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/wines/${id}/`)
      .then(({ data }) => {
        setWine(data);
        setIsFav(data.isFavorite);
      })
      .catch(() => setWine(null))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFav = async () => {
    if (!token) return navigate('/auth/login');
    try {
      const { data } = await api.post(`/wines/${id}/favorite/`);
      setIsFav(data.isFavorite);
    } catch {}
  };

  const avgRating = useMemo(() => Number(wine?.ratingAverage ?? 0), [wine]);
  const ratingDist = useMemo(() => wine?.ratingDistribution ?? [0, 0, 0, 0, 0], [wine]);
  const maxCount = Math.max(1, ...ratingDist);
  const myTaste = {
    body: wine?.avgBody ?? 2,
    sweet: wine?.avgSweetness ?? 1,
    acid: wine?.avgAcidity ?? 2,
    tanin: wine?.avgTannin ?? 1,
  };

  if (loading) return <div className="p-8 text-center text-muted text-sm">불러오는 중...</div>;
  if (!wine) return <div className="p-8 text-center text-muted text-sm">와인을 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-4">
      {/* 이미지 확대 팝업 */}
      {imgZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setImgZoom(false)}
        >
          <img
            src={wine.imageUrl ?? defaultWineImg}
            alt={wine.nameKr}
            className="max-w-full max-h-full object-contain p-4"
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none"
            onClick={() => setImgZoom(false)}
          >
            ×
          </button>
        </div>
      )}

      {/* 이미지 */}
      <div
        className="w-full aspect-[16/10] bg-bgsubtle overflow-hidden pt-3 cursor-zoom-in"
        onClick={() => setImgZoom(true)}
      >
        <img src={wine.imageUrl ?? defaultWineImg} alt={wine.nameKr} className="w-full h-full object-cover" />
      </div>

      {/* 타이틀 */}
      <div className="px-4">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold text-fg">{wine.nameEng}</div>
          <button type="button" aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'} onClick={toggleFav}
            className={`p-1 -m-1 ${isFav ? 'text-accent' : 'text-muted'}`}>
            <Heart className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="text-sm text-muted mt-1">{wine.nameKr}</div>

        <div className="text-sm text-muted mt-2">
          {wine.regions} {wine.breed && <><span>·</span> <span className="text-accent">{wine.breed}</span></>}
        </div>

        {/* 별점 요약 */}
        <div className="mt-3 grid grid-cols-2 gap-6 items-center">
          <div className="flex flex-col items-center justify-center self-center h-24">
            <div className="text-[12px] text-muted mb-2">사용자 총 평점</div>
            <div className="text-3xl font-semibold">{avgRating.toFixed(1)}</div>
            <div className="mt-1"><RatingStars value={avgRating} size="md" /></div>
          </div>
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
                      <span className="absolute -top-5 inline-flex items-center justify-center rounded-full bg-accent text-white text-[10px] px-1.5 h-4 min-w-[16px] leading-none">{count}</span>
                    )}
                    <div className="w-3 h-24 rounded-full bg-neutral-200 overflow-hidden flex items-end">
                      <div className={`w-full ${isActive ? 'bg-accent' : 'bg-transparent'}`} style={{ height: heightPct, transition: 'height 200ms ease' }} />
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

        {/* 와인 스타일 */}
        <section className="mt-6">
          <h3 className="text-base font-semibold mb-3">와인 스타일</h3>
          <div className="space-y-5">
            <GaugeRow title="바디" left="매우 가벼움" right="매우 무거움" value={myTaste.body} />
            <GaugeRow title="당도" left="매우 드라이" right="매우 스윗" value={myTaste.sweet} />
            <GaugeRow title="산도" left="매우 부드러움" right="매우 시다" value={myTaste.acid} />
            <GaugeRow title="탄닌" left="매우 부드러움" right="매우 떫음" value={myTaste.tanin} />
          </div>
        </section>

        {/* 와인 키워드 */}
        {wine.keywords.length > 0 && (
          <section className="mt-6 pb-2">
            <h3 className="text-base font-semibold mb-2">와인 키워드</h3>
            <div className="card p-4">
              <WordCloud words={wine.keywords} />
            </div>
          </section>
        )}

        {/* 행동 영역 */}
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button className="w-full py-3 rounded-2xl bg-accent text-white" onClick={() => navigate(`/reviews/new?wine_id=${wine.id}`)}>
            리뷰 등록하기
          </button>
        </div>
      </div>

      {/* 리뷰 목록 */}
      <div className="px-4 space-y-3">
        {wine.reviews.map((r) => (
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
  const safeVal = value ?? 0;
  const fillPct = `${(safeVal / 4) * 100}%`;
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
              <span key={i} className={`w-4 h-4 rounded-full border-2 ${i <= safeVal ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type CloudWord = { text: string; weight: number };
function WordCloud({ words }: { words: CloudWord[] }) {
  const list = [...words].sort((a, b) => b.weight - a.weight).slice(0, 8);
  const maxWeight = list[0]?.weight ?? 1;

  const sizePx = (w: number) => {
    const r = w / maxWeight;
    if (r >= 0.7) return 18;
    if (r >= 0.4) return 15;
    return 12;
  };
  const colorClass = (w: number) => {
    const r = w / maxWeight;
    if (r >= 0.7) return '#A7B621';       // accent — 가장 많이 언급
    if (r >= 0.4) return '#6B7C0A';       // accent 어두운톤
    return '#9CA3AF';                      // neutral-400 — 적게 언급
  };

  const placed: Array<{ x: number; y: number; r: number; text: string; weight: number }> = [];
  const R = 100;
  list.forEach((w, idx) => {
    const font = sizePx(w.weight);
    const charW = font * 0.6;
    const rx = (w.text.length * charW) / 2 + 4;
    const ry = font / 2 + 4;
    const pad = Math.max(rx, ry);
    let angle = idx * 1.1;
    let radius = idx === 0 ? 0 : 18;
    let found = false;
    for (let iter = 0; iter < 3000 && !found; iter++) {
      const x = R + radius * Math.cos(angle);
      const y = R + radius * Math.sin(angle);
      if (x - rx < 4 || x + rx > R * 2 - 4 || y - ry < 4 || y + ry > R * 2 - 4) {
        angle += 0.2; radius += 0.5; continue;
      }
      let collide = false;
      for (const p of placed) {
        const ox = (p.text.length * sizePx(p.weight) * 0.6) / 2 + 4;
        const oy = sizePx(p.weight) / 2 + 4;
        if (Math.abs(x - p.x) < rx + ox + 6 && Math.abs(y - p.y) < ry + oy + 6) {
          collide = true; break;
        }
      }
      if (!collide) { placed.push({ x, y, r: pad, text: w.text, weight: w.weight }); found = true; }
      else { angle += 0.25; radius += 0.8; }
    }
  });

  return (
    <div className="relative mx-auto" style={{ width: R * 2, height: R * 2 }}>
      <div className="absolute inset-0 rounded-full ring-1 ring-neutral-200 pointer-events-none" />
      {placed.map((p) => (
        <span
          key={p.text}
          className="absolute select-none font-semibold leading-none"
          style={{
            left: p.x,
            top: p.y,
            fontSize: sizePx(p.weight),
            color: colorClass(p.weight),
            transform: 'translate(-50%, -50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
}
