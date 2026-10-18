import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { CopyButton, InfoRow, fmtDateTime } from './AdminReviewDetail';
import { TYPE_LABELS, WineModal } from './AdminWines';

type WineDetail = {
  id: number;
  korName: string;
  engName: string;
  type: string;
  country: string;
  countryEng: string;
  imageUrl: string;
  uploadedImageUrl: string | null;
  displayImageUrl: string | null;
  grapeVarieties: string[];
  bubbleAvgRating: number | null;
  reviewAvgRating: number | null;
  tasteAvg: { body: number | null; sweetness: number | null; acidity: number | null; tannin: number | null };
  reviewCount: number;
  publicReviewCount: number;
  favoriteCount: number;
  registeredBy: { id: number; nickname: string } | null;
  createdAt: string;
  updatedAt: string;
  reviews: {
    id: number;
    userId: number;
    userNickname: string;
    rating: number;
    text: string;
    isPublic: boolean;
    likeCount: number;
    createdAt: string;
  }[];
};

function UrlLine({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2">
      <a href={url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-xs text-blue-500 hover:underline break-all">{url}</a>
      <CopyButton text={url} />
    </div>
  );
}

const TASTE = [
  { key: 'body', label: '바디' },
  { key: 'sweetness', label: '당도' },
  { key: 'acidity', label: '산도' },
  { key: 'tannin', label: '탄닌' },
] as const;

export function AdminWineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wine, setWine] = useState<WineDetail | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/wines/${id}/`);
      setWine(data);
    } catch (e: any) {
      setErr(e.response?.status === 404 ? '와인을 찾을 수 없습니다.' : '불러오지 못했습니다.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async () => {
    await api.delete(`/admin/wines/${id}/`);
    navigate('/admin-panel/wines');
  };

  if (err) return <div className="p-6 text-sm text-red-500">{err}</div>;
  if (!wine) return <div className="p-6 text-sm text-gray-400">불러오는 중...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600 mb-3">← 목록으로</button>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">
          {wine.korName} <span className="text-sm text-gray-400 font-normal">와인 #{wine.id}</span>
        </h1>
        <div className="flex gap-2 whitespace-nowrap">
          <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50">수정</button>
          <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white">삭제</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <div className="flex gap-5">
          <div className="shrink-0 w-40">
            {wine.displayImageUrl ? (
              <a href={wine.displayImageUrl} target="_blank" rel="noreferrer">
                <img src={wine.displayImageUrl} alt="" className="w-40 h-52 object-contain rounded-lg border border-gray-100 bg-gray-50" />
              </a>
            ) : (
              <div className="w-40 h-52 rounded-lg bg-gray-100 flex items-center justify-center text-3xl text-gray-300">🍷</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <InfoRow label="한글명">{wine.korName}</InfoRow>
            <InfoRow label="영문명">{wine.engName}</InfoRow>
            <InfoRow label="타입">{TYPE_LABELS[wine.type] ?? wine.type}</InfoRow>
            <InfoRow label="국가">{wine.country || '-'}{wine.countryEng && wine.countryEng !== wine.country && <span className="text-gray-400 ml-2">{wine.countryEng}</span>}</InfoRow>
            <InfoRow label="품종">{wine.grapeVarieties.length ? wine.grapeVarieties.join(', ') : <span className="text-gray-300">없음</span>}</InfoRow>
            <InfoRow label="등록자">
              {wine.registeredBy
                ? <Link to={`/admin-panel/users/${wine.registeredBy.id}`} className="text-blue-500 hover:underline">{wine.registeredBy.nickname}</Link>
                : <span className="text-gray-300">기록 없음 (일괄 등록 데이터)</span>}
            </InfoRow>
            <InfoRow label="등록 일시">{fmtDateTime(wine.createdAt)}</InfoRow>
            <InfoRow label="수정 일시">{fmtDateTime(wine.updatedAt)}</InfoRow>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="text-sm font-semibold mb-2">이미지 주소</h2>
        <InfoRow label="화면에 표시">
          {wine.displayImageUrl ? <UrlLine url={wine.displayImageUrl} /> : <span className="text-gray-300">없음 (기본 이미지 표시)</span>}
        </InfoRow>
        <InfoRow label="이미지 URL">
          {wine.imageUrl ? <UrlLine url={wine.imageUrl} /> : <span className="text-gray-300">없음</span>}
        </InfoRow>
        <InfoRow label="업로드 이미지">
          {wine.uploadedImageUrl ? <UrlLine url={wine.uploadedImageUrl} /> : <span className="text-gray-300">없음</span>}
        </InfoRow>
        <p className="text-xs text-gray-400 mt-2">업로드 이미지가 있으면 화면에는 업로드 이미지가 우선 표시됩니다.</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: '기준 평균 평점', value: wine.bubbleAvgRating != null ? wine.bubbleAvgRating.toFixed(1) : '-' },
          { label: '리뷰 평균 평점', value: wine.reviewAvgRating != null ? wine.reviewAvgRating.toFixed(1) : '-' },
          { label: '리뷰 (공개 / 전체)', value: `${wine.publicReviewCount} / ${wine.reviewCount}` },
          { label: '즐겨찾기', value: wine.favoriteCount },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-xs text-gray-400 whitespace-nowrap">{s.label}</div>
            <div className="text-xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="text-sm font-semibold mb-2">공개 리뷰 맛 평균 <span className="text-gray-400 font-normal">(0~4)</span></h2>
        <div className="flex gap-6 text-sm">
          {TASTE.map(({ key, label }) => (
            <span key={key}>{label} <b>{wine.tasteAvg[key] ?? '-'}</b></span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h2 className="text-sm font-semibold px-5 pt-4 pb-2">
          리뷰 {wine.reviewCount > wine.reviews.length && <span className="text-gray-400 font-normal">(최근 {wine.reviews.length}개)</span>}
        </h2>
        {wine.reviews.length === 0 ? <p className="text-sm text-gray-300 px-5 pb-4">없음</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="whitespace-nowrap text-left px-4 py-2 w-14">ID</th>
                <th className="whitespace-nowrap text-left px-4 py-2 w-28">작성자</th>
                <th className="whitespace-nowrap text-left px-4 py-2 w-16">평점</th>
                <th className="whitespace-nowrap text-left px-4 py-2">내용</th>
                <th className="whitespace-nowrap text-left px-4 py-2 w-14">공개</th>
                <th className="whitespace-nowrap text-left px-4 py-2 w-40">작성 일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wine.reviews.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/admin-panel/reviews/${r.id}`)} className="hover:bg-gray-50/50 cursor-pointer">
                  <td className="px-4 py-2 text-gray-400">{r.id}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.userNickname}</td>
                  <td className="px-4 py-2 text-[#c84b31] whitespace-nowrap">★ {r.rating.toFixed(1)}</td>
                  <td className="px-4 py-2 text-gray-500 max-w-[260px]"><div className="truncate text-xs">{r.text}</div></td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap">{r.isPublic ? '공개' : '비공개'}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <WineModal
          wine={{
            id: wine.id, korName: wine.korName, engName: wine.engName, type: wine.type,
            country: wine.country, imageUrl: wine.imageUrl, bubbleAvgRating: wine.bubbleAvgRating, createdAt: wine.createdAt,
          }}
          onClose={() => setEditing(false)}
          onSaved={load}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <p className="text-sm mb-4">정말 이 와인을 삭제하시겠습니까? 연관된 리뷰도 모두 삭제됩니다.</p>
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
