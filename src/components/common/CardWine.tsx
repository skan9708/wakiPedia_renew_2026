import { RatingStars } from './RatingStars';
import defaultWineImg from '@/assets/default-wine.jpg';

export type Wine = {
  id: string;
  nameKr: string;
  nameEng: string;
  imageUrl?: string;
  wineType: 'Red' | 'White' | 'Rose' | 'Sparkling';
  regions?: string;
  breed?: string;
  tags?: string[];
  ratingAverage?: number;
};

const typeStyle: Record<string, string> = {
  Red: 'bg-rose-100 text-rose-700',
  White: 'bg-amber-100 text-amber-700',
  Sparkling: 'bg-yellow-100 text-yellow-700',
  Rose: 'bg-pink-100 text-pink-600',
};

type Props = { wine: Wine; onClick?: () => void };

export function CardWine({ wine, onClick }: Props) {
  return (
    <button onClick={onClick} className="card w-full text-left overflow-hidden mx-auto max-w-mobile">
      <div className="w-full aspect-video bg-bgsubtle">
        <img src={wine.imageUrl ?? defaultWineImg} alt={wine.nameKr} className="w-full h-full object-cover" />
      </div>

      <div className="p-4 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-base font-semibold text-fg truncate">{wine.nameEng}</div>
            <div className="text-sm text-muted truncate">{wine.nameKr}</div>
          </div>
          <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${typeStyle[wine.wineType] ?? 'bg-bgsubtle text-muted'}`}>
            {wine.wineType}
          </span>
        </div>

        <div className="text-sm text-muted">
          {wine.regions ?? '-'}
          {wine.breed && <><span className="mx-1.5">·</span><span className="text-accent">{wine.breed}</span></>}
        </div>

        {wine.ratingAverage != null && (
          <div className="flex items-center gap-2 pt-0.5">
            <RatingStars value={Number(wine.ratingAverage)} size="md" />
            <span className="text-accent text-sm font-medium">{Number(wine.ratingAverage).toFixed(1)}점</span>
          </div>
        )}
      </div>
    </button>
  );
}


