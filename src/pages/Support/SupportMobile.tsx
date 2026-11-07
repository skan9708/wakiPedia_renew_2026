import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

const categories = [
  { value: 'bug', label: '불편한 점' },
  { value: 'idea', label: '원하는 기능' },
  { value: 'other', label: '기타 의견' },
] as const;

type Category = (typeof categories)[number]['value'];

export function SupportMobile() {
  const [category, setCategory] = useState<Category>('idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [replyConsent, setReplyConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (message.trim().length < 10) {
      setError('의견을 10자 이상 적어 주세요.');
      return;
    }
    if (email.trim() && !replyConsent) {
      setError('답변용 이메일 수집에 동의해 주세요.');
      return;
    }
    setSending(true);
    try {
      await api.post('/feedback/', {
        category,
        message: message.trim(),
        email: email.trim(),
        replyConsent: Boolean(email.trim() && replyConsent),
      });
      setSent(true);
      setMessage('');
      setEmail('');
      setReplyConsent(false);
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
          <h1 className="text-xl font-semibold">피드백 남기기</h1>
          <p className="text-sm text-muted mt-1">와키피디아를 함께 만들어 주세요</p>
        </div>

        {sent ? (
          <div className="card p-6 text-center space-y-4" role="status">
            <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
            <h2 className="font-semibold">의견을 보내주셔서 감사합니다!</h2>
            <p className="text-sm text-muted">남겨주신 의견을 서비스 개선에 참고하겠습니다.</p>
            <button type="button" onClick={() => setSent(false)} className="text-sm text-accent underline">다른 의견 남기기</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card p-5 space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold mb-3">어떤 의견인가요?</legend>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((item) => (
                  <label key={item.value} className={`cursor-pointer rounded-xl border px-2 py-3 text-center text-sm ${category === item.value ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border text-muted'}`}>
                    <input type="radio" name="category" value={item.value} checked={category === item.value} onChange={() => setCategory(item.value)} className="sr-only" />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="feedback-message" className="block text-sm font-semibold mb-2">의견을 들려주세요</label>
              <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={2000} required rows={6} placeholder="불편했던 점이나 추가되었으면 하는 기능을 자유롭게 적어 주세요." className="w-full rounded-xl border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-accent resize-y" />
              <p className="text-xs text-muted mt-1">10~2,000자 · 개인정보나 비밀번호는 적지 마세요.</p>
            </div>

            <div>
              <label htmlFor="feedback-email" className="block text-sm font-semibold mb-2">답변받을 이메일 <span className="font-normal text-muted">(선택)</span></label>
              <input id="feedback-email" type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="답변이 필요한 경우에만 적어 주세요" className="w-full rounded-xl border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-accent" />
              {email.trim() && (
                <label className="flex items-start gap-2 mt-3 text-xs leading-relaxed text-muted">
                  <input type="checkbox" checked={replyConsent} onChange={(event) => setReplyConsent(event.target.checked)} className="mt-0.5 accent-accent" />
                  <span>답변을 위해 이메일 주소를 수집·이용하는 데 동의합니다. 답변이 필요하지 않다면 이메일을 비워 주세요. <Link to="/privacy" className="underline">개인정보처리방침</Link></span>
                </label>
              )}
            </div>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-medium text-white disabled:opacity-60">
              <Send className="w-4 h-4" />{sending ? '보내는 중...' : '피드백 보내기'}
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
