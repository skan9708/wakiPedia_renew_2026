import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY ?? '';
const KAKAO_REDIRECT_URI = `${window.location.origin}/auth/kakao/callback`;

function kakaoLogin() {
  if (!KAKAO_REST_API_KEY) {
    alert('카카오 API 키가 설정되지 않았습니다.');
    return;
  }
  const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;
  window.location.href = url;
}

export function LoginMobile() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('이메일과 비밀번호를 입력해주세요.');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login/', { email, password });
      login(data.access, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '로그인에 실패했습니다.');
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
            <span className="block text-sm text-muted mb-1">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="••••••••"
            />
          </label>
          <p className="text-sm text-center text-muted">
            계정이 없으신가요?{' '}
            <button type="button" onClick={() => navigate('/auth/signup')} className="text-accent font-medium">
              회원가입
            </button>
          </p>
        </div>
      </section>

      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-border">
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5 space-y-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <button
            type="button"
            onClick={kakaoLogin}
            className="w-full py-3 rounded-2xl bg-[#FEE500] text-[#191919] font-medium flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.09 1.24 3.93 3.12 5.01l-.8 2.98a.28.28 0 0 0 .43.3L7.6 13.6c.46.07.93.1 1.4.1 4.14 0 7.5-2.69 7.5-6S13.14 1.5 9 1.5z" fill="#191919"/>
            </svg>
            카카오로 로그인
          </button>
        </div>
      </div>
      <div className="h-24" />
    </form>
  );
}
