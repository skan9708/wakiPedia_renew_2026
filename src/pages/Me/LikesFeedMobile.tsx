import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import defaultWineImg from '@/assets/default-wine.jpg';

type LikedWine = { id: number; nameKr: string; nameEng: string; imageUrl: string | null };

export function LikesFeedMobile() {
  const navigate = useNavigate();
  const [wines, setWines] = useState<LikedWine[]>([]);
  useEffect(() => {
    api.get('/me/likes/').then(({ data }) => setWines(data)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-mobile px-4 py-4">
      <h2 className="text-lg font-semibold mb-2">좋아요한 와인</h2>
      {wines.length === 0 && (
        <p className="text-sm text-muted text-center py-8">좋아요한 와인이 없습니다.</p>
      )}
      <div className="grid grid-cols-3 gap-1">
        {wines.map((w) => (
          <button key={w.id} className="aspect-square overflow-hidden" onClick={() => navigate(`/wines/${w.id}`)}>
            <img src={w.imageUrl ?? defaultWineImg} alt={w.nameEng} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default LikesFeedMobile;
