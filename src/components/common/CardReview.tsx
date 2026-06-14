import { RatingStars } from './RatingStars';
import { Heart } from 'lucide-react';

export type Review = {
  id: string;
  wineId: string;
  wineName?: string;
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
    <div className="card p-4 space-y-2">
      {review.wineName && (
        <div className="text-sm font-semibold text-fg truncate">{review.wineName}</div>
      )}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-accent/20 overflow-hidden shrink-0 flex items-center justify-center text-accent text-xs font-bold">
          {review.creator.avatarUrl
            ? <img src={review.creator.avatarUrl} alt={review.creator.nickname} className="w-full h-full object-cover" />
            : review.creator.nickname?.[0]}
        </div>
        <div className="text-sm font-medium text-fg">{review.creator.nickname}</div>
        <div className="ml-auto text-xs text-muted">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <RatingStars value={review.rating} />
          <span className="text-xs text-accent font-medium">{review.rating.toFixed(1)}</span>
        </div>
        <button aria-label="좋아요" onClick={onLike} className="flex items-center gap-1 text-xs text-muted">
          <Heart className="w-3.5 h-3.5" /> {review.likeCount}
        </button>
      </div>
      <p className="text-sm text-fg leading-relaxed line-clamp-2">{review.text}</p>
    </div>
  );
}


