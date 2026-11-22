import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

const categories = [
  { value: 'bug', label: '불편한 점' },
  { value: 'idea', label: '원하는 기능' },
  { value: 'other', label: '기타 의견' },
] as const;

type Category = (typeof categories)[number]['value'];
type WineContext = { id: number; nameKr: string; nameEng: string };

export function SupportMobile() {
  const [searchParams] = useSearchParams();
  const wineIdParam = searchParams.get('wine_id');
  const wineId = wineIdParam && /^[1-9]\d*$/.test(wineIdParam) ? Number(wineIdParam) : null;
  const isWineRequest = wineIdParam !== null;
  const [category, setCategory] = useState<Category>('idea');
  const [wine, setWine] = useState<WineContext | null>(null);
  const [wineLoading, setWineLoading] = useState(isWineRequest);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!wineId || !Number.isSafeInteger(wineId)) {
      setWine(null);
      setWineLoading(false);
      return;
    }
    let active = true;
    setWine(null);
    setWineLoading(true);
    api.get<WineContext>(`/wines/${wineId}/`)
      .then(({ data }) => { if (active) setWine({ id: data.id, nameKr: data.nameKr, nameEng: data.nameEng }); })
      .catch(() => { if (active) setWine(null); })
      .finally(() => { if (active) setWineLoading(false); });
    return () => { active = false; };
  }, [wineId]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (message.trim().length < 10) {
      setError('내용을 10자 이상 적어 주세요.');
      return;
    }
    if (isWineRequest && !wine) {
      setError('와인 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
      return;
    }
    setSending(true);
    try {
      await api.post('/feedback/', {
        category: isWineRequest ? 'wine' : category,
        message: message.trim(),
        ...(isWineRequest && wine ? { wineId: wine.id } : {}),
      });
      setSent(true);
      setMessage('');
    } catch (err: any) {
      setError(err.response?.status === 429
        ? '잠시 후 다시 보내 주세요. 한 시간에 최대 5번 제출할 수 있습니다.'
        : '전송하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-xl font-semibold">{isWineRequest ? '와인 정보 수정 요청' : '피드백 남기기'}</h1>
          <p className="text-sm text-muted mt-1">{isWineRequest ? '관리자가 확인하고 필요한 경우 수정할게요.' : '와키피디아를 함께 만들어 주세요'}</p>
        </div>

        {sent ? (
          <div className="card p-6 text-center space-y-4" role="status">
            <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
            <h2 className="font-semibold">{isWineRequest ? '수정 요청을 접수했어요.' : '의견을 보내주셔서 감사합니다!'}</h2>
            <p className="text-sm text-muted">{isWineRequest ? '와인 정보를 확인한 뒤 필요한 내용을 수정할게요.' : '남겨주신 의견을 서비스 개선에 참고하겠습니다.'}</p>
            {isWineRequest && wine ? <Link to={`/wines/${wine.id}`} className="text-sm text-accent underline">와인으로 돌아가기</Link> : <button type="button" onClick={() => setSent(false)} className="text-sm text-accent underline">다른 의견 남기기</button>}
          </div>
        ) : isWineRequest && (wineLoading || !wine) ? (
          <div className="card p-6 text-center text-sm text-muted" role="status">
            {wineLoading ? '와인 정보를 불러오는 중...' : '와인을 찾을 수 없습니다. 와인 상세 화면에서 다시 요청해 주세요.'}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card p-5 space-y-5">
            {isWineRequest && wine && (
              <div className="rounded-xl bg-accent/10 p-4 text-sm">
                <div className="text-xs text-muted">수정 요청할 와인</div>
                <div className="mt-1 font-semibold">{wine.nameKr}</div>
                <div className="text-muted">{wine.nameEng}</div>
                <Link to={`/wines/${wine.id}`} className="mt-2 inline-block text-xs text-accent underline">와인 상세 보기</Link>
              </div>
            )}
            {!isWineRequest && <fieldset>
              <legend className="text-sm font-semibold mb-3">어떤 의견인가요?</legend>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((item) => (
                  <label key={item.value} className={`cursor-pointer rounded-xl border px-2 py-3 text-center text-sm ${category === item.value ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border text-muted'}`}>
                    <input type="radio" name="category" value={item.value} checked={category === item.value} onChange={() => setCategory(item.value)} className="sr-only" />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>}

            <div>
              <label htmlFor="feedback-message" className="block text-sm font-semibold mb-2">{isWineRequest ? '어떤 정보가 잘못됐나요?' : '의견을 들려주세요'}</label>
              <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={2000} required rows={6} placeholder={isWineRequest ? '잘못된 항목과 올바른 정보를 적어 주세요. 확인할 수 있는 출처도 함께 알려주시면 도움이 돼요.' : '불편했던 점이나 추가되었으면 하는 기능을 자유롭게 적어 주세요.'} className="w-full rounded-xl border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-accent resize-y" />
              <p className="text-xs text-muted mt-1">10~2,000자 · 개인정보나 비밀번호는 적지 마세요.</p>
            </div>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-medium text-white disabled:opacity-60">
              <Send className="w-4 h-4" />{sending ? '보내는 중...' : isWineRequest ? '수정 요청 보내기' : '피드백 보내기'}
            </button>
          </form>
        )}

        <div className="card p-5 mt-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Mail className="w-4 h-4 text-accent" />문의가 필요한가요?</div>
          <p className="text-xs text-muted leading-relaxed">계정이나 개인정보 관련 문의는 이메일로 보내 주세요.</p>
          <a href="mailto:wakipedia1682@gmail.com" className="text-sm text-accent underline">wakipedia1682@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
