import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function AdminPasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/password/change/', { currentPassword, newPassword });
      logout();
      navigate('/admin-panel/login', { replace: true, state: { passwordChanged: true } });
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.detail ?? data?.newPassword?.[0] ?? '비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-bold">비밀번호 변경</h1>
      <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">변경 후에는 새 비밀번호로 다시 로그인해 주세요.</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label className="block text-sm font-medium text-gray-700">
          현재 비밀번호
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#c84b31]" />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          새 비밀번호
          <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#c84b31]" />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          새 비밀번호 확인
          <input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#c84b31]" />
        </label>
        <button type="submit" disabled={loading} className="rounded-lg bg-[#c84b31] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {loading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  );
}
