import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import defaultWineImg from '@/assets/default-wine.jpg';

type WineSuggestion = {
  id: number;
  nameEng: string;
  nameKr: string;
  wineType: string;
  regions: string;
  imageUrl: string | null;
};

type WineDraft = {
  nameEng: string;
  nameKr: string;
  region: string;
  grapes: string[];
  type: 'Red' | 'White' | 'Rose' | 'Sparkling';
  image: File | null;
  preview: string | null;
  regionSearch: string;
  grapeSearch: string;
  customRegion: boolean;
};

const emptyDraft = (): WineDraft => ({
  nameEng: '', nameKr: '', region: '', grapes: [], type: 'Red',
  image: null, preview: null, regionSearch: '', grapeSearch: '', customRegion: false,
});

// React Router keeps the page in the same tab when a candidate is opened.
// Keep the File in memory too, so Back restores the photo as well as the text.
let savedDraft = emptyDraft();
let draftOwner: string | null = null;

function draftFor(owner: string | null) {
  if (draftOwner !== owner) {
    if (savedDraft.preview) URL.revokeObjectURL(savedDraft.preview);
    savedDraft = emptyDraft();
    draftOwner = owner;
  }
  return savedDraft;
}

export function WineRegistMobile() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [draft, setDraftState] = useState(() => draftFor(userId));
  const { nameEng, nameKr, region, grapes, type, image, preview, regionSearch, grapeSearch, customRegion } = draft;
  const [regions, setRegions] = useState<string[]>([]);
  const [grapeOptions, setGrapeOptions] = useState<string[]>([]);
  const [showAllRegions, setShowAllRegions] = useState(false);
  const [showAllGrapes, setShowAllGrapes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<WineSuggestion[]>([]);
  const [checkingSuggestions, setCheckingSuggestions] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const updateDraft = (patch: Partial<WineDraft>) => {
    setDraftState((current) => {
      savedDraft = { ...current, ...patch };
      return savedDraft;
    });
  };

  useEffect(() => {
    setDraftState(draftFor(userId));
  }, [userId]);

  useEffect(() => {
    api.get<{ countries: string[]; breeds: string[] }>('/wines/filters/')
      .then(({ data }) => {
        setRegions(data.countries ?? []);
        setGrapeOptions(data.breeds ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token || (nameEng.trim().length < 4 && nameKr.trim().length < 2)) {
      setSuggestions([]);
      setCheckingSuggestions(false);
      return;
    }
    const controller = new AbortController();
    setCheckingSuggestions(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get<{ results: WineSuggestion[] }>('/wines/suggestions/', {
          params: { nameEng, nameKr, wineType: type, regions: region },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setSuggestions(data.results);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setCheckingSuggestions(false);
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [token, nameEng, nameKr, type, region]);

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-mobile px-4 pt-16 text-center space-y-4">
        <p className="text-muted">로그인이 필요합니다.</p>
        <button className="w-full py-3 rounded-2xl bg-accent text-white" onClick={() => navigate('/auth/login')}>로그인하기</button>
      </div>
    );
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    updateDraft({ image: f, preview: URL.createObjectURL(f) });
  };

  const toggleGrape = (name: string) => {
    updateDraft({ grapes: grapes.includes(name) ? grapes.filter((item) => item !== name) : [...grapes, name] });
  };

  const addCustomGrape = () => {
    const name = grapeSearch.trim();
    if (!name || grapes.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    updateDraft({ grapes: [...grapes, name], grapeSearch: '' });
  };

  const matchingRegions = (regionSearch.trim()
    ? regions.filter((name) => name.toLocaleLowerCase().includes(regionSearch.trim().toLocaleLowerCase()))
    : regions);
  const visibleRegions = showAllRegions || regionSearch.trim() ? matchingRegions : matchingRegions.slice(0, 12);
  const matchingGrapes = (grapeSearch.trim()
    ? grapeOptions.filter((name) => name.toLocaleLowerCase().includes(grapeSearch.trim().toLocaleLowerCase()))
    : grapeOptions);
  const visibleGrapes = showAllGrapes || grapeSearch.trim() ? matchingGrapes : matchingGrapes.slice(0, 12);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEng || !nameKr) return setError('영문명과 한글명은 필수입니다.');
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('nameEng', nameEng);
      form.append('nameKr', nameKr);
      form.append('wineType', type);
      if (region) form.append('regions', region);
      if (grapes.length) form.append('breeds', grapes.join(','));
      if (image) form.append('image', image);

      const { data } = await api.post('/wines/', form);
      if (savedDraft.preview) URL.revokeObjectURL(savedDraft.preview);
      savedDraft = emptyDraft();
      navigate(`/wines/${data.id}`);
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData && typeof errData === 'object') {
        const msgs = Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' / '));
      } else {
        setError('등록에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">
        <h2 className="text-xl font-semibold">와인 등록</h2>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* 이미지 업로드 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">사진</h3>
        <div className="card p-4">
          <div className="grid grid-cols-4 gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl bg-bgsubtle text-muted grid place-items-center text-xs">사진 업로드</button>
            {preview && (
              <div className="aspect-square rounded-xl overflow-hidden">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        </div>
      </section>

      {/* 기본 정보 */}
      <section data-guide="wine-new-info" className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">기본 정보</h3>
        <div className="card p-4 space-y-3">
          <label className="block">
            <span className="block text-sm text-muted mb-1">와인 종류</span>
            <div className="grid grid-cols-4 gap-2">
              {(['Red', 'White', 'Rose', 'Sparkling'] as const).map((t) => (
                <button key={t} type="button" onClick={() => updateDraft({ type: t })}
                  className={`px-3 py-2 rounded-xl border text-sm ${type === t ? 'bg-accent text-white border-accent' : 'border-border'}`}>
                  {t}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">와인 영문 이름 *</span>
            <input value={nameEng} onChange={(e) => updateDraft({ nameEng: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2" placeholder="Chateau Mont-Perat" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">와인 한글 이름 *</span>
            <input value={nameKr} onChange={(e) => updateDraft({ nameKr: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2" placeholder="샤또몽페라" />
          </label>
          {(checkingSuggestions || suggestions.length > 0) && (
            <div className="rounded-xl border border-accent/35 bg-accent/5 p-3" aria-live="polite">
              <p className="font-semibold text-sm">혹시 이 와인인가요?</p>
              <p className="text-xs text-muted mt-1">같은 와인이 있다면 선택해 주세요.</p>
              {checkingSuggestions && <p className="text-xs text-muted mt-3">기존 와인을 확인하고 있어요...</p>}
              {!checkingSuggestions && suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {suggestions.map((wine) => (
                    <button key={wine.id} type="button" onClick={() => navigate(`/wines/${wine.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-white p-2 text-left">
                      <img src={wine.imageUrl || defaultWineImg} alt="" className="h-14 w-14 shrink-0 rounded-md bg-bgsubtle object-contain" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{wine.nameKr}</span>
                        <span className="block truncate text-xs text-muted">{wine.nameEng}</span>
                        <span className="block truncate text-xs text-muted">{[wine.wineType, wine.regions].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className="shrink-0 text-xs text-accent">보기</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div data-guide="wine-new-metadata" className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">원산지</span>
              {region && <span className="text-xs text-accent">선택: {region}</span>}
            </div>
            {!customRegion && (
              <>
                <input value={regionSearch} onChange={(e) => updateDraft({ regionSearch: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2" placeholder="원산지 검색" aria-label="원산지 검색" />
                <div className="flex flex-wrap gap-2">
                  {visibleRegions.map((name) => (
                    <button key={name} type="button" onClick={() => updateDraft({ region: name, regionSearch: '' })}
                      className={`rounded-full border px-3 py-1.5 text-sm ${region === name ? 'border-accent bg-accent text-white' : 'border-border'}`}>
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex flex-col items-start gap-3 pt-2">
              {!customRegion && !regionSearch && !showAllRegions && regions.length > 12 && (
                <button type="button" onClick={() => setShowAllRegions(true)} className="text-sm text-accent">전체 원산지 보기</button>
              )}
              <button type="button" onClick={() => updateDraft({ customRegion: !customRegion, region: '', regionSearch: '' })}
                className="text-sm text-accent underline underline-offset-2">
                {customRegion ? '목록에서 선택하기' : '목록에 없나요? 직접 입력하기'}
              </button>
            </div>
            {customRegion && (
              <input value={region} onChange={(e) => updateDraft({ region: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2" placeholder="새 원산지 입력" aria-label="새 원산지 입력" maxLength={255} />
            )}
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <span className="block text-sm text-muted">품종 · 여러 개 선택 가능</span>
            {grapes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {grapes.map((name) => (
                  <button key={name} type="button" onClick={() => toggleGrape(name)}
                    className="rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-sm text-accent" aria-label={`${name} 선택 해제`}>
                    {name} ×
                  </button>
                ))}
              </div>
            )}
            <input value={grapeSearch} onChange={(e) => updateDraft({ grapeSearch: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2" placeholder="품종 검색 또는 새 품종 입력" aria-label="품종 검색 또는 새 품종 입력" />
            <div className="flex flex-wrap gap-2">
              {visibleGrapes.map((name) => (
                <button key={name} type="button" onClick={() => toggleGrape(name)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${grapes.includes(name) ? 'border-accent bg-accent text-white' : 'border-border'}`}>
                  {name}
                </button>
              ))}
            </div>
            {!grapeSearch && !showAllGrapes && grapeOptions.length > 12 && (
              <button type="button" onClick={() => setShowAllGrapes(true)} className="text-sm text-accent">전체 품종 보기</button>
            )}
            {grapeSearch.trim() && !grapeOptions.some((name) => name.toLocaleLowerCase() === grapeSearch.trim().toLocaleLowerCase()) && (
              <button type="button" onClick={addCustomGrape}
                className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent">
                ‘{grapeSearch.trim()}’ 새 품종으로 추가
              </button>
            )}
          </div>
          <p className="text-xs text-muted">직접 입력한 원산지와 품종은 관리자 확인 후 선택 목록에 추가돼요.</p>
        </div>
      </section>

      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-border">
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5">
          <button className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50" type="submit" disabled={loading}>
            {loading ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </div>
      <div className="h-24" />
    </form>
  );
}
