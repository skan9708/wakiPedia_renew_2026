import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { trackSignUp } from '@/lib/analytics';

const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY ?? '';

function kakaoLogin() {
  if (!KAKAO_REST_API_KEY) { alert('카카오 API 키가 설정되지 않았습니다.'); return; }
  const redirectUri = `${window.location.origin}/auth/kakao/callback`;
  window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
}

export function SignupMobile() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const previewEmailVerification = new URLSearchParams(search).get('previewEmailVerification') === '1';
  const login = useAuthStore((s) => s.login);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState<boolean | null>(null);
  const [emailChallengeId, setEmailChallengeId] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phoneEnabled, setPhoneEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneChallengeId, setPhoneChallengeId] = useState('');
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/recovery/status/')
      .then(({ data }) => {
        setPhoneEnabled(Boolean(data.phoneEnabled));
        setEmailVerificationEnabled(Boolean(data.signupEmailVerificationEnabled));
      })
      .catch(() => {
        setPhoneEnabled(false);
        setError('가입 상태를 확인할 수 없습니다. 잠시 후 새로고침해주세요.');
      });
  }, []);

  const hasOptionalPhone = Boolean(phone.trim());
  const previewOnly = previewEmailVerification && !emailVerificationEnabled;
  const canSubmit = !previewOnly && emailVerificationEnabled !== null && nickname && email && password && confirm && agreePrivacy && agreeTerms && password === confirm
    && (!emailVerificationEnabled || (emailChallengeId && /^[0-9]{6}$/.test(emailCode)))
    && (!hasOptionalPhone || (phoneConsent && phoneChallengeId && /^[0-9]{6}$/.test(phoneCode)));

  const sendEmailCode = async () => {
    setEmailBusy(true); setEmailMessage(''); setError('');
    try {
      const { data } = await api.post('/auth/signup/email/send/', { email });
      setEmailChallengeId(data.challengeId);
      setEmailMessage('가입 가능한 이메일이라면 인증번호를 보냈습니다. 받은편지함을 확인해주세요.');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.response?.data?.email?.[0] ?? '인증 메일 발송에 실패했습니다.');
    } finally { setEmailBusy(false); }
  };

  const sendPhoneCode = async () => {
    setPhoneBusy(true); setPhoneMessage(''); setError('');
    try {
      const { data } = await api.post('/auth/signup/phone/send/', { phone, phoneConsent });
      setPhoneChallengeId(data.challengeId);
      setPhoneMessage('인증번호를 보냈습니다. 5분 안에 입력해주세요.');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.response?.data?.phone?.[0] ?? '인증번호 발송에 실패했습니다.');
    } finally { setPhoneBusy(false); }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return setError('입력값을 확인해주세요.');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/signup/', {
        email,
        nickname,
        password,
        passwordConfirm: confirm,
        ...(emailVerificationEnabled ? { emailChallengeId, emailCode } : {}),
        ...(hasOptionalPhone ? { phoneChallengeId, phoneCode, phoneConsent } : {}),
      });
      login(data.access, data.user);
      trackSignUp('email');
      navigate('/');
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData && typeof errData === 'object') {
        const msg = Object.values(errData).flat().join(' ');
        setError(msg);
      } else {
        setError('회원가입에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="mx-auto w-full max-w-mobile px-6 pt-8 text-center">
        <h1 className="text-accent font-brand text-5xl font-normal tracking-tight">Wakipedia</h1>
      </div>

      <section className="mx-auto w-full max-w-mobile px-4">
        <div className="card p-5 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <label className="block">
            <span className="block text-sm text-muted mb-1">닉네임</span>
            <input className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="와키" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">이메일</span>
            <input type="email" autoComplete="email" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={email} onChange={(e) => { setEmail(e.target.value); setEmailChallengeId(''); setEmailCode(''); setEmailMessage(''); }} placeholder="you@example.com" />
          </label>
          {(emailVerificationEnabled || previewEmailVerification) && <div className="space-y-2">
            <p className="text-sm font-medium">이메일 인증 <span className="text-accent">필수</span></p>
            {previewOnly && <p role="status" className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-muted">화면 미리보기입니다. 현재 인증 메일은 발송되지 않으며 이 화면에서 가입할 수 없습니다. <Link to="/auth/signup" className="text-accent underline">일반 가입 화면으로 돌아가기</Link></p>}
            <p className="text-xs text-muted">가입에 사용할 이메일로 인증번호를 보냅니다. 인증번호는 10분 동안 유효합니다.</p>
            <button type="button" disabled={!emailVerificationEnabled || !email.trim() || emailBusy} onClick={sendEmailCode} className="rounded-lg border border-accent px-3 py-2 text-sm text-accent disabled:opacity-50">
              {emailBusy ? '보내는 중...' : '이메일 인증번호 보내기'}
            </button>
            {(emailChallengeId || previewOnly) && <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} aria-label="이메일 인증번호" value={emailCode} onChange={e => setEmailCode(e.target.value)} placeholder="이메일 인증번호 6자리" disabled={previewOnly} className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />}
            {emailMessage && <p role="status" className="text-xs text-accent">{emailMessage}</p>}
          </div>}
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호 확인</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </label>
          {phoneEnabled && <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium">휴대폰 인증 (선택)</p>
            <p className="text-xs text-muted">아이디를 잊었을 때 기존 기록을 찾으려면 번호를 인증해 등록해주세요. 등록은 선택 사항이며, 광고 문자에는 사용하지 않습니다.</p>
            <p className="text-xs text-muted">수집 항목: 휴대폰 번호 · 보유 기간: 번호 삭제 요청 또는 회원 탈퇴 시까지 · 동의 거부 시 아이디 찾기 기능을 사용할 수 없습니다.</p>
            <p className="text-xs text-muted">인증번호는 5분간 유효합니다. 재발송은 1분 후 가능하며, 번호당 24시간 최대 5회까지 요청할 수 있습니다.</p>
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={phoneConsent} onChange={e => setPhoneConsent(e.target.checked)} />
              휴대폰 번호 수집·이용에 동의합니다 (선택)
            </label>
            <div className="flex gap-2">
              <input type="tel" inputMode="tel" autoComplete="tel" aria-label="휴대폰 번호" value={phone} onChange={e => { setPhone(e.target.value); setPhoneChallengeId(''); setPhoneCode(''); }} placeholder="010-1234-5678" className="min-w-0 flex-1 border border-border rounded-lg px-3 py-2 text-sm" />
              <button type="button" disabled={!phoneConsent || !phone.trim() || phoneBusy} onClick={sendPhoneCode} className="rounded-lg border border-accent px-3 text-sm text-accent disabled:opacity-50">인증번호 발송</button>
            </div>
            {phoneChallengeId && <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} aria-label="휴대폰 인증번호" value={phoneCode} onChange={e => setPhoneCode(e.target.value)} placeholder="인증번호 6자리" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />}
            {phoneMessage && <p role="status" className="text-xs text-accent">{phoneMessage}</p>}
          </div>}
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
            <span className="text-sm"><Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">개인정보처리방침</Link>에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
            <span className="text-sm"><Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-accent underline">이용약관</Link>에 동의합니다.</span>
          </label>
          <p className="text-sm text-center text-muted">
            이미 계정이 있으신가요?{' '}
            <button type="button" onClick={() => navigate('/auth/login')} className="text-accent font-medium">
              로그인
            </button>
          </p>
        </div>
      </section>

      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-border">
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5 space-y-2">
          <button type="submit" disabled={!canSubmit || loading} className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50">
            {loading ? '가입 중...' : '가입하기'}
          </button>
          <button
            type="button"
            onClick={kakaoLogin}
            className="w-full py-3 rounded-2xl bg-[#FEE500] text-[#191919] font-medium flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.09 1.24 3.93 3.12 5.01l-.8 2.98a.28.28 0 0 0 .43.3L7.6 13.6c.46.07.93.1 1.4.1 4.14 0 7.5-2.69 7.5-6S13.14 1.5 9 1.5z" fill="#191919"/>
            </svg>
            카카오로 시작하기
          </button>
        </div>
      </div>
      <div className="h-24" />
    </form>
  );
}
