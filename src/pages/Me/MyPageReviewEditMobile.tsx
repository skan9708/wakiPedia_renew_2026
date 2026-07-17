import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const FEEL_FRUITY = ['크랜베리','블랙베리','무화과','체리','블루베리','포도','청사과','사과','건포도','딸기','복숭아','망고','멜론','라임','레몬','오렌지','배','자몽','자두','바나나','파인애플','살구','패션프룻','과실향'];
const FEEL_FLORAL = ['아카시아','장미','자스민','라일락','바이올렛','꿀','작약','라벤더','말린 꽃','아이리스','백합','제비꽃','꽃향'];
const FEEL_OAKY = ['카카오','헤이즐넛','바닐라','초콜릿','아몬드','코코넛','캐러멜','스모크','모카','커피','인센스','마카다미아','캐슈넛','타르','피스타치오','후추','계피','오크향'];
const FEEL_VEGETAL = ['유칼립투스','로즈마리','타임','딜','민트','홍차','바질','토바코','월계수','토마토','피망','잔디','얼그레이','고수','솔향','허브향'];

export function MyPageReviewEditMobile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [wineName, setWineName] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState('');
  const [bodyLevel, setBodyLevel] = useState(2);
  const [sweetLevel, setSweetLevel] = useState(2);
  const [acidLevel, setAcidLevel] = useState(2);
  const [taninLevel, setTaninLevel] = useState(2);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [feels, setFeels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/reviews/${id}/`)
      .then(({ data }) => {
        setWineName(data.wineName ?? '');
        setRating(data.rating ?? 0);
        setContent(data.text ?? '');
        setBodyLevel(data.bodyRating ?? 2);
        setSweetLevel(data.sweetRating ?? 2);
        setAcidLevel(data.acidityRating ?? 2);
        setTaninLevel(data.taninRating ?? 2);
        setVisibility(data.isPublic ? 'public' : 'private');
        setFeels(data.feels ?? []);
      })
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [id]);

  const canSubmit = useMemo(() => rating > 0 && content.trim().length > 0, [rating, content]);

  if (!token) return null;
  if (loading) return <div className="p-8 text-center text-muted text-sm">불러오는 중...</div>;

  const toggleFeel = (t: string) =>
    setFeels((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`/reviews/${id}/`, {
        text: content,
        rating,
        body: bodyLevel,
        acidity: acidLevel,
        sweetness: sweetLevel,
        tannin: taninLevel,
        is_public: visibility === 'public',
        feels,
      });
      navigate(`/reviews/${id}`);
    } catch (err: any) {
      setError('수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 font-sans">
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">
        <div className="text-xs text-muted mb-1">대상 와인</div>
        <div className="text-sm font-medium">{wineName}</div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* 별점 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">별점</h3>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-2xl">
            {Array.from({ length: 5 }).map((_, i) => {
              const idx = i + 1;
              const current = hover || rating;
              const isFull = current >= idx;
              const isHalf = !isFull && current >= idx - 0.5;
              const fillPct = isFull ? '100%' : isHalf ? '50%' : '0%';
              return (
                <span key={idx} className="relative inline-block leading-none">
                  <span className="text-border select-none">☆</span>
                  <span className="absolute left-0 top-0 overflow-hidden pointer-events-none" style={{ width: fillPct }}>
                    <span className="text-accent select-none">★</span>
                  </span>
                  <button type="button" className="absolute inset-y-0 left-0 w-1/2 z-10" onMouseEnter={() => setHover(idx - 0.5)} onMouseLeave={() => setHover(0)} onClick={() => setRating(idx - 0.5)} />
                  <button type="button" className="absolute inset-y-0 right-0 w-1/2 z-10" onMouseEnter={() => setHover(idx)} onMouseLeave={() => setHover(0)} onClick={() => setRating(idx)} />
                </span>
              );
            })}
            <span className="text-base text-muted ml-2">{rating > 0 ? `${rating.toFixed(1)}점` : ''}</span>
          </div>
        </div>
      </section>

      {/* 리뷰 본문 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">리뷰</h3>
        <div className="card p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="와인의 색상, 향, 맛과 기억하고 싶은 노트를 기록해 보세요."
            className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-muted"
          />
        </div>
      </section>

      {/* 맛 상세 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-6">와인 상세기록</h3>
        <div className="space-y-5">
          <TasteScaleRow title="바디" leftLabel="매우 가벼움" rightLabel="매우 무거움" value={bodyLevel} onChange={setBodyLevel} />
          <TasteScaleRow title="당도" leftLabel="매우 드라이" rightLabel="매우 스윗" value={sweetLevel} onChange={setSweetLevel} />
          <TasteScaleRow title="산도" leftLabel="매우 부드러움" rightLabel="매우 시다" value={acidLevel} onChange={setAcidLevel} />
          <TasteScaleRow title="탄닌" leftLabel="매우 부드러움" rightLabel="매우 떫음" value={taninLevel} onChange={setTaninLevel} />
        </div>
      </section>

      {/* 느낌 태그 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">느낌</h3>
        <FeelGroup title="과일 (Fruity)" items={FEEL_FRUITY} selected={feels} onToggle={toggleFeel} />
        <FeelGroup title="꽃 (Floral)" items={FEEL_FLORAL} selected={feels} onToggle={toggleFeel} />
        <FeelGroup title="오크 (Oaky)" items={FEEL_OAKY} selected={feels} onToggle={toggleFeel} />
        <FeelGroup title="식물 (Vegetal)" items={FEEL_VEGETAL} selected={feels} onToggle={toggleFeel} />
      </section>

      {/* 공개 범위 */}
      <section className="mx-auto w-full max-w-mobile px-4 pb-12">
        <h3 className="text-base font-semibold mb-2">공개 범위</h3>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={`py-2 rounded-xl border ${visibility === 'public' ? 'bg-accent text-white border-accent' : 'border-border'}`} onClick={() => setVisibility('public')}>전체 공개</button>
          <button type="button" className={`py-2 rounded-xl border ${visibility === 'private' ? 'bg-accent text-white border-accent' : 'border-border'}`} onClick={() => setVisibility('private')}>나만 보기</button>
        </div>
      </section>

      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-border">
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5">
          <button disabled={!canSubmit || saving} className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50">
            {saving ? '저장 중...' : '수정 완료'}
          </button>
        </div>
      </div>
    </form>
  );
}

type FeelGroupProps = { title: string; items: string[]; selected: string[]; onToggle: (t: string) => void };
function FeelGroup({ title, items, selected, onToggle }: FeelGroupProps) {
  return (
    <div className="mb-3">
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button key={it} type="button" onClick={() => onToggle(it)}
            className={`px-3 py-1.5 rounded-full text-sm border ${selected.includes(it) ? 'bg-neutral-200 border-neutral-200' : 'border-border'}`}
          >{it}</button>
        ))}
      </div>
    </div>
  );
}

type TasteScaleRowProps = { title: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void };
function TasteScaleRow({ title, leftLabel, rightLabel, value, onChange }: TasteScaleRowProps) {
  const fillPct = `${(value / 4) * 100}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 shrink-0 text-sm text-muted">{title}</div>
      <div className="flex-1">
        <div className="relative h-12">
          <div className="absolute -top-5 left-0 text-[12px] text-muted">{leftLabel}</div>
          <div className="absolute -top-5 right-0 text-[12px] text-muted">{rightLabel}</div>
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[5px] bg-neutral-200 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[5px] bg-accent rounded-full" style={{ width: fillPct }} />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => onChange(i)}
                className={`w-5 h-5 rounded-full border-2 ${i <= value ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
