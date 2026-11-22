import { useEffect, useRef, useState } from 'react';
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
  const [emailVerifyBusy, setEmailVerifyBusy] = useState(false);
  const [emailVerifyError, setEmailVerifyError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailExpiresAt, setEmailExpiresAt] = useState(0);
  const emailRequestVersion = useRef(0);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phoneEnabled, setPhoneEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneChallengeId, setPhoneChallengeId] = useState('');
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [phoneVerifyBusy, setPhoneVerifyBusy] = useState(false);
  const [phoneVerifyError, setPhoneVerifyError] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneExpiresAt, setPhoneExpiresAt] = useState(0);
  const phoneRequestVersion = useRef(0);
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

  useEffect(() => {
    if (!emailVerified || !emailExpiresAt) return;
    const timer = window.setTimeout(() => {
      setEmailVerified(false);
      setEmailMessage('인증 시간이 지났어요. 인증번호를 다시 받아주세요.');
    }, Math.max(0, emailExpiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [emailVerified, emailExpiresAt]);

  useEffect(() => {
    if (!phoneVerified || !phoneExpiresAt) return;
    const timer = window.setTimeout(() => {
      setPhoneVerified(false);
      setPhoneMessage('인증 시간이 지났어요. 인증번호를 다시 받아주세요.');
    }, Math.max(0, phoneExpiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [phoneVerified, phoneExpiresAt]);

  const hasOptionalPhone = Boolean(phone.trim());
  const phoneVerificationReady = phoneConsent && phoneVerified && phoneExpiresAt > Date.now();
  const previewOnly = previewEmailVerification;
  const canSubmit = !previewOnly && emailVerificationEnabled !== null && nickname && email && password && confirm && agreePrivacy && agreeTerms && password === confirm
    && (!emailVerificationEnabled || (emailVerified && emailExpiresAt > Date.now()))
    && (!hasOptionalPhone || phoneVerificationReady);

  const sendEmailCode = async () => {
    const version = ++emailRequestVersion.current;
    setEmailBusy(true); setEmailMessage(''); setEmailVerifyError(''); setError('');
    setEmailChallengeId(''); setEmailCode(''); setEmailVerified(false); setEmailExpiresAt(0);
    try {
      const { data } = await api.post('/auth/signup/email/send/', { email });
      if (version !== emailRequestVersion.current) return;
      setEmailChallengeId(data.challengeId);
      setEmailMessage('가입 가능한 이메일이라면 인증번호를 보냈습니다. 받은편지함을 확인해주세요.');
    } catch (err: any) {
      if (version !== emailRequestVersion.current) return;
      setError(err.response?.data?.detail ?? err.response?.data?.email?.[0] ?? '인증 메일 발송에 실패했습니다.');
    } finally { setEmailBusy(false); }
  };

  const verifyEmailCode = async () => {
    const version = emailRequestVersion.current;
    setEmailVerifyBusy(true); setEmailVerifyError(''); setError('');
    try {
      const { data } = await api.post('/auth/signup/email/verify/', { email, challengeId: emailChallengeId, code: emailCode });
      if (version !== emailRequestVersion.current) return;
      setEmailExpiresAt(Date.parse(data.expiresAt));
      setEmailVerified(true);
      setEmailMessage('이메일 인증 완료');
    } catch (err: any) {
      if (version !== emailRequestVersion.current) return;
      setEmailVerifyError(err.response?.data?.detail ?? '인증번호를 확인하지 못했어요. 다시 입력해주세요.');
    } finally { setEmailVerifyBusy(false); }
  };

  const sendPhoneCode = async () => {
    const version = ++phoneRequestVersion.current;
    setPhoneBusy(true); setPhoneMessage(''); setPhoneVerifyError(''); setError('');
    setPhoneChallengeId(''); setPhoneCode(''); setPhoneVerified(false); setPhoneExpiresAt(0);
    try {
      const { data } = await api.post('/auth/signup/phone/send/', { phone, phoneConsent });
      if (version !== phoneRequestVersion.current) return;
      setPhoneChallengeId(data.challengeId);
      setPhoneMessage('인증번호를 보냈습니다. 5분 안에 입력해주세요.');
    } catch (err: any) {
      if (version !== phoneRequestVersion.current) return;
      setError(err.response?.data?.detail ?? err.response?.data?.phone?.[0] ?? '인증번호 발송에 실패했습니다.');
    } finally { setPhoneBusy(false); }
  };

  const verifyPhoneCode = async () => {
    const version = phoneRequestVersion.current;
    setPhoneVerifyBusy(true); setPhoneVerifyError(''); setError('');
    try {
      const { data } = await api.post('/auth/signup/phone/verify/', { phone, challengeId: phoneChallengeId, code: phoneCode });
      if (version !== phoneRequestVersion.current) return;
      setPhoneExpiresAt(Date.parse(data.expiresAt));
      setPhoneVerified(true);
      setPhoneMessage('휴대폰 인증 완료');
    } catch (err: any) {
      if (version !== phoneRequestVersion.current) return;
      setPhoneVerifyError(err.response?.data?.detail ?? '인증번호를 확인하지 못했어요. 다시 입력해주세요.');
    } finally { setPhoneVerifyBusy(false); }
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
        if ('emailCode' in errData) setEmailVerified(false);
        if ('phoneCode' in errData) setPhoneVerified(false);
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
            <input type="email" autoComplete="email" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={email} onChange={(e) => { emailRequestVersion.current += 1; setEmail(e.target.value); setEmailChallengeId(''); setEmailCode(''); setEmailMessage(''); setEmailVerifyError(''); setEmailVerified(false); setEmailExpiresAt(0); }} placeholder="you@example.com" />
          </label>
          {(emailVerificationEnabled || previewEmailVerification) && <div className="space-y-2">
            <p className="text-sm font-medium">이메일 인증 <span className="text-accent">필수</span></p>
            {previewOnly && <p role="status" className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-muted">화면 미리보기 · 발송과 가입은 잠겨 있어요. <Link to="/auth/signup" className="text-accent underline">실제 가입하기</Link></p>}
            <p className="text-xs text-muted">인증번호는 10분간 유효해요.</p>
            <button type="button" disabled={previewOnly || !emailVerificationEnabled || !email.trim() || emailBusy || emailVerifyBusy} onClick={sendEmailCode} className="rounded-lg border border-accent px-3 py-2 text-sm text-accent disabled:opacity-50">
              {emailBusy ? '보내는 중...' : '인증번호 받기'}
            </button>
            {(emailChallengeId || previewOnly) && <div className="flex gap-2">
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} aria-label="이메일 인증번호" value={emailCode} onChange={e => { emailRequestVersion.current += 1; setEmailCode(e.target.value); setEmailVerifyError(''); setEmailVerified(false); setEmailExpiresAt(0); }} placeholder="이메일 인증번호 6자리" disabled={previewOnly || emailVerifyBusy || emailVerified} className="min-w-0 flex-1 border border-border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
              <button type="button" onClick={verifyEmailCode} disabled={previewOnly || emailVerified || emailVerifyBusy || !/^[0-9]{6}$/.test(emailCode)} className="shrink-0 rounded-lg border border-accent px-3 text-sm text-accent disabled:opacity-50">{emailVerifyBusy ? '확인 중' : '인증 확인'}</button>
            </div>}
            {emailMessage && <p role="status" className="text-xs text-accent">{emailMessage}</p>}
            {emailVerifyError && <p role="alert" className="text-xs text-red-500">{emailVerifyError}</p>}
          </div>}
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호 확인</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </label>
          {(phoneEnabled || previewOnly) && <details className="group border-t border-border pt-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl border-l-4 border-accent bg-[#eef1d2] px-4 py-3">
              <span>
                <span className="block text-sm font-medium">아이디(이메일) 찾기용 번호 등록 <span className="text-accent">선택</span></span>
                <span className="block text-xs text-muted mt-1">{hasOptionalPhone ? (phoneVerificationReady ? '휴대폰 인증 완료' : '번호 인증을 완료해주세요.') : '이메일을 잊었다면 등록한 번호로 찾아요.'}</span>
              </span>
              <span className="shrink-0 text-xs text-accent group-open:hidden">펼치기</span>
              <span className="hidden shrink-0 text-xs text-accent group-open:inline">접기</span>
            </summary>
            <div className="space-y-3 pt-4">
              <p className="text-xs text-muted">아이디를 잊었을 때 기존 기록을 찾으려면 번호를 인증해 등록해주세요. 등록은 선택 사항이며, 광고 문자에는 사용하지 않습니다.</p>
              <p className="text-xs text-muted">동의하지 않아도 가입할 수 있지만, 휴대폰 번호 미입력 시 아이디 찾기는 이용할 수 없습니다.</p>
              <p className="text-xs text-muted">수집 항목: 휴대폰 번호 / 목적: 아이디 찾기 / 보유: 삭제 요청 또는 탈퇴 시까지</p>
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={phoneConsent} onChange={e => { phoneRequestVersion.current += 1; setPhoneConsent(e.target.checked); setPhoneChallengeId(''); setPhoneCode(''); setPhoneMessage(''); setPhoneVerifyError(''); setPhoneVerified(false); setPhoneExpiresAt(0); }} />
                휴대폰 번호 수집·이용에 동의합니다 (선택)
              </label>
              <div className="flex gap-2">
                <input type="tel" inputMode="tel" autoComplete="tel" aria-label="휴대폰 번호" value={phone} onChange={e => { phoneRequestVersion.current += 1; setPhone(e.target.value); setPhoneChallengeId(''); setPhoneCode(''); setPhoneMessage(''); setPhoneVerifyError(''); setPhoneVerified(false); setPhoneExpiresAt(0); }} placeholder="010-1234-5678" className="min-w-0 flex-1 border border-border rounded-lg px-3 py-2 text-sm" />
                <button type="button" disabled={previewOnly || !phoneEnabled || !phoneConsent || !phone.trim() || phoneBusy || phoneVerifyBusy} onClick={sendPhoneCode} className="rounded-lg border border-accent px-3 text-sm text-accent disabled:opacity-50">문자 받기</button>
              </div>
              {(phoneChallengeId || previewOnly) && <div className="flex gap-2">
                <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} aria-label="휴대폰 인증번호" value={phoneCode} onChange={e => { phoneRequestVersion.current += 1; setPhoneCode(e.target.value); setPhoneVerifyError(''); setPhoneVerified(false); setPhoneExpiresAt(0); }} placeholder="문자 인증번호 6자리" disabled={previewOnly || phoneVerifyBusy || phoneVerified} className="min-w-0 flex-1 border border-border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
                <button type="button" onClick={verifyPhoneCode} disabled={previewOnly || phoneVerified || phoneVerifyBusy || !/^[0-9]{6}$/.test(phoneCode)} className="shrink-0 rounded-lg border border-accent px-3 text-sm text-accent disabled:opacity-50">{phoneVerifyBusy ? '확인 중' : '인증 확인'}</button>
              </div>}
              {phoneMessage && <p role="status" className="text-xs text-accent">{phoneMessage}</p>}
              {phoneVerifyError && <p role="alert" className="text-xs text-red-500">{phoneVerifyError}</p>}
            </div>
          </details>}
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
            disabled={previewOnly}
            className="w-full py-3 rounded-2xl bg-[#FEE500] text-[#191919] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
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
