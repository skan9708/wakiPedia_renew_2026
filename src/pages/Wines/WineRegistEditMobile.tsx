import { useParams } from 'react-router-dom';

export function WineRegistEditMobile() {
  const { id } = useParams();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mt-4">와인 수정</h2>
      <div className="card p-4 text-sm text-muted">와인 ID: {id}</div>
      <div className="card p-4">폼 (추후)</div>
    </div>
  );
}


