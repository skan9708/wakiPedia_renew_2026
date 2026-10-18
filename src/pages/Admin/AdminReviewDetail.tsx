import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { ReviewModal } from './AdminReviews';

type ReviewDetail = {
  id: number;
  wineId: number;
  wineKorName: string;
  wineEngName: string;
  userId: number;
  userNickname: string;
  userEmail: string;
  rating: number;
  text: string;
  body: number;
  acidity: number;
  sweetness: number;
  tannin: number;
  isPublic: boolean;
  feels: string[];
  images: { id: number; url: string; createdAt: string }[];
  likeCount: number;
  likedBy: { id: number; nickname: string }[];
  createdAt: string;
  updatedAt: string;
};

export const fmtDateTime = (s?: string | null) => (s ? s.replace('T', ' ').slice(0, 19) : '-');

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-gray-50 last:border-0 text-sm">
      <div className="w-32 shrink-0 text-gray-400">{label}</div>
      <div className="flex-1 min-w-0 break-all">{children}</div>
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="shrink-0 text-xs border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50">
      {copied ? '복사됨' : '복사'}
    </button>
  );
}

const TASTE = [
  { key: 'body', label: '바디' },
  { key: 'sweetness', label: '당도' },
  { key: 'acidity', label: '산도' },
  { key: 'tannin', label: '탄닌' },
] as const;

export function AdminReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/reviews/${id}/`);
      setReview(data);
    } catch (e: any) {
      setErr(e.response?.status === 404 ? '리뷰를 찾을 수 없습니다.' : '불러오지 못했습니다.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async () => {
    await api.delete(`/admin/reviews/${id}/`);
    navigate('/admin-panel/reviews');
  };

  if (err) return <div className="p-6 text-sm text-red-500">{err}</div>;
  if (!review) return <div className="p-6 text-sm text-gray-400">불러오는 중...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600 mb-3">← 목록으로</button>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">리뷰 #{review.id}</h1>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50">수정</button>
          <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white">삭제</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <InfoRow label="와인">
          <span className="font-medium">{review.wineKorName}</span>
          <span className="text-gray-400 ml-2">{review.wineEngName}</span>
          <span className="text-gray-300 ml-2">(ID {review.wineId})</span>
        </InfoRow>
        <InfoRow label="작성자">
          <Link to={`/admin-panel/users/${review.userId}`} className="text-blue-500 hover:underline">{review.userNickname}</Link>
          <span className="text-gray-400 ml-2">{review.userEmail}</span>
        </InfoRow>
        <InfoRow label="평점"><span className="font-medium text-[#c84b31]">★ {review.rating.toFixed(1)}</span></InfoRow>
        <InfoRow label="맛 (0~4)">
          <div className="flex gap-4">
            {TASTE.map(({ key, label }) => (
              <span key={key}>{label} <b>{review[key]}</b></span>
            ))}
          </div>
        </InfoRow>
        <InfoRow label="느낌">
          {review.feels.length === 0 ? <span className="text-gray-300">없음</span> : (
            <div className="flex flex-wrap gap-1">
              {review.feels.map((f) => <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{f}</span>)}
            </div>
          )}
        </InfoRow>
        <InfoRow label="공개">{review.isPublic ? '공개' : '비공개'}</InfoRow>
        <InfoRow label="좋아요">
          {review.likeCount}
          {review.likedBy.length > 0 && (
            <span className="text-gray-400 ml-2">({review.likedBy.map((u) => u.nickname).join(', ')})</span>
          )}
        </InfoRow>
        <InfoRow label="작성 일시">{fmtDateTime(review.createdAt)}</InfoRow>
        <InfoRow label="수정 일시">{fmtDateTime(review.updatedAt)}</InfoRow>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="text-sm font-semibold mb-2">리뷰 내용</h2>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{review.text}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold mb-3">이미지 <span className="text-gray-400 font-normal">{review.images.length}개</span></h2>
        {review.images.length === 0 ? (
          <p className="text-sm text-gray-300">첨부된 이미지가 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {review.images.map((img) => (
              <div key={img.id}>
                <a href={img.url} target="_blank" rel="noreferrer">
                  <img src={img.url} alt="" className="max-h-96 rounded-lg border border-gray-100" />
                </a>
                <div className="flex items-center gap-2 mt-2">
                  <a href={img.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-xs text-blue-500 hover:underline break-all">{img.url}</a>
                  <CopyButton text={img.url} />
                </div>
                <p className="text-xs text-gray-400 mt-1">업로드 {fmtDateTime(img.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ReviewModal
          review={{
            id: review.id, wineId: review.wineId, wineKorName: review.wineKorName,
            userId: review.userId, userNickname: review.userNickname, rating: review.rating,
            text: review.text, isPublic: review.isPublic, likeCount: review.likeCount, createdAt: review.createdAt,
          }}
          onClose={() => setEditing(false)}
          onSaved={load}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <p className="text-sm mb-4">이 리뷰를 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm border rounded-lg">취소</button>
              <button onClick={onDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
