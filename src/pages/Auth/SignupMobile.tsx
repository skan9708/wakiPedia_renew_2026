import { useState } from 'react';

export function SignupMobile() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const canSubmit = nickname && email && password && confirm && phone && agreePrivacy && agreeTerms && password === confirm;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return alert('입력값을 확인해주세요.');
    const payload = { nickname, email, password, phone, agreePrivacy, agreeTerms };
    console.log('signup', payload);
    alert('로컬 데모: 가입 페이로드 콘솔 출력');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 상단 로고 영역 (Home 톤 간소화) */}
      <div className="mx-auto w-full max-w-mobile px-6 pt-8 text-center">
        <img src="/src/assets/icons/icon_white.svg" alt="Wakipedia 로고" className="w-20 h-20 mx-auto mb-2" />
        <h1 className="text-accent font-brand text-5xl font-normal tracking-tight">Wakipedia</h1>
      </div>

      {/* 폼 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <div className="card p-5 space-y-4">
          <label className="block">
            <span className="block text-sm text-muted mb-1">닉네임</span>
            <input className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={nickname} onChange={(e)=>setNickname(e.target.value)} placeholder="와키" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">이메일</span>
            <input type="email" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호 확인</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="••••••••" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">휴대폰 번호</span>
            <input type="tel" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="010-1234-5678" />
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={agreePrivacy} onChange={(e)=>setAgreePrivacy(e.target.checked)} />
            <span className="text-sm">개인정보 처리방침에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={agreeTerms} onChange={(e)=>setAgreeTerms(e.target.checked)} />
            <span className="text-sm">이용약관에 동의합니다.</span>
          </label>
        </div>
      </section>

      {/* 제출 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-border">
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5">
          <button type="submit" disabled={!canSubmit} className="w-full py-3 rounded-2xl bg-accent text-white disabled:opacity-50">가입하기</button>
        </div>
      </div>
      <div className="h-24" />
    </form>
  );
}


