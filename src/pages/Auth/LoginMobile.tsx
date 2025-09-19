export function LoginMobile() {
  return (
    <form className="space-y-6">
      {/* 상단 로고 (회원가입과 동일 스타일) */}
      <div className="mx-auto w-full max-w-mobile px-6 pt-8 text-center">
        <img src="/src/assets/icons/icon_white.svg" alt="Wakipedia 로고" className="w-20 h-20 mx-auto mb-2" />
        <h1 className="text-accent font-brand text-5xl font-normal tracking-tight">Wakipedia</h1>
      </div>

      {/* 입력 폼 */}
      <section className="mx-auto w-full max-w-mobile px-4">
        <div className="card p-5 space-y-4">
          <label className="block">
            <span className="block text-sm text-muted mb-1">이메일</span>
            <input type="email" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">비밀번호</span>
            <input type="password" className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40" placeholder="••••••••" />
          </label>
        </div>
      </section>

      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-border">
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5">
          <button className="w-full py-3 rounded-2xl bg-accent text-white">로그인</button>
        </div>
      </div>
      <div className="h-24" />
    </form>
  );
}


