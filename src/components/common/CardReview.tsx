import { RatingStars } from './RatingStars';
import { HelpfulReviewButton } from './HelpfulReviewButton';

export type Review = {
  id: number | string;
  wineId: number | string;
  wineName?: string;
  creator: { id: number | string; nickname: string; avatarUrl?: string };
  rating: number;
  bodyRating?: number | null; sweetRating?: number | null; taninRating?: number | null; acidityRating?: number | null;
  text: string;
  likeCount: number;
  isLiked?: boolean;
  createdAt: string;
  feels?: string[];
};

type Props = { review: Review };

export function CardReview({ review }: Props) {
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
      <div className="flex items-center gap-1.5">
        <RatingStars value={review.rating} />
        <span className="text-xs text-accent font-medium">{review.rating.toFixed(1)}</span>
      </div>
      <p className="text-sm text-fg leading-relaxed line-clamp-2">{review.text}</p>
      <HelpfulReviewButton reviewId={review.id} creatorId={review.creator.id} count={review.likeCount} isLiked={review.isLiked} compact />
    </div>
  );
}


