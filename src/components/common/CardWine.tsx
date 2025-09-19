import { RatingStars } from './RatingStars';

export type Wine = {
  id: string;
  nameKr: string; // 한글 이름
  nameEng: string; // 영문 이름
  imageUrl?: string; // 대표 이미지 URL
  wineType: 'Red'|'White'|'Rose'|'Sparkling';
  regions?: string; // 원산지
  breed?: string; // 품종
  tags?: string[]; // 키워드 태그
  ratingAverage?: number; // 평균 별점
};

type Props = { wine: Wine; onClick?: () => void };

export function CardWine({ wine, onClick }: Props) {
  return (
    <button onClick={onClick} className="card w-full text-left overflow-hidden">
      {/* 큰 이미지 */}
      <div className="w-full aspect-[16/11] bg-bgsubtle">
        {wine.imageUrl ? (
          <img src={wine.imageUrl} alt={wine.nameKr} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted">이미지</div>
        )}
      </div>

      {/* 본문 */}
      <div className="p-4 space-y-2">
        {/* 영문 이름 */}
        <div className="text-lg font-semibold text-fg truncate">{wine.nameEng}</div>
        {/* 한글 이름 */}
        <div className="text-sm text-muted truncate">{wine.nameKr}</div>

        {/* 키워드 태그 */}
        {wine.tags && wine.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {wine.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-bgsubtle text-xs text-muted">{t}</span>
            ))}
          </div>
        )}

        {/* 원산지 / 품종 */}
        <div className="text-sm text-muted">
          <span>{wine.regions ?? '-'}</span>
          <span className="mx-2">·</span>
          <span className="text-accent">{wine.breed ?? '-'}</span>
        </div>

        {/* 별점 */}
        {wine.ratingAverage != null && (
          <div className="flex items-center gap-2 pt-1">
            <RatingStars value={Number(wine.ratingAverage)} size="md" />
            <span className="text-accent text-base font-medium">{Number(wine.ratingAverage).toFixed(0)} 점</span>
          </div>
        )}
      </div>
    </button>
  );
}


