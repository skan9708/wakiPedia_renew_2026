import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { CopyButton, InfoRow, fmtDateTime } from './AdminReviewDetail';

type UserDetail = {
  id: number;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  kakaoId: string | null;
  isActive: boolean;
  isStaff: boolean;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  reviewCount: number;
  likesReceived: number;
  likesGiven: number;
  favoriteWines: { id: number; korName: string }[];
  reviews: {
    id: number;
    wineId: number;
    wineKorName: string;
    rating: number;
    text: string;
    isPublic: boolean;
    likeCount: number;
    createdAt: string;
  }[];
};

export function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/admin/users/${id}/`)
      .then(({ data }) => setUser(data))
      .catch((e) => setErr(e.response?.status === 404 ? '유저를 찾을 수 없습니다.' : '불러오지 못했습니다.'));
  }, [id]);

  if (err) return <div className="p-6 text-sm text-red-500">{err}</div>;
  if (!user) return <div className="p-6 text-sm text-gray-400">불러오는 중...</div>;

  const loginMethods = [user.hasPassword && '이메일', user.kakaoId && '카카오'].filter(Boolean).join(', ') || '-';

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600 mb-3">← 목록으로</button>
      <h1 className="text-lg font-bold mb-4">
        {user.nickname} <span className="text-sm text-gray-400 font-normal">유저 #{user.id}</span>
      </h1>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <div className="flex gap-5">
          <div className="shrink-0">
            {user.avatarUrl ? (
              <a href={user.avatarUrl} target="_blank" rel="noreferrer">
                <img src={user.avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border border-gray-100" />
              </a>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-2xl text-gray-300">👤</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <InfoRow label="이메일">{user.email}</InfoRow>
            <InfoRow label="닉네임">{user.nickname}</InfoRow>
            <InfoRow label="로그인 방식">{loginMethods}</InfoRow>
            <InfoRow label="카카오 ID">{user.kakaoId ?? <span className="text-gray-300">연결 안 됨</span>}</InfoRow>
            <InfoRow label="상태">
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${user.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-400'}`}>
                {user.isActive ? '활성' : '비활성'}
              </span>
              {user.isStaff && <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-purple-50 text-purple-600 ml-2">관리자</span>}
            </InfoRow>
            <InfoRow label="가입 일시">{fmtDateTime(user.createdAt)}</InfoRow>
            <InfoRow label="정보 수정 일시">{fmtDateTime(user.updatedAt)}</InfoRow>
            <InfoRow label="마지막 로그인">{user.lastLogin ? fmtDateTime(user.lastLogin) : <span className="text-gray-300">기록 없음</span>}</InfoRow>
            <InfoRow label="프로필 이미지">
              {user.avatarUrl ? (
                <div className="flex items-center gap-2">
                  <a href={user.avatarUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-xs text-blue-500 hover:underline break-all">{user.avatarUrl}</a>
                  <CopyButton text={user.avatarUrl} />
                </div>
              ) : <span className="text-gray-300">없음</span>}
            </InfoRow>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '작성 리뷰', value: user.reviewCount },
          { label: '받은 좋아요', value: user.likesReceived },
          { label: '누른 좋아요', value: user.likesGiven },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="text-sm font-semibold mb-2">즐겨찾기 와인 <span className="text-gray-400 font-normal">{user.favoriteWines.length}개</span></h2>
        {user.favoriteWines.length === 0 ? <p className="text-sm text-gray-300">없음</p> : (
          <div className="flex flex-wrap gap-1">
            {user.favoriteWines.map((w) => <span key={w.id} className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-gray-100">{w.korName}</span>)}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h2 className="text-sm font-semibold px-5 pt-4 pb-2">
          작성한 리뷰 {user.reviewCount > user.reviews.length && <span className="text-gray-400 font-normal">(최근 {user.reviews.length}개)</span>}
        </h2>
        {user.reviews.length === 0 ? <p className="text-sm text-gray-300 px-5 pb-4">없음</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="whitespace-nowrap text-left px-4 py-2 w-14">ID</th>
                <th className="whitespace-nowrap text-left px-4 py-2">와인</th>
                <th className="whitespace-nowrap text-left px-4 py-2 w-16">평점</th>
                <th className="whitespace-nowrap text-left px-4 py-2">내용</th>
                <th className="whitespace-nowrap text-left px-4 py-2 w-14">공개</th>
                <th className="whitespace-nowrap text-left px-4 py-2 w-40">작성 일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {user.reviews.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/admin-panel/reviews/${r.id}`)} className="hover:bg-gray-50/50 cursor-pointer">
                  <td className="px-4 py-2 text-gray-400">{r.id}</td>
                  <td className="px-4 py-2 max-w-[160px]"><div className="truncate">{r.wineKorName}</div></td>
                  <td className="px-4 py-2 text-[#c84b31]">★ {r.rating.toFixed(1)}</td>
                  <td className="px-4 py-2 text-gray-500 max-w-[220px]"><div className="truncate text-xs">{r.text}</div></td>
                  <td className="px-4 py-2 text-xs">{r.isPublic ? '공개' : '비공개'}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{fmtDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-300 mt-4">
        <Link to="/admin-panel/users" className="hover:underline">유저 목록</Link>
      </p>
    </div>
  );
}
