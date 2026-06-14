import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY ?? '';

function kakaoLogin() {
  if (!KAKAO_REST_API_KEY) { alert('카카오 API 키가 설정되지 않았습니다.'); return; }
  const redirectUri = `${window.location.origin}/auth/kakao/callback`;
  window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
}

export function SignupMobile() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = nickname && email && password && confirm && agreePrivacy && agreeTerms && password === confirm;

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
      });
      login(data.access, data.user);
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
            <input type="email" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호 확인</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
            <span className="text-sm">개인정보 처리방침에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
            <span className="text-sm">이용약관에 동의합니다.</span>
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
