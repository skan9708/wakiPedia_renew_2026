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
};

type LikedWine = { id: number; nameKr: string; nameEng: string; imageUrl: string | null };
type MyReview = { id: number; images: { id: number; url: string }[]; wineName: string };

export function MyPageMobile() {
  const navigate = useNavigate();
  const { token, user: storeUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [likedWines, setLikedWines] = useState<LikedWine[]>([]);
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [myTaste, setMyTaste] = useState({ body: 2, sweet: 2, acid: 2, tanin: 2 });
  const [keywords, setKeywords] = useState<{ text: string; weight: number }[]>([]);

  useEffect(() => {
    if (!token) return;
    api.get('/me/').then(({ data }) => setProfile(data)).catch(() => {});
    api.get('/me/likes/').then(({ data }) => setLikedWines(data)).catch(() => {});
    api.get('/me/reviews/').then(({ data }) => {
      setMyReviews(data);
      if (data.length > 0) {
        const total = data.length;
        const avgBody = data.reduce((s: number, r: any) => s + (r.bodyRating ?? 2), 0) / total;
        const avgSweet = data.reduce((s: number, r: any) => s + (r.sweetRating ?? 2), 0) / total;
        const avgAcid = data.reduce((s: number, r: any) => s + (r.acidityRating ?? 2), 0) / total;
        const avgTanin = data.reduce((s: number, r: any) => s + (r.taninRating ?? 2), 0) / total;
        setMyTaste({ body: Math.round(avgBody), sweet: Math.round(avgSweet), acid: Math.round(avgAcid), tanin: Math.round(avgTanin) });

        const counts: Record<string, number> = {};
        data.forEach((r: any) => (r.feels ?? []).forEach((f: string) => { counts[f] = (counts[f] ?? 0) + 1; }));
        setKeywords(Object.entries(counts).map(([text, weight]) => ({ text, weight })));
      }
    }).catch(() => {});
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
            </div>
          </div>
        </div>
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

      {/* 내 스타일 게이지 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-4">내 스타일</h3>
        <div className="space-y-6">
          <GaugeRow title="바디" left="매우 가벼움" right="매우 무거움" value={myTaste.body} />
          <GaugeRow title="당도" left="매우 드라이" right="매우 스윗" value={myTaste.sweet} />
          <GaugeRow title="산도" left="매우 부드러움" right="매우 시다" value={myTaste.acid} />
          <GaugeRow title="탄닌" left="매우 부드러움" right="매우 떫음" value={myTaste.tanin} />
        </div>
      </section>

      {/* 워드 클라우드 */}
      {keywords.length > 0 && (
        <section className="mx-auto w-full max-w-mobile px-4 pb-24">
          <h3 className="text-base font-semibold mb-2">나의 와인 키워드</h3>
          <div className="card p-4">
            <WordCloud words={keywords} />
          </div>
        </section>
      )}
      <div className="h-24" />
    </div>
  );
}

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
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 2000);
    return () => clearInterval(t);
  }, []);
  const sizePxFor = (w: number) => (w >= 10 ? 26 : w >= 8 ? 22 : w >= 5 ? 20 : w >= 3 ? 16 : 14);
  const classFor = (w: number) => (w >= 8 ? 'text-accent' : w >= 5 ? 'text-fg' : 'text-muted');
  const list = [...words].sort((a, b) => b.weight - a.weight).slice(0, 10);
  const placed: Array<{ x: number; y: number; r: number; text: string; weight: number }> = [];
  const R = 90;
  list.forEach((w, idx) => {
    const font = sizePxFor(w.weight);
    const r = font * 0.7;
    let angle = idx * 0.6, radius = 10, found = false;
    for (let iter = 0; iter < 2000 && !found; iter++) {
      const x = R + radius * Math.cos(angle), y = R + radius * Math.sin(angle);
      if (Math.hypot(x - R, y - R) + r > R) { angle += 0.25; radius += 1; continue; }
      let collide = false;
      for (const p of placed) { if (Math.hypot(x - p.x, y - p.y) < r + p.r + 6) { collide = true; break; } }
      if (!collide) { placed.push({ x, y, r, text: w.text, weight: w.weight }); found = true; }
      else { angle += 0.35; radius += 1; }
    }
  });
  return (
    <div className="relative mx-auto w-full aspect-square max-w-[320px]">
      {placed.map((p, i) => (
        <span key={`${p.text}-${i}`} className={`absolute ${classFor(p.weight)} select-none`}
          style={{ left: `${(p.x / (R * 2)) * 100}%`, top: `${(p.y / (R * 2)) * 100}%`, transform: `translate(-50%,-50%) translate(${((i + tick) % 3) - 1}px,${((tick + i * 2) % 3) - 1}px)`, fontSize: sizePxFor(p.weight) }}>
          {p.text}
        </span>
      ))}
      <div className="absolute inset-0 rounded-full ring-1 ring-neutral-200 pointer-events-none" />
    </div>
  );
}
