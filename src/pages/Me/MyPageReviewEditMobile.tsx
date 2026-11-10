import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const FEEL_FRUITY = ['크랜베리','블랙베리','무화과','체리','블루베리','포도','청사과','사과','건포도','딸기','복숭아','망고','멜론','라임','레몬','오렌지','배','자몽','자두','바나나','파인애플','살구','패션프룻','과실향'];
const FEEL_FLORAL = ['아카시아','장미','자스민','라일락','바이올렛','꿀','작약','라벤더','말린 꽃','아이리스','백합','제비꽃','꽃향'];
const FEEL_OAKY = ['카카오','헤이즐넛','바닐라','초콜릿','아몬드','코코넛','캐러멜','스모크','모카','커피','인센스','마카다미아','캐슈넛','타르','피스타치오','후추','계피','오크향','담배향'];
const FEEL_VEGETAL = ['유칼립투스','로즈마리','타임','딜','민트','홍차','바질','월계수','토마토','피망','잔디','얼그레이','고수','솔향','허브향'];

export function MyPageReviewEditMobile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [wineName, setWineName] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState('');
  const [bodyLevel, setBodyLevel] = useState<number | null>(null);
  const [sweetLevel, setSweetLevel] = useState<number | null>(null);
  const [acidLevel, setAcidLevel] = useState<number | null>(null);
  const [taninLevel, setTaninLevel] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [existingImages, setExistingImages] = useState<{ id: number; url: string }[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
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
        setBodyLevel(data.bodyRating ?? null);
        setSweetLevel(data.sweetRating ?? null);
        setAcidLevel(data.acidityRating ?? null);
        setTaninLevel(data.taninRating ?? null);
        setVisibility(data.is_public ? 'public' : 'private');
        setExistingImages(data.images ?? []);
        setFeels(data.feels ?? []);
      })
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => () => previewUrlsRef.current.forEach(URL.revokeObjectURL), []);

  const canSubmit = useMemo(() => rating > 0 && content.trim().length > 0, [rating, content]);

  if (!token) return null;
  if (loading) return <div className="p-8 text-center text-muted text-sm">불러오는 중...</div>;

  const toggleFeel = (t: string) =>
    setFeels((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const urls = files.map((file) => URL.createObjectURL(file));
    previewUrlsRef.current.push(...urls);
    setNewImages((previous) => [...previous, ...files]);
    setPreviews((previous) => [...previous, ...urls]);
    event.target.value = '';
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== previews[index]);
    setNewImages((previous) => previous.filter((_, i) => i !== index));
    setPreviews((previous) => previous.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const fields = {
        text: content,
        rating,
        body: bodyLevel,
        acidity: acidLevel,
        sweetness: sweetLevel,
        tannin: taninLevel,
        is_public: visibility === 'public',
        feels,
      };
      if (newImages.length || removedImageIds.length) {
        const form = new FormData();
        form.append('text', fields.text);
        form.append('rating', String(fields.rating));
        form.append('is_public', String(fields.is_public));
        for (const key of ['body', 'acidity', 'sweetness', 'tannin'] as const) {
          form.append(key, fields[key] === null ? '' : String(fields[key]));
        }
        (feels.length ? feels : ['']).forEach((feel) => form.append('feels', feel));
        removedImageIds.forEach((imageId) => form.append('remove_images', String(imageId)));
        newImages.forEach((image) => form.append('images', image));
        await api.patch(`/reviews/${id}/`, form);
      } else {
        await api.patch(`/reviews/${id}/`, fields);
      }
      navigate(`/reviews/${id}`);
    } catch (err: any) {
      setError('수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="review-form space-y-5 font-sans">
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">
        <div className="text-xs text-muted mb-1">대상 와인</div>
        <div className="text-sm font-medium">{wineName}</div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* 별점 */}
      <section data-guide="edit-review-fields" className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">별점 <span className="text-sm text-accent">필수</span></h3>
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
        <h3 className="text-base font-semibold mb-2">리뷰 <span className="text-sm text-accent">필수</span></h3>
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

      {/* 사진 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">사진 <span className="text-sm text-muted font-normal">선택</span></h3>
        <div className="card p-4">
          <div className="grid grid-cols-4 gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl bg-bgsubtle text-muted grid place-items-center text-xs">와인 사진 추가</button>
            {existingImages.map((image) => (
              <div key={image.id} className="relative aspect-square overflow-hidden rounded-xl">
                <img src={image.url} alt="기존 리뷰 사진" className="h-full w-full object-cover" />
                <button type="button" className="absolute right-1 top-1 rounded bg-black/60 px-1 text-xs text-white" onClick={() => {
                  setExistingImages((previous) => previous.filter((item) => item.id !== image.id));
                  setRemovedImageIds((previous) => [...previous, image.id]);
                }}>삭제</button>
              </div>
            ))}
            {previews.map((url, index) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-xl">
                <img src={url} alt="추가할 리뷰 사진" className="h-full w-full object-cover" />
                <button type="button" className="absolute right-1 top-1 rounded bg-black/60 px-1 text-xs text-white" onClick={() => removeNewImage(index)}>삭제</button>
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickFiles} />
          {visibility === 'private' && <p className="mt-3 text-xs text-muted">나만 보기 사진은 내 기록에서만 볼 수 있어요.</p>}
        </div>
      </section>

      {/* 맛 상세 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">와인 상세기록 <span className="text-sm text-muted font-normal">선택</span></h3>
        <div className="space-y-5">
          <TasteScaleRow title="바디" leftLabel="매우 가벼움" rightLabel="매우 무거움" value={bodyLevel} onChange={setBodyLevel} />
          <TasteScaleRow title="당도" leftLabel="매우 드라이" rightLabel="매우 스윗" value={sweetLevel} onChange={setSweetLevel} />
          <TasteScaleRow title="산도" leftLabel="매우 부드러움" rightLabel="매우 시다" value={acidLevel} onChange={setAcidLevel} />
          <TasteScaleRow title="탄닌" leftLabel="매우 부드러움" rightLabel="매우 떫음" value={taninLevel} onChange={setTaninLevel} />
        </div>
      </section>

      {/* 느낌 태그 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">느낌 <span className="text-sm text-muted font-normal">선택</span></h3>
        <FeelGroup title="과일 (Fruity)" items={FEEL_FRUITY} selected={feels} onToggle={toggleFeel} />
        <FeelGroup title="꽃 (Floral)" items={FEEL_FLORAL} selected={feels} onToggle={toggleFeel} />
        <FeelGroup title="오크 (Oaky)" items={FEEL_OAKY} selected={feels} onToggle={toggleFeel} />
        <FeelGroup title="식물 (Vegetal)" items={FEEL_VEGETAL} selected={feels} onToggle={toggleFeel} />
      </section>

      {/* 공개 범위 */}
      <section data-guide="edit-review-visibility" className="mx-auto w-full max-w-mobile px-4 pb-12">
        <h3 className="text-base font-semibold mb-2">공개 범위 <span className="text-sm text-muted font-normal">선택</span></h3>
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

type TasteScaleRowProps = { title: string; leftLabel: string; rightLabel: string; value: number | null; onChange: (v: number | null) => void };
function TasteScaleRow({ title, leftLabel, rightLabel, value, onChange }: TasteScaleRowProps) {
  const fillPct = `${((value ?? 0) / 4) * 100}%`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <button type="button" onClick={() => onChange(null)} aria-label={`${title} 선택 안 함`} aria-pressed={value === null}
          className={`min-h-8 rounded-full px-2.5 text-xs ${value === null ? 'bg-accent/20 text-[#4c5700]' : 'text-muted underline'}`}>선택 안 함</button>
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[5px] bg-neutral-200 rounded-full" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[5px] bg-accent rounded-full" style={{ width: fillPct }} />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} type="button" aria-label={`${title} ${i + 1}단계`} onClick={() => onChange(i)}
              className={`w-5 h-5 rounded-full border-2 ${value !== null && i <= value ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
