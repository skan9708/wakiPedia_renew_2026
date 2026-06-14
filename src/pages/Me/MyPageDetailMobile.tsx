import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function MyPageDetailMobile() {
  const navigate = useNavigate();
  const { user: storeUser, login, token } = useAuthStore();

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) { navigate('/auth/login'); return; }
    api.get('/me/')
      .then(({ data }) => {
        setNickname(data.nickname ?? '');
        setEmail(data.email ?? '');
        setAvatarUrl(data.avatarUrl ?? null);
      })
      .catch(() => setError('프로필을 불러오지 못했습니다.'))
      .finally(() => setFetchLoading(false));
  }, [token]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
    if (fileRef.current) fileRef.current.value = '';
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const form = new FormData();
      form.append('nickname', nickname.trim());
      if (avatarFile) form.append('avatar', avatarFile);

      const { data } = await api.patch('/me/', form);

      // 스토어 유저 정보 업데이트
      if (token) login(token, data);

      setSuccess('프로필이 저장되었습니다.');
      setAvatarUrl(data.avatarUrl ?? null);
      setAvatarFile(null);
      setPreview(null);
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData && typeof errData === 'object') {
        const msgs = Object.values(errData).flat().join(' ');
        setError(msgs);
      } else {
        setError('저장에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const displayImg = preview ?? avatarUrl;
  const initial = nickname?.[0] ?? storeUser?.nickname?.[0] ?? '?';

  if (fetchLoading) {
    return <div className="p-8 text-center text-sm text-muted">불러오는 중...</div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">

        {/* 아바타 */}
        <div className="flex flex-col items-center py-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center">
              {displayImg
                ? <img src={displayImg} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-accent text-4xl font-bold">{initial}</span>
              }
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>
          <p className="mt-2 text-xs text-muted">사진을 눌러 변경</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
        </div>

        {/* 입력 필드 */}
        <div className="card p-5 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-accent">{success}</p>}

          <label className="block">
            <span className="block text-sm text-muted mb-1">닉네임</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="닉네임을 입력하세요"
            />
          </label>

          <label className="block">
            <span className="block text-sm text-muted mb-1">이메일</span>
            <input
              type="email"
              value={email}
              disabled
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bgsubtle text-muted cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted">이메일은 변경할 수 없습니다.</p>
          </label>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-border">
        <div className="mx-auto w-full max-w-mobile px-4 py-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/me')}
            className="flex-1 py-3 rounded-2xl border border-border text-sm"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-accent text-white text-sm disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
      <div className="h-24" />
    </form>
  );
}
