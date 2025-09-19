import { useNavigate } from 'react-router-dom';

export function MyPageMobile() {
  const navigate = useNavigate();
  const DUMMY_IMG = 'https://plus.unsplash.com/premium_photo-1674852175694-008fc8f96d23?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
  const likedWines = Array.from({ length: 6 }).map((_, i) => ({
    id: `w${i}`,
    nameEng: `Wine ${i+1}`,
    imageUrl: `${DUMMY_IMG}#${i}`,
  }));
  const myReviewImages = Array.from({ length: 12 }).map((_, i) => `${DUMMY_IMG}#rev-${i}`);

  const myTaste = { body: 2, sweet: 1, acid: 2, tanin: 1 };

  return (
    <div className="space-y-6">
      {/* 상단 프로필 */}
      <section className="mx-auto w-full max-w-mobile px-4 pt-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-bgsubtle">
            <img src="https://i.pravatar.cc/100" alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-lg font-semibold">와키</div>
            <div className="text-sm text-muted">email@example.com</div>
          </div>
          <div className="ml-auto grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-semibold">12</div>
              <div className="text-xs text-muted">리뷰</div>
            </div>
            <div>
              <div className="text-lg font-semibold">35</div>
              <div className="text-xs text-muted">좋아요</div>
            </div>
          </div>
        </div>
      </section>

      {/* 좋아요 저장 와인 리스트 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">내가 좋아요한 와인</h3>
          <button className="text-xs text-muted" onClick={() => navigate('/me/likes')}>더보기</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {likedWines.slice(0, 6).map((w) => (
            <div key={w.id} className="aspect-square rounded-xl overflow-hidden bg-bgsubtle">
              <img src={w.imageUrl} alt={w.nameEng} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* 내 리뷰 인스타그램형 그리드 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">내 리뷰</h3>
          <button className="text-xs text-muted" onClick={() => navigate('/me/reviews')}>더보기</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {myReviewImages.slice(0, 9).map((src, i) => (
            <div key={i} className="aspect-square overflow-hidden">
              <img src={src} alt={`review-${i}`} className="w-full h-full object-cover" />
            </div>
          ))}
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

      {/* 워드 클라우드 자리 */}
      <section className="mx-auto w-full max-w-mobile px-4 pb-24">
        <h3 className="text-base font-semibold mb-2">나의 와인 키워드</h3>
        <div className="card p-4">
          <WordCloud
            words={[
              { text: '블랙베리', weight: 5 },
              { text: '바닐라', weight: 5 },
              { text: '허브', weight: 3 },
              { text: '체리', weight: 7 },
              { text: '스모키', weight: 10 },
              { text: '초콜릿', weight: 3 },
              { text: '커피', weight: 2 },
              { text: '멜론', weight: 2 },
              { text: '오크', weight: 4 },
              { text: '민트', weight: 12 },
              { text: '라임', weight: 8},
              { text: '플로럴', weight: 2 },
              { text: '스파이시', weight: 3 },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

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
  // 최대 10개만 표시, 가중치 순
  const list = [...words].sort((a,b) => b.weight - a.weight).slice(0,10);

  // 간단한 스파이럴 배치로 겹침 방지
  const placed: Array<{ x: number; y: number; r: number; text: string; weight: number }> = [];
  const R = 90; // 영역 반지름(px) (컨테이너 320 기준 내부 여백 포함)
  list.forEach((w, idx) => {
    const font = sizePxFor(w.weight);
    const r = font * 0.7; // 대략 텍스트 반경 추정
    let angle = idx * 0.6;
    let radius = 10;
    let found = false;
    for (let iter = 0; iter < 2000 && !found; iter++) {
      const x = R + radius * Math.cos(angle);
      const y = R + radius * Math.sin(angle);
      // 원 경계 안쪽에 위치
      if (Math.hypot(x - R, y - R) + r > R) {
        angle += 0.25; radius += 1; continue;
      }
      // 충돌 검사
      let collide = false;
      for (const p of placed) {
        if (Math.hypot(x - p.x, y - p.y) < r + p.r + 6) { collide = true; break; }
      }
      if (!collide) {
        placed.push({ x, y, r, text: w.text, weight: w.weight });
        found = true;
      } else { angle += 0.35; radius += 1; }
    }
  });

  // 가벼운 생동감: 주기적으로 미세 오프셋
  const [tick, setTick] = (window as any).React?.useState?.(0) ?? [0, () => {}];
  (window as any).React?.useEffect?.(() => {
    const t = setInterval(() => setTick((v: number) => v + 1), 2000);
    return () => clearInterval(t);
  }, [setTick]);

  return (
    <div className="relative mx-auto w-full aspect-square max-w-[320px]">
      {placed.map((p, i) => {
        const fontSize = sizePxFor(p.weight);
        const jitterX = ((i + tick) % 3) - 1; // -1..1
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



