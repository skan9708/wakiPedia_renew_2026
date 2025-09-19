type Props = { value: number; max?: number; size?: 'sm' | 'md' };

export function RatingStars({ value, max = 5, size = 'sm' }: Props) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = max - full - (half ? 1 : 0);
  const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`별점 ${value} / ${max}`}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className={`text-accent ${starSize}`}>★</span>
      ))}
      {half && <span className={`text-accent/70 ${starSize}`}>★</span>}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className={`text-border ${starSize}`}>☆</span>
      ))}
    </div>
  );
}


