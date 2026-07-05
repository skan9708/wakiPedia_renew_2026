import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type TasteOption = string;

const BODY_OPTIONS: TasteOption[] = ['매우 가벼움', '가벼움', '보통', '무거움', '매우 무거움'];
const SWEET_OPTIONS: TasteOption[] = ['매우 드라이', '드라이', '보통', '스윗', '매우 스윗'];
const ACID_OPTIONS: TasteOption[] = ['매우 부드러움', '부드러움', '보통', '시다', '매우 시다'];
const TANIN_OPTIONS: TasteOption[] = ['매우 부드러움', '부드러움', '보통', '떫음', '매우 떫음'];

const FEEL_FRUITY = ['크랜베리','블랙베리','무화과','체리','블루베리','포도','청사과','사과','건포도','딸기','복숭아','망고','멜론','라임','레몬','오렌지','배','자몽','자두','바나나','파인애플','살구','패션프룻','과실향'];
const FEEL_FLORAL = ['아카시아','장미','자스민','라일락','바이올렛','꿀','작약','라벤더','말린 꽃','아이리스','백합','제비꽃','꽃향'];
const FEEL_OAKY = ['카카오','헤이즐넛','바닐라','초콜릿','아몬드','코코넛','캐러멜','스모크','모카','커피','인센스','마카다미아','캐슈넛','타르','피스타치오','후추','계피','오크향'];
const FEEL_VEGETAL = ['유칼립투스','로즈마리','타임','딜','민트','홍차','바질','토바코','월계수','토마토','피망','잔디','얼그레이','고수','솔향','허브향'];

type WineInfo = { nameKr: string; nameEng: string; wineType: string };

export function WineReviewWriteMobile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const wineId = searchParams.get('wine_id');
  const [wineInfo, setWineInfo] = useState<WineInfo | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [content, setContent] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [bodyLevel, setBodyLevel] = useState<number>(2);
  const [sweetLevel, setSweetLevel] = useState<number>(2);
  const [acidLevel, setAcidLevel] = useState<number>(2);
  const [taninLevel, setTaninLevel] = useState<number>(2);
  const [visibility, setVisibility] = useState<'private' | 'public'>('public');
  const [feels, setFeels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const canSubmit = useMemo(() => rating > 0 && content.trim().length > 0 && !!wineId, [rating, content, wineId]);

  useEffect(() => {
    if (!wineId) return;
    api.get(`/wines/${wineId}/`).then(({ data }) => setWineInfo({ nameKr: data.nameKr, nameEng: data.nameEng, wineType: data.wineType })).catch(() => {});
  }, [wineId]);

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-mobile px-4 pt-16 text-center space-y-4">
        <p className="text-muted">리뷰를 작성하려면 로그인이 필요합니다.</p>
        <button className="w-full py-3 rounded-2xl bg-accent text-white" onClick={() => navigate('/auth/login')}>로그인하기</button>
      </div>
    );
  }

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleFeel = (token: string) =>
    setFeels((prev) => (prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('wine', wineId!);
      form.append('rating', String(rating));
      form.append('text', content);
      form.append('body', String(bodyLevel));
      form.append('acidity', String(acidLevel));
      form.append('sweetness', String(sweetLevel));
      form.append('tannin', String(taninLevel));
      form.append('is_public', visibility === 'public' ? 'true' : 'false');
      feels.forEach((f) => form.append('feels', f));
      images.forEach((img) => form.append('images', img));

      const { data } = await api.post('/reviews/', form);
      navigate(`/reviews/${data.id}`);
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData && typeof errData === 'object') {
        const msgs = Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' / '));
      } else {
        setError('리뷰 등록에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 font-sans">
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">
        <div className="text-xs text-muted mb-1">대상 와인</div>
        {wineInfo ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{wineInfo.nameKr}</span>
            {wineInfo.wineType && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-bgsubtle text-muted">{wineInfo.wineType}</span>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted">{wineId ?? '선택 필요'}</div>
        )}
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
        <h3 className="text-base font-semibold mb-2">리뷰 작성</h3>
        <div className="card p-4">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="와인의 색상, 향, 맛과 기억하고 싶은 노트를 기록해 보세요." className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-muted" />
        </div>
      </section>

      {/* 이미지 업로드 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">사진 선택</h3>
        <div className="card p-4">
          <div className="grid grid-cols-4 gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl bg-bgsubtle text-muted grid place-items-center text-xs">와인 사진 업로드</button>
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={src} alt={`preview-${i}`} className="w-full h-full object-cover" />
                <button type="button" className="absolute top-1 right-1 text-xs bg-black/50 text-white rounded px-1" onClick={() => onRemoveImage(i)}>삭제</button>
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickFiles} />
        </div>
      </section>

      {/* 맛 상세 기록 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-6">와인 상세기록</h3>
        <div className="mt-0 space-y-5">
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
          <button disabled={!canSubmit || loading} className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50">
            {loading ? '등록 중...' : '리뷰 올리기'}
          </button>
        </div>
      </div>
      <div className="h-0" />
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
            aria-pressed={selected.includes(it)}
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
              <button key={i} type="button" onClick={() => onChange(i)} className={`w-5 h-5 rounded-full border-2 ${i <= value ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
