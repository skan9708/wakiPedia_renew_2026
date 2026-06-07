import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RatingStars } from '@/components/common/RatingStars';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import defaultWineImg from '@/assets/default-wine.jpg';

type ReviewDetail = {
  id: number;
  wineId: number;
  wineName: string;
  creator: { id: number; nickname: string; avatarUrl: string | null };
  rating: number;
  bodyRating: number;
  sweetRating: number;
  taninRating: number;
  acidityRating: number;
  text: string;
  likeCount: number;
  isLiked: boolean;
  feels: string[];
  images: { id: number; url: string }[];
  createdAt: string;
};

export function ReviewDetailMobile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/reviews/${id}/`)
      .then(({ data }) => {
        setReview(data);
        setLiked(data.isLiked);
        setLikeCount(data.likeCount);
      })
      .catch(() => setReview(null))
      .finally(() => setLoading(false));
  }, [id]);

  const onToggleLike = async () => {
    if (!token) return navigate('/auth/login');
    try {
      const { data } = await api.post(`/reviews/${id}/like/`);
      setLiked(data.isLiked);
      setLikeCount(data.likeCount);
      setBurst(true);
      setTimeout(() => setBurst(false), 500);
    } catch {}
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다.');
    } catch {
      alert('주소창의 링크를 직접 복사해 주세요.');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted text-sm">불러오는 중...</div>;
  if (!review) return <div className="p-8 text-center text-muted text-sm">리뷰를 찾을 수 없습니다.</div>;

  const mainImage = review.images?.[0]?.url;

  return (
    <>
      <div className="space-y-5">
        {/* 이미지 */}
        <div className="w-full aspect-[16/10] bg-bgsubtle overflow-hidden">
          <img src={mainImage ?? defaultWineImg} alt="리뷰 이미지" className="w-full h-full object-cover" />
        </div>

        {/* 헤더 */}
        <div className="px-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-fg cursor-pointer" onClick={() => navigate(`/wines/${review.wineId}`)}>
              {review.wineName}
            </div>
            <div className="text-sm text-muted">{review.creator.nickname}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLike}
              aria-pressed={liked}
              className={`relative px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border transition-colors ${liked ? 'bg-accent text-white border-accent' : 'bg-bgsubtle border-border text-fg'}`}
            >
              {burst && <span className="anim-heart-pop absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent">❤️</span>}
              <Heart className={`w-4 h-4 ${liked ? 'text-white' : 'text-accent'}`} />
              <span>도움이 돼요</span>
            </button>
            <span className="text-sm text-muted">{likeCount}</span>
          </div>
        </div>

        {/* 리뷰 텍스트 + 별점 */}
        <div className="px-4">
          <div className="card p-4 border border-border">
            <div className="flex items-center gap-2">
              <RatingStars value={review.rating} size="md" />
              <span className="text-accent text-sm">{review.rating.toFixed(1)} 점</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{review.text}</p>
          </div>
        </div>

        {/* 느낌 태그 */}
        {review.feels.length > 0 && (
          <div className="px-4">
            <h3 className="text-base font-semibold mb-2">느낌</h3>
            <div className="flex flex-wrap gap-2">
              {review.feels.map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-full bg-bgsubtle text-sm">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* 특징 게이지 */}
        <div className="px-4">
          <h3 className="text-base font-semibold mb-2">특징</h3>
          <div className="space-y-4">
            <DetailGauge title="바디" left="매우 가벼움" right="매우 무거움" value={review.bodyRating} />
            <DetailGauge title="당도" left="매우 드라이" right="매우 스윗" value={review.sweetRating} />
            <DetailGauge title="산도" left="매우 부드러움" right="매우 시다" value={review.acidityRating} />
            <DetailGauge title="탄닌" left="매우 부드러움" right="매우 떫음" value={review.taninRating} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={copyLink}
        className="fixed z-50 bottom-16 left-0 right-0 mx-auto w-full max-w-mobile px-4"
      >
        <span className="block w-full py-3 rounded-2xl text-white bg-accent shadow-card filter brightness-90 active:brightness-100">
          리뷰 공유하기
        </span>
      </button>
    </>
  );
}

type DGProps = { title: string; left: string; right: string; value: number };
function DetailGauge({ title, left, right, value }: DGProps) {
  const safeVal = value ?? 0;
  const fillPct = `${(safeVal / 4) * 100}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 shrink-0 text-sm text-muted">{title}</div>
      <div className="flex-1">
        <div className="relative h-10">
          <div className="absolute -top-4 left-0 text-[12px] text-muted">{left}</div>
          <div className="absolute -top-4 right-0 text-[12px] text-muted">{right}</div>
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-neutral-200 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] bg-accent rounded-full" style={{ width: fillPct }} />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`w-4 h-4 rounded-full border-2 ${i <= safeVal ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
