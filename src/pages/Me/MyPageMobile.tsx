import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import defaultWineImg from '@/assets/default-wine.jpg';

type UserProfile = {
  id: number;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  reviewCount: number;
  likeCount: number;
  likeRank: { rank: number; total: number; topPercent: number } | null;
};

type LikedWine = { id: number; nameKr: string; nameEng: string; imageUrl: string | null };
type MyReview = { id: number; images: { id: number; url: string }[]; wineName: string };
type TasteProfile = {
  excluded: boolean;
  wineCount: number;
  highRatedWineCount: number;
  taste: { body: number; sweet: number; acid: number; tanin: number } | null;
  keywords: { text: string; weight: number }[];
};

export function MyPageMobile() {
  const navigate = useNavigate();
  const { token, user: storeUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [likedWines, setLikedWines] = useState<LikedWine[]>([]);
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [tasteLoading, setTasteLoading] = useState(true);
  const [tasteError, setTasteError] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/me/').then(({ data }) => setProfile(data)).catch(() => {});
    api.get('/me/likes/').then(({ data }) => setLikedWines(data)).catch(() => {});
    api.get('/me/reviews/').then(({ data }) => setMyReviews(data)).catch(() => {});
    setTasteProfile(null);
    setTasteLoading(true);
    setTasteError(false);
    api.get<TasteProfile>('/me/taste-profile/')
      .then(({ data }) => setTasteProfile(data))
      .catch(() => setTasteError(true))
      .finally(() => setTasteLoading(false));
  }, [token]);

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-mobile px-4 pt-16 text-center space-y-4">
        <p className="text-muted">로그인이 필요합니다.</p>
        <button className="w-full py-3 rounded-2xl bg-accent text-white" onClick={() => navigate('/auth/login')}>로그인하기</button>
      </div>
    );
  }

  const displayName = profile?.nickname ?? storeUser?.nickname ?? '와키';
  const displayEmail = profile?.email ?? storeUser?.email ?? '';
  const myTaste = tasteProfile?.taste ?? null;
  const keywords = tasteProfile?.keywords ?? [];

  return (
    <div className="space-y-6">
      {/* 상단 프로필 */}
      <section className="mx-auto w-full max-w-mobile px-4 pt-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-bgsubtle">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold">
                {displayName[0]}
              </div>
            )}
          </div>
          <div>
            <div className="text-lg font-semibold">{displayName}</div>
            <div className="text-sm text-muted">{displayEmail}</div>
          </div>
          <div className="ml-auto grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-semibold">{profile?.reviewCount ?? 0}</div>
              <div className="text-xs text-muted">리뷰</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{profile?.likeCount ?? 0}</div>
              <div className="text-xs text-muted">좋아요</div>
              {profile?.likeRank && (
                <div className="text-[10px] text-accent font-medium mt-0.5">전체 {profile.likeRank.rank}위</div>
              )}
            </div>
          </div>
        </div>
        {profile?.likeRank && (
          <div className="mt-3 text-center text-xs text-muted">
            덕분에 도움됐어요 😊 · 상위 <span className="text-accent font-semibold">{profile.likeRank.topPercent}%</span>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button className="flex-1 py-2 rounded-xl border border-border text-sm" onClick={() => navigate('/me/detail')}>프로필 수정</button>
          <button className="flex-1 py-2 rounded-xl border border-border text-sm text-red-500" onClick={() => { useAuthStore.getState().logout(); navigate('/'); }}>로그아웃</button>
        </div>
      </section>

      {/* 좋아요한 와인 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">내가 좋아요한 와인</h3>
          <button className="text-xs text-muted" onClick={() => navigate('/me/likes')}>더보기</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {likedWines.slice(0, 6).map((w) => (
            <div key={w.id} className="aspect-square rounded-xl overflow-hidden bg-bgsubtle cursor-pointer" onClick={() => navigate(`/wines/${w.id}`)}>
              <img src={w.imageUrl ?? defaultWineImg} alt={w.nameEng} className="w-full h-full object-cover" />
            </div>
          ))}
          {likedWines.length === 0 && (
            <div className="col-span-3 text-sm text-muted text-center py-4">좋아요한 와인이 없습니다.</div>
          )}
        </div>
      </section>

      {/* 내 리뷰 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">내 리뷰</h3>
          <button className="text-xs text-muted" onClick={() => navigate('/me/reviews')}>더보기</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {myReviews.slice(0, 9).map((r) => {
            const imgUrl = r.images?.[0]?.url ?? defaultWineImg;
            return (
              <div key={r.id} className="aspect-square overflow-hidden cursor-pointer" onClick={() => navigate(`/reviews/${r.id}`)}>
                <img src={imgUrl} alt={r.wineName} className="w-full h-full object-cover" />
              </div>
            );
          })}
          {myReviews.length === 0 && (
            <div className="col-span-3 text-sm text-muted text-center py-4">작성한 리뷰가 없습니다.</div>
          )}
        </div>
      </section>

      {/* 4점 이상 준 와인의 특징 평균 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">내 취향 분석</h3>
        {tasteLoading && <p className="text-sm text-muted">취향을 분석하는 중...</p>}
        {tasteError && <p className="text-sm text-muted">취향 분석을 불러오지 못했습니다.</p>}
        {tasteProfile?.excluded && <p className="text-sm text-muted">여러 사람의 리뷰를 모은 계정이라 개인 취향 분석을 제공하지 않습니다.</p>}
        {myTaste && (
          <>
            <p className="mb-5 text-xs text-muted">4점 이상 준 와인 {tasteProfile?.wineCount}종의 특징을 평균냈어요.</p>
            <div className="space-y-6">
              <GaugeRow title="바디" left="매우 가벼움" right="매우 무거움" value={myTaste.body} />
              <GaugeRow title="당도" left="매우 드라이" right="매우 스윗" value={myTaste.sweet} />
              <GaugeRow title="산도" left="매우 부드러움" right="매우 시다" value={myTaste.acid} />
              <GaugeRow title="탄닌" left="매우 부드러움" right="매우 떫음" value={myTaste.tanin} />
            </div>
            {tasteProfile && tasteProfile.highRatedWineCount > tasteProfile.wineCount && (
              <p className="mt-4 text-xs text-muted">특징 정보가 없는 와인은 계산에서 제외했어요.</p>
            )}
          </>
        )}
        {tasteProfile && !tasteProfile.excluded && !myTaste && (
          <div className="mt-5 flex flex-col items-center gap-2 py-3 rounded-xl bg-neutral-50 border border-dashed border-neutral-200">
            <span className="text-2xl">🍷</span>
            <p className="text-sm text-muted text-center leading-snug">
              {tasteProfile.highRatedWineCount > 0
                ? '4점 이상 준 와인에 분석할 특징 정보가 아직 없어요.'
                : <>4점 이상 준 와인이 생기면<br />내 취향을 보여드려요.</>}
            </p>
            <button
              className="mt-1 px-4 py-1.5 rounded-full bg-accent text-white text-xs"
              onClick={() => navigate('/search')}
            >
              리뷰 작성하러 가기
            </button>
          </div>
        )}
      </section>

      {/* 좋아한 와인 리뷰의 느낌 태그 */}
      {keywords.length > 0 && (
        <section className="mx-auto w-full max-w-mobile px-4 pb-24">
          <h3 className="text-base font-semibold mb-1">좋아한 와인의 키워드</h3>
          <p className="mb-2 text-xs text-muted">4점 이상 준 와인의 리뷰에서 선택한 느낌입니다.</p>
          <div className="card p-4">
            <WordCloud words={keywords} />
          </div>
        </section>
      )}
      <div className="h-24" />
    </div>
  );
}

type GaugeProps = { title: string; left: string; right: string; value: number | null };
function GaugeRow({ title, left, right, value }: GaugeProps) {
  const hasData = value !== null;
  const safeVal = value ?? 0;
  const fillPct = hasData ? `${(safeVal / 4) * 100}%` : '0%';
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 shrink-0 text-sm text-muted">{title}{hasData && <span className="block text-xs text-accent">{safeVal.toFixed(1)}</span>}</div>
      <div className="flex-1">
        <div className="relative h-10">
          <div className="absolute -top-4 left-0 text-[12px] text-muted">{left}</div>
          <div className="absolute -top-4 right-0 text-[12px] text-muted">{right}</div>
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[5px] bg-neutral-200 rounded-full" />
          {hasData && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[5px] bg-accent rounded-full" style={{ width: fillPct }} />
          )}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${hasData && i <= safeVal ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`}
              />
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
    if (r >= 0.7) return '#A7B621';
    if (r >= 0.4) return '#6B7C0A';
    return '#9CA3AF';
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
