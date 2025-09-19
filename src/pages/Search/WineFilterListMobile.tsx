import { Tag } from '@/components/common/Tag';

export function WineFilterListMobile() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-2">
        {['Red','White','Rose','Sparkling'].map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
        {['France','Italy','USA','Spain'].map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
      <div className="text-sm text-muted">필터 적용된 카드 리스트 (추후 구현)</div>
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-border">
        <div className="page-container flex gap-3 py-3">
          <button className="flex-1 py-3 rounded-2xl border border-border">초기화</button>
          <button className="flex-1 py-3 rounded-2xl bg-accent text-white">필터 적용</button>
        </div>
      </div>
    </div>
  );
}


