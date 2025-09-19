import { Menu, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type HeaderProps = { onMenu?: () => void };

export function Header({ onMenu }: HeaderProps) {
  const location = useLocation();
  const title = (() => {
    if (location.pathname.startsWith('/search')) return '검색';
    if (location.pathname.startsWith('/reviews')) return '리뷰';
    if (location.pathname.startsWith('/me')) return '마이';
    if (location.pathname.startsWith('/wines')) return '와인';
    return 'Wakipedia';
  })();
  const isBrand = title === 'Wakipedia';
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-border dark:border-slate-800">
      <div className="mx-auto w-full max-w-mobile px-4 flex h-16 items-center justify-between text-fg dark:text-white">
        <button aria-label="메뉴" onClick={onMenu} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
        <div className={isBrand ? 'font-brand text-2xl text-accent' : 'font-semibold text-base'}>
          {title}
        </div>
        <Link to="/search" aria-label="검색" className="p-2">
          <Search className="w-6 h-6" />
        </Link>
      </div>
    </header>
  );
}


