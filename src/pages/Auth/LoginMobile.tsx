import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

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
        <img src="/src/assets/icons/icon_white.svg" alt="Wakipedia 로고" className="w-20 h-20 mx-auto mb-2" />
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
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
      <div className="h-24" />
    </form>
  );
}
