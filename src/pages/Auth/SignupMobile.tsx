import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

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
        <img src="/src/assets/icons/icon_white.svg" alt="Wakipedia 로고" className="w-20 h-20 mx-auto mb-2" />
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
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5">
          <button type="submit" disabled={!canSubmit || loading} className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50">
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </div>
      </div>
      <div className="h-24" />
    </form>
  );
}
