import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import defaultWineImg from '@/assets/default-wine.jpg';

type MyReview = { id: number; images: { id: number; url: string }[]; wineName: string };

export function MyReviewsFeedMobile() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  useEffect(() => {
    api.get('/me/reviews/').then(({ data }) => setReviews(data)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-mobile px-4 py-4">
      <h2 className="text-lg font-semibold mb-2">내 리뷰</h2>
      {reviews.length === 0 && (
        <p className="text-sm text-muted text-center py-8">작성한 리뷰가 없습니다.</p>
      )}
      <div className="grid grid-cols-3 gap-1">
        {reviews.map((r) => (
          <button key={r.id} className="aspect-square overflow-hidden" onClick={() => navigate(`/reviews/${r.id}`)}>
            <img src={r.images?.[0]?.url ?? defaultWineImg} alt={r.wineName} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default MyReviewsFeedMobile;
