import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type Props = {
  reviewId: number | string;
  creatorId: number | string;
  count: number;
  isLiked?: boolean;
  compact?: boolean;
};

export function HelpfulReviewButton({ reviewId, creatorId, count, isLiked = false, compact = false }: Props) {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [helpfulCount, setHelpfulCount] = useState(count);
  const [helpful, setHelpful] = useState(isLiked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const isOwnReview = Boolean(token && user && Number(user.id) === Number(creatorId));

  useEffect(() => {
    setHelpfulCount(count);
    setHelpful(isLiked);
  }, [reviewId, count, isLiked]);

  const toggleHelpful = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!token) {
      navigate('/auth/login');
      return;
    }
    if (pending) return;
    setError(false);
    setPending(true);
    try {
      const { data } = await api.post<{ isLiked: boolean; likeCount: number }>(`/reviews/${reviewId}/like/`);
      setHelpful(data.isLiked);
      setHelpfulCount(data.likeCount);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  if (isOwnReview) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-muted ${compact ? 'text-xs' : 'text-sm'}`}>
        <ThumbsUp className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        {compact ? `도움 ${helpfulCount}` : `도움 된 횟수 ${helpfulCount}회`}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggleHelpful}
        disabled={pending}
        aria-pressed={helpful}
        aria-label={`도움이 돼요, ${helpfulCount}회`}
        title={compact ? '도움이 돼요' : undefined}
        className={`inline-flex items-center rounded-lg border font-medium transition-colors disabled:opacity-60 ${compact ? 'gap-1 px-2 py-1 text-[11px]' : 'gap-1.5 px-2.5 py-1.5 text-xs'} ${helpful ? 'border-accent bg-accent text-white' : 'border-[#d8df9b] bg-[#f7f9e9] text-[#596800] hover:bg-[#eef2d2]'}`}
      >
        <ThumbsUp className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill={helpful ? 'currentColor' : 'none'} aria-hidden="true" />
        {compact ? '도움' : '도움이 돼요'} <span className="tabular-nums">{helpfulCount}</span>
      </button>
      {error && <span role="alert" className="text-xs text-red-600">잠시 후 다시 눌러주세요.</span>}
    </span>
  );
}
