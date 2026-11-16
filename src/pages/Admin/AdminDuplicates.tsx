import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type WineSummary = {
  id: number;
  nameKr: string;
  nameEng: string;
  wineType: string;
  country: string;
  grapes: string[];
  imageUrl: string;
  reviewCount: number;
  favoriteCount: number;
  createdAt: string;
};
type Candidate = {
  id: number;
  score: number;
  createdAt: string;
  source: WineSummary;
  target: WineSummary;
};

const T = {
  title: '\uc911\ubcf5 \uc758\uc2ec \uc640\uc778 \uac80\ud1a0',
  intro: '\uc0c8\ub85c \ub4f1\ub85d\ub41c \uc640\uc778\uacfc \uae30\uc874 \uc640\uc778\uc744 \ube44\uad50\ud574 \uc8fc\uc138\uc694. \ube44\uc2b7\ud55c \uc774\ub984\ub9cc\uc73c\ub85c\ub294 \ud1b5\ud569\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.',
  empty: '\uac80\ud1a0\ud560 \uc911\ubcf5 \uc758\uc2ec \uc640\uc778\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
  loading: '\ubd88\ub7ec\uc624\ub294 \uc911...',
  loadError: '\ud6c4\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.',
  actionError: '\ucc98\ub9ac\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
  newWine: '\uc0c8\ub85c \ub4f1\ub85d\ub41c \uc640\uc778',
  existingWine: '\uae30\uc874 \uc640\uc778',
  noPhoto: '\uc0ac\uc9c4 \uc5c6\uc74c',
  type: '\uc885\ub958',
  country: '\uc6d0\uc0b0\uc9c0',
  grapes: '\ud488\uc885',
  reviews: '\ub9ac\ubdf0',
  favorites: '\ucc1c',
  detail: '\uc0c1\uc138 \ubcf4\uae30',
  separate: '\ub2e4\ub978 \uc640\uc778\uc774\uc5d0\uc694',
  merge: '\uac19\uc740 \uc640\uc778\uc73c\ub85c \ud1b5\ud569',
  noInfo: '\ubbf8\uc785\ub825',
  score: '\uc774\ub984 \uc720\uc0ac\ub3c4',
  caution: '\ud1b5\ud569\ud558\uba74 \uc0c8 \uc640\uc778\uc758 \ub9ac\ubdf0\uc640 \ucc1c\uc774 \uae30\uc874 \uc640\uc778\uc73c\ub85c \uc62e\uaca8\uc9c0\uace0, \uc0c8 \uc640\uc778 \uc8fc\uc18c\ub294 \uae30\uc874 \uc640\uc778\uc73c\ub85c \uc5f0\uacb0\ub429\ub2c8\ub2e4. \uc0ac\uc9c4\u00b7\ub77c\ubca8\u00b7\ube48\ud2f0\uc9c0\uae4c\uc9c0 \uc9c1\uc811 \ud655\uc778\ud574 \uc8fc\uc138\uc694.',
  conflict: '\uc885\ub958\ub098 \uc6d0\uc0b0\uc9c0, \ud488\uc885\uc774 \ub2e4\ub985\ub2c8\ub2e4. \uc815\ubcf4\ub97c \uc218\uc815\ud558\uac70\ub098 \ub2e4\ub978 \uc640\uc778\uc73c\ub85c \ucc98\ub9ac\ud574 \uc8fc\uc138\uc694.',
  mergeConfirm: '\ub450 \uc640\uc778\uc758 \uc0ac\uc9c4\uacfc \uc774\ub984, \uc885\ub958, \uc6d0\uc0b0\uc9c0, \ud488\uc885\uc744 \ud655\uc778\ud588\ub098\uc694? \uc0c8 \uc640\uc778\uc758 \ub9ac\ubdf0\uc640 \ucc1c\uc744 \uae30\uc874 \uc640\uc778\uc73c\ub85c \uc62e\uae41\ub2c8\ub2e4.',
  separateConfirm: '\ub450 \uc640\uc778\uc744 \ubcc4\uac1c\ub85c \ucc98\ub9ac\ud560\uae4c\uc694?',
  more: '\ub2e4\uc74c \ud6c4\ubcf4 \ubd88\ub7ec\uc624\uae30',
};

function WineCard({ wine, title }: { wine: WineSummary; title: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-xs font-semibold text-[#788915]">{title} / #{wine.id}</p>
      <div className="flex gap-4">
        {wine.imageUrl ? (
          <img src={wine.imageUrl} alt={wine.nameKr} className="h-28 w-24 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-28 w-24 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">{T.noPhoto}</div>
        )}
        <div className="min-w-0">
          <p className="font-semibold">{wine.nameKr}</p>
          <p className="break-words text-sm text-gray-500">{wine.nameEng}</p>
          <p className="mt-2 text-sm text-gray-600">{T.type}: {wine.wineType || T.noInfo}</p>
          <p className="text-sm text-gray-600">{T.country}: {wine.country || T.noInfo}</p>
          <p className="text-sm text-gray-600">{T.grapes}: {wine.grapes.join(', ') || T.noInfo}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span>{T.reviews} {wine.reviewCount}</span>
        <span>{T.favorites} {wine.favoriteCount}</span>
        <span>{wine.createdAt.slice(0, 10)}</span>
        <a href={`/wines/${wine.id}`} target="_blank" rel="noreferrer" className="ml-auto text-[#788915] underline">{T.detail}</a>
      </div>
    </div>
  );
}

export function AdminDuplicates() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = async (nextPage = 1) => {
    try {
      const { data } = await api.get<{ results: Candidate[]; total: number }>(`/admin/duplicates/?page=${nextPage}`);
      setItems(current => nextPage === 1 ? data.results : [...current, ...data.results]);
      setTotal(data.total);
      setPage(nextPage);
      setError('');
      window.dispatchEvent(new Event('duplicates-updated'));
    } catch {
      setError(T.loadError);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const decide = async (item: Candidate, approved: boolean) => {
    const message = approved
      ? `${T.mergeConfirm}\n\n#${item.source.id} ${item.source.nameKr} \u2192 #${item.target.id} ${item.target.nameKr}`
      : `${T.separateConfirm}\n\n#${item.source.id} ${item.source.nameKr} / #${item.target.id} ${item.target.nameKr}`;
    if (!window.confirm(message)) return;
    setBusy(item.id);
    try {
      await api.patch(`/admin/duplicates/${item.id}/`, {
        approved, ...(approved ? { confirmTargetId: item.target.id } : {}),
      });
      await load();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || T.actionError);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">{T.title}</h1>
      <p className="mt-2 text-sm text-gray-500">{T.intro}</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-8 text-gray-500">{T.loading}</p> : items.length === 0 ? (
        <div className="mt-8 rounded-xl bg-white p-8 text-center text-gray-500">{T.empty}</div>
      ) : (
        <div className="mt-6 space-y-5">
          {items.map((item) => {
            const conflicting = Boolean(
              (item.source.wineType && item.target.wineType && item.source.wineType !== item.target.wineType)
              || (item.source.country && item.target.country && item.source.country !== item.target.country)
              || (item.source.grapes.length && item.target.grapes.length && !item.source.grapes.some(g => item.target.grapes.includes(g)))
            );
            return (
              <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="mb-4 text-sm text-gray-500">{T.score} {Math.min(100, Math.round(item.score * 100))}% / {item.createdAt.slice(0, 10)}</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <WineCard wine={item.source} title={T.newWine} />
                  <WineCard wine={item.target} title={T.existingWine} />
                </div>
                <p className="mt-4 text-sm text-gray-600">{T.caution}</p>
                {conflicting && <p className="mt-2 text-sm font-medium text-red-700">{T.conflict}</p>}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={busy !== null} onClick={() => void decide(item, false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50">{T.separate}</button>
                  <button type="button" disabled={busy !== null || conflicting} onClick={() => void decide(item, true)}
                    className="rounded-lg bg-[#a6b718] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{T.merge}</button>
                </div>
              </article>
            );
          })}
          {total > items.length && <button type="button" onClick={() => void load(page + 1)} className="text-sm text-[#788915] underline">{T.more}</button>}
        </div>
      )}
    </div>
  );
}
