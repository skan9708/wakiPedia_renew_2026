import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';

type RecoveryStatus = { phoneEnabled: boolean; emailEnabled: boolean };

function useRecoveryStatus() {
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  useEffect(() => {
    api.get<RecoveryStatus>('/auth/recovery/status/')
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus({ phoneEnabled: false, emailEnabled: false }));
  }, []);
  return status;
}

function errorMessage(error: any) {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
}

function RecoveryShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-mobile px-4 pt-8 space-y-5">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="card p-5 space-y-4">{children}</div>
      <p className="text-sm text-center"><Link className="text-accent underline" to="/auth/login">로그인으로 돌아가기</Link></p>
    </div>
  );
}

export function FindEmailMobile() {
  const status = useRecoveryStatus();
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(''); setResult('');
    try {
      const { data } = await api.post('/auth/find-email/send/', { phone });
      setChallengeId(data.challengeId);
      setMessage(data.detail);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/find-email/verify/', { challengeId, code });
      setResult(data.provider === 'kakao' ? '카카오로 가입한 계정입니다. 카카오로 로그인해주세요.' : `로그인 이메일: ${data.email}`);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };

  return <RecoveryShell title="아이디(이메일) 찾기">
    <p className="text-sm text-muted">내 정보에 인증해 등록한 휴대폰 번호로 이메일을 찾을 수 있습니다.</p>
    {status && !status.phoneEnabled && <p className="text-sm text-muted">휴대폰 인증 서비스 준비 중입니다. 카카오 가입자는 카카오로 로그인할 수 있습니다.</p>}
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    {message && <p role="status" className="text-sm text-accent">{message}</p>}
    {result && <p role="status" className="text-sm font-medium">{result}</p>}
    <form onSubmit={send} className="space-y-3">
      <label className="block text-sm">휴대폰 번호
        <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-1234-5678" className="mt-1 w-full border border-border rounded-lg px-3 py-2" required disabled={!status?.phoneEnabled || loading} />
      </label>
      <button type="submit" disabled={!status?.phoneEnabled || loading} className="w-full rounded-xl bg-accent py-3 text-white disabled:opacity-50">인증번호 보내기</button>
    </form>
    {challengeId && !result && <form onSubmit={verify} className="space-y-3">
      <label className="block text-sm">인증번호
        <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} placeholder="6자리" className="mt-1 w-full border border-border rounded-lg px-3 py-2" required />
      </label>
      <button type="submit" disabled={loading} className="w-full rounded-xl border border-accent py-3 text-accent disabled:opacity-50">아이디 확인</button>
    </form>}
    <p className="text-xs text-muted">휴대폰을 등록하지 않은 기존 회원은 로그인 후 내 정보에서 인증해 등록할 수 있습니다.</p>
  </RecoveryShell>;
}

export function PasswordResetRequestMobile() {
  const status = useRecoveryStatus();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/password-reset/request/', { email });
      setMessage(data.detail);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };

  return <RecoveryShell title="비밀번호 재설정">
    <p className="text-sm text-muted">가입 이메일로 재설정 링크를 보내드립니다. 카카오로만 가입한 계정은 카카오로 로그인해주세요.</p>
    {status && !status.emailEnabled && <p className="text-sm text-muted">이메일 재설정 서비스 준비 중입니다.</p>}
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    {message && <p role="status" className="text-sm text-accent">{message}</p>}
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">가입 이메일
        <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 w-full border border-border rounded-lg px-3 py-2" required disabled={!status?.emailEnabled || loading} />
      </label>
      <button type="submit" disabled={!status?.emailEnabled || loading} className="w-full rounded-xl bg-accent py-3 text-white disabled:opacity-50">재설정 링크 보내기</button>
    </form>
  </RecoveryShell>;
}

export function PasswordResetConfirmMobile() {
  const [credentials] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { uid: params.get('uid') ?? '', token: params.get('token') ?? '' };
  });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Keep one-time credentials out of browser history and analytics URLs.
    window.history.replaceState(window.history.state, '', '/auth/reset-password');
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/password-reset/confirm/', { ...credentials, password });
      setMessage(data.detail);
    } catch (err: any) {
      const first = err?.response?.data?.password?.[0];
      setError(first ?? errorMessage(err));
    } finally { setLoading(false); }
  };

  return <RecoveryShell title="새 비밀번호 설정">
    {!credentials.uid || !credentials.token ? <p className="text-sm text-red-500">재설정 링크가 유효하지 않습니다.</p> : <>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {message && <p role="status" className="text-sm text-accent">{message}</p>}
      {!message && <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">새 비밀번호
          <input type="password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border border-border rounded-lg px-3 py-2" required />
        </label>
        <label className="block text-sm">새 비밀번호 확인
          <input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 w-full border border-border rounded-lg px-3 py-2" required />
        </label>
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-accent py-3 text-white disabled:opacity-50">비밀번호 변경</button>
      </form>}
    </>}
  </RecoveryShell>;
}
