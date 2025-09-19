import { useParams } from 'react-router-dom';

export function MyPageReviewEditMobile() {
  const { id } = useParams();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mt-4">리뷰 수정</h2>
      <div className="card p-4 text-sm text-muted">리뷰 ID: {id}</div>
      <div className="card p-4">폼 (react-hook-form 재사용 예정)</div>
    </div>
  );
}



