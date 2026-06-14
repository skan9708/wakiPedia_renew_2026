import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function KakaoCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    if (!code) {
      navigate('/auth/login');
      return;
    }

    api.post('/auth/kakao/', {
      code,
      redirect_uri: `${window.location.origin}/auth/kakao/callback`,
    })
      .then(({ data }) => {
        login(data.access, data.user);
        navigate('/');
      })
      .catch(() => {
        navigate('/auth/login');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="text-2xl">🍷</div>
        <p className="text-muted text-sm">카카오 로그인 중...</p>
      </div>
    </div>
  );
}
