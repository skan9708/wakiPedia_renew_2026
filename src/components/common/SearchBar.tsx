import { Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Suggestion = {
  id: number;
  nameKr: string;
  nameEng: string;
  wineType: string;
  regions: string | null;
};

type Props = {
  placeholder?: string;
  onSearch?: (q: string) => void;
  className?: string;
  enableSuggestions?: boolean;
};

function SearchBar({ placeholder = '와인/품종/지역 검색', onSearch, className, enableSuggestions = false }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!enableSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [enableSuggestions]);

  const onInputChange = (value: string) => {
    setQ(value);
    if (!enableSuggestions) return;

    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/wines/?q=${encodeURIComponent(value.trim())}`);
        setSuggestions((data as Suggestion[]).slice(0, 6));
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    if (onSearch) return onSearch(q);
    const next = new URLSearchParams(params);
    if (q) next.set('q', q); else next.delete('q');
    navigate(`/search?${next.toString()}`);
  };

  const onSelectSuggestion = (wine: Suggestion) => {
    setShowDropdown(false);
    setQ(wine.nameKr);
    navigate(`/wines/${wine.id}`);
  };

  const typeColors: Record<string, string> = {
    Red: 'bg-rose-100 text-rose-700',
    White: 'bg-amber-100 text-amber-700',
    Sparkling: 'bg-yellow-100 text-yellow-700',
    Rose: 'bg-pink-100 text-pink-600',
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={onSubmit}
        role="search"
        className={`flex items-center gap-3 p-3.5 rounded-2xl bg-bgsubtle ${className ?? ''}`}
      >
        <Search className="w-5 h-5 text-muted shrink-0" />
        <input
          value={q}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => enableSuggestions && suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="bg-transparent outline-none text-base flex-1 min-w-0 placeholder:text-[15px] text-fg placeholder:text-muted"
          aria-label="검색어"
          autoComplete="off"
        />
        <button type="submit" className="px-3.5 py-1.5 rounded-full text-xs bg-accent text-white shrink-0">검색</button>
      </form>

      {enableSuggestions && showDropdown && suggestions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-lg border border-border overflow-hidden"
          role="listbox"
        >
          {suggestions.map((wine) => (
            <li key={wine.id}>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bgsubtle transition-colors text-left"
                onMouseDown={(e) => { e.preventDefault(); onSelectSuggestion(wine); }}
                role="option"
              >
                <Search className="w-4 h-4 text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-fg truncate">{wine.nameKr}</div>
                  <div className="text-xs text-muted truncate">{wine.nameEng}{wine.regions ? ` · ${wine.regions}` : ''}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${typeColors[wine.wineType] ?? 'bg-bgsubtle text-muted'}`}>
                  {wine.wineType}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { SearchBar };
export default SearchBar;
