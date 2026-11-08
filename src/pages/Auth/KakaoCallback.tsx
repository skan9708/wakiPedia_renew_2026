import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { trackSignUp } from '@/lib/analytics';

export function KakaoCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const called = useRef(false);
  const [link, setLink] = useState<{ token: string; email: string } | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    if (!code) {
      navigate('/auth/login');
      return;
    }
    window.history.replaceState(window.history.state, '', '/auth/kakao/callback');

    api.post('/auth/kakao/', {
      code,
      redirect_uri: `${window.location.origin}/auth/kakao/callback`,
    })
      .then(({ data }) => {
        login(data.access, data.user);
        if (data.isNewUser === true) trackSignUp('kakao');
        navigate('/');
      })
      .catch((err) => {
        if (err?.response?.status === 409 && err.response.data?.linkRequired && err.response.data?.linkToken) {
          setLink({ token: err.response.data.linkToken, email: err.response.data.email });
          return;
        }
        setError(err?.response?.data?.detail ?? '카카오 로그인에 실패했습니다. 다시 시도해주세요.');
      });
  }, []);

  const confirmLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!link || !password) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/auth/kakao/link/', { linkToken: link.token, password });
      setPassword('');
      login(data.access, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? '카카오 계정 연결에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-mobile px-4 pt-12">
      <div className="card p-5 space-y-4">
        <h1 className="text-lg font-semibold">카카오 계정 연결</h1>
        {link ? <>
          <p className="text-sm text-muted">{link.email}로 가입한 계정이 있습니다. 기존 계정 비밀번호를 확인하면 리뷰와 기록을 유지한 채 카카오 로그인을 연결할 수 있습니다.</p>
          <form onSubmit={confirmLink} className="space-y-3">
            <label className="block text-sm">기존 계정 비밀번호
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full border border-border rounded-lg px-3 py-2" required />
            </label>
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-accent py-3 text-white disabled:opacity-50">{submitting ? '확인 중...' : '확인하고 카카오 연결'}</button>
          </form>
        </> : !error && <p className="text-muted text-sm">카카오 로그인 중...</p>}
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        {(link || error) && <button type="button" onClick={() => navigate('/auth/login')} className="w-full text-sm text-accent underline">로그인 화면으로 돌아가기</button>}
      </div>
    </div>
  );
}
