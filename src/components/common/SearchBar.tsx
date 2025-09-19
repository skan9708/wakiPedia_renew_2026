import { Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

type Props = {
  placeholder?: string;
  onSearch?: (q: string) => void;
  className?: string;
};

function SearchBar({ placeholder = '와인/품종/지역 검색', onSearch, className }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) return onSearch(q);
    const next = new URLSearchParams(params);
    if (q) next.set('q', q); else next.delete('q');
    navigate(`/search?${next.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`flex items-center gap-3 p-3.5 rounded-2xl bg-bgsubtle ${className ?? ''}`}
    >
      <Search className="w-5 h-5 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent outline-none text-base flex-1 placeholder:text-[15px]"
        aria-label="검색어"
      />
      <button type="submit" className="px-3.5 py-1.5 rounded-full text-xs bg-accent text-white">검색</button>
    </form>
  );
}

export { SearchBar };
export default SearchBar;


