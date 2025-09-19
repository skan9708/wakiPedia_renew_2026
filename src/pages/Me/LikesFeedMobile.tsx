import { useNavigate } from 'react-router-dom';

export function LikesFeedMobile() {
  const navigate = useNavigate();
  const DUMMY_IMG = 'https://plus.unsplash.com/premium_photo-1674852175694-008fc8f96d23?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
  const list = Array.from({ length: 30 }).map((_, i) => ({ id: `w${i}`, src: `${DUMMY_IMG}#${i}` }));
  return (
    <div className="mx-auto w-full max-w-mobile px-4 py-4">
      <h2 className="text-lg font-semibold mb-2">좋아요한 와인</h2>
      <div className="grid grid-cols-3 gap-1">
        {list.map((w) => (
          <button key={w.id} className="aspect-square overflow-hidden" onClick={() => navigate(`/wines/${w.id}`)}>
            <img src={w.src} alt={w.id} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default LikesFeedMobile;


