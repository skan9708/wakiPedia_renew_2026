import { RatingStars } from './RatingStars';
import { Heart } from 'lucide-react';

export type Review = {
  id: string;
  wineId: string;
  creator: { id: string; nickname: string; avatarUrl?: string };
  rating: number;
  bodyRating?: number; sweetRating?: number; taninRating?: number; acidityRating?: number;
  text: string;
  likeCount: number;
  createdAt: string;
  feels?: string[];
};

type Props = { review: Review; onLike?: () => Promise<void> };

export function CardReview({ review, onLike }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-bgsubtle overflow-hidden">
          {review.creator.avatarUrl ? (
            <img src={review.creator.avatarUrl} alt={review.creator.nickname} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="text-sm font-medium">{review.creator.nickname}</div>
        <div className="ml-auto text-xs text-muted">{new Date(review.createdAt).toLocaleDateString()}</div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <RatingStars value={review.rating} />
        <button aria-label="좋아요" onClick={onLike} className="flex items-center gap-1 text-sm text-muted">
          <Heart className="w-4 h-4" /> {review.likeCount}
        </button>
      </div>
      <p className="mt-2 text-sm line-clamp-2">{review.text}</p>
    </div>
  );
}


