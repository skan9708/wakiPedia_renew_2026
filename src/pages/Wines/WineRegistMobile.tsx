import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function WineRegistMobile() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [nameEng, setNameEng] = useState('');
  const [nameKr, setNameKr] = useState('');
  const [region, setRegion] = useState('');
  const [breed, setBreed] = useState('');
  const [type, setType] = useState<'Red' | 'White' | 'Rose' | 'Sparkling'>('Red');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

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
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

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
      if (breed) form.append('breeds', breed);
      if (image) form.append('image', image);

      const { data } = await api.post('/wines/', form);
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
      <section className="mx-auto w-full max-w-mobile px-4">
        <h3 className="text-base font-semibold mb-2">기본 정보</h3>
        <div className="card p-4 space-y-3">
          <label className="block">
            <span className="block text-sm text-muted mb-1">와인 종류</span>
            <div className="grid grid-cols-4 gap-2">
              {(['Red', 'White', 'Rose', 'Sparkling'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-xl border text-sm ${type === t ? 'bg-accent text-white border-accent' : 'border-border'}`}>
                  {t}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">와인 영문 이름 *</span>
            <input value={nameEng} onChange={(e) => setNameEng(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2" placeholder="Chateau Mont-Perat" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">와인 한글 이름 *</span>
            <input value={nameKr} onChange={(e) => setNameKr(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2" placeholder="샤또몽페라" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">원산지</span>
            <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2" placeholder="프랑스" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">품종 (쉼표로 구분)</span>
            <input value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2" placeholder="메를로, 까베르네 프랑" />
          </label>
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
