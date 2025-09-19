import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type TasteOption = string;

const BODY_OPTIONS: TasteOption[] = ['매우 가벼움', '가벼움', '보통', '무거움', '매우 무거움'];
const SWEET_OPTIONS: TasteOption[] = ['매우 드라이', '드라이', '보통', '스윗', '매우 스윗'];
const ACID_OPTIONS: TasteOption[] = ['매우 부드러움', '부드러움', '보통', '시다', '매우 시다'];
const TANIN_OPTIONS: TasteOption[] = ['매우 부드러움', '부드러움', '보통', '떫음', '매우 떫음'];

const FEEL_FRUITY = ['크랜베리','블랙베리','무화과','체리','블루베리','포도','청사과','사과','건포도','딸기','복숭아','망고','멜론','라임','레몬','오렌지','배','자몽','자두','바나나','파인애플','살구','패션프룻','과실향'];
const FEEL_FLORAL = ['아카시아','장미','자스민','라일락','바이올렛','꿀','작약','라벤더','말린 꽃','아이리스','백합','제비꽃','꽃향'];
const FEEL_OAKY = ['카카오','헤이즐넛','바닐라','초콜릿','아몬드','코코넛','캐러멜','스모크','모카','커피','인센스','마카다미아','캐슈넛','타르','피스타치오','후추','계피','오크향'];
const FEEL_VEGETAL = ['유칼립투스','로즈마리','타임','딜','민트','홍차','바질','토바코','월계수','토마토','피망','잔디','얼그레이','고수','솔향','허브향'];

export function WineReviewWriteMobile() {
  const [params] = useSearchParams();
  const wineId = params.get('wine_id');

  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [content, setContent] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [body, setBody] = useState<TasteOption | undefined>();
  const [sweet, setSweet] = useState<TasteOption | undefined>();
  const [acid, setAcid] = useState<TasteOption | undefined>();
  const [tanin, setTanin] = useState<TasteOption | undefined>();
  const [bodyLevel, setBodyLevel] = useState<number>(2);
  const [sweetLevel, setSweetLevel] = useState<number>(2);
  const [acidLevel, setAcidLevel] = useState<number>(2);
  const [taninLevel, setTaninLevel] = useState<number>(2);
  const [visibility, setVisibility] = useState<'private' | 'public'>('public');
  const [feels, setFeels] = useState<string[]>([]);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = useMemo(() => rating > 0 && content.trim().length > 0, [rating, content]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setImages((prev) => [...prev, ...files]);
    const nextUrls = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...nextUrls]);
    // reset for same file select
    if (fileRef.current) fileRef.current.value = '';
  };

  const onRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleFeel = (token: string) => {
    setFeels((prev) => (prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token]));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      wineId,
      rating,
      content,
      imagesCount: images.length,
      body,
      sweet,
      acid,
      tanin,
      visibility,
      feels,
    };
    console.log('submit review', payload);
    alert('로컬 데모: 콘솔에 payload가 출력되었습니다.');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 font-sans">
      {/* 제목/타깃 */}
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">
        <div className="text-xs text-muted">대상 와인</div>
        <div className="text-sm mt-1">{wineId ?? '선택 필요'}</div>
      </div>

      {/* 별점 입력 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">별점</h3>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-2xl">
            {Array.from({ length: 5 }).map((_, i) => {
              const idx = i + 1;
              const active = (hover || rating) >= idx;
              return (
                <button
                  type="button"
                  key={idx}
                  className={`transition-colors ${active ? 'text-accent' : 'text-border'}`}
                  onMouseEnter={() => setHover(idx)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(idx)}
                  aria-label={`${idx}점`}
                >
                  ★
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 리뷰 본문 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">리뷰 작성</h3>
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

      {/* 이미지 업로드 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">사진 선택</h3>
        <div className="card p-4">
          <div className="grid grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl bg-bgsubtle text-muted grid place-items-center text-xs"
              aria-label="와인 사진 업로드"
            >
              와인 사진 업로드
            </button>
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={src} alt={`preview-${i}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  className="absolute top-1 right-1 text-xs bg-black/50 text-white rounded px-1"
                  onClick={() => onRemoveImage(i)}
                  aria-label="사진 삭제"
                >
                  삭제
                </button>
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
          <TasteScaleRow
            title="바디"
            leftLabel="매우 가벼움"
            rightLabel="매우 무거움"
            value={bodyLevel}
            onChange={(v) => {
              setBodyLevel(v);
              setBody(BODY_OPTIONS[v]);
            }}
          />
          <TasteScaleRow
            title="당도"
            leftLabel="매우 드라이"
            rightLabel="매우 스윗"
            value={sweetLevel}
            onChange={(v) => {
              setSweetLevel(v);
              setSweet(SWEET_OPTIONS[v]);
            }}
          />
          <TasteScaleRow
            title="산도"
            leftLabel="매우 부드러움"
            rightLabel="매우 시다"
            value={acidLevel}
            onChange={(v) => {
              setAcidLevel(v);
              setAcid(ACID_OPTIONS[v]);
            }}
          />
          <TasteScaleRow
            title="탄닌"
            leftLabel="매우 부드러움"
            rightLabel="매우 떫음"
            value={taninLevel}
            onChange={(v) => {
              setTaninLevel(v);
              setTanin(TANIN_OPTIONS[v]);
            }}
          />
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

      {/* 공개 범위 (맨 아래) */}
      <section className="mx-auto w-full max-w-mobile px-4 pb-12">
        <h3 className="text-base font-semibold mb-2">공개 범위</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`py-2 rounded-xl border ${visibility==='public' ? 'bg-accent text-white border-accent' : 'border-border'}`}
            onClick={() => setVisibility('public')}
          >
            전체 공개
          </button>
          <button
            type="button"
            className={`py-2 rounded-xl border ${visibility==='private' ? 'bg-accent text-white border-accent' : 'border-border'}`}
            onClick={() => setVisibility('private')}
          >
            나만 보기
          </button>
        </div>
      </section>

      {/* 제출 버튼 - BottomNav 위에 고정 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-border">
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5">
          <button disabled={!canSubmit} className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50">리뷰 올리기</button>
        </div>
      </div>
      <div className="h-0" />
    </form>
  );
}

type TasteRowProps = {
  label: string;
  options: string[];
  value?: string;
  onChange: (v: string) => void;
};

function TasteRow({ label, options, value, onChange }: TasteRowProps) {
  return (
    <div>
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`px-3 py-2 rounded-xl border text-sm ${value===opt ? 'bg-accent text-white border-accent' : 'border-border'}`}
            onClick={() => onChange(opt)}
            aria-pressed={value===opt}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

type FeelGroupProps = {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (token: string) => void;
};

function FeelGroup({ title, items, selected, onToggle }: FeelGroupProps) {
  return (
    <div className="mb-3">
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button
            key={it}
            type="button"
            onClick={() => onToggle(it)}
            className={`px-3 py-1.5 rounded-full text-sm border ${selected.includes(it) ? 'bg-neutral-200 border-neutral-200' : 'border-border'}`}
            aria-pressed={selected.includes(it)}
          >
            {it}
          </button>
        ))}
      </div>
    </div>
  );
}

type TasteScaleRowProps = {
  title: string;
  leftLabel: string;
  rightLabel: string;
  value: number; // 0..4
  onChange: (v: number) => void;
};

function TasteScaleRow({ title, leftLabel, rightLabel, value, onChange }: TasteScaleRowProps) {
  const fillPct = `${(value / 4) * 100}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 shrink-0 text-sm text-muted">{title}</div>
      <div className="flex-1">
        <div className="relative h-12">
          {/* labels */}
          <div className="absolute -top-5 left-0 text-[12px] text-muted">{leftLabel}</div>
          <div className="absolute -top-5 right-0 text-[12px] text-muted">{rightLabel}</div>
          {/* base line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[5px] bg-neutral-200 rounded-full" />
          {/* filled gauge */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[5px] bg-accent rounded-full"
            style={{ width: fillPct }}
          />
          {/* steps */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(i)}
                aria-label={`${i + 1} 단계`}
                className={`w-5 h-5 rounded-full border-2 ${i <= value ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
