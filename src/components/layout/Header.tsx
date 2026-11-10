import { CircleHelp, Menu, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type HeaderProps = { onMenu?: () => void; onGuide?: () => void };

export function Header({ onMenu, onGuide }: HeaderProps) {
  const location = useLocation();
  const title = (() => {
    if (location.pathname.startsWith('/search')) return '검색';
    if (location.pathname.startsWith('/reviews')) return '리뷰';
    if (location.pathname.startsWith('/me')) return '마이';
    if (location.pathname.startsWith('/wines')) return '와인';
    if (location.pathname.startsWith('/guide')) return '사용 가이드';
    return 'Wakipedia';
  })();
  const isBrand = title === 'Wakipedia';
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-border dark:border-slate-800">
      <div className="mx-auto flex h-16 w-full max-w-mobile items-center justify-between gap-2 px-3 text-fg dark:text-white">
        <button aria-label="메뉴" onClick={onMenu} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
        <div className={`min-w-0 flex-1 truncate text-center ${isBrand ? 'font-brand text-2xl text-accent' : 'font-semibold text-base'}`}>
          {title}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onGuide && <button type="button" onClick={onGuide} aria-label="이 화면 사용법 보기" className="flex items-center gap-1 rounded-full bg-[#eef1d2] px-2.5 py-1.5 text-xs font-semibold text-[#4c5700] ring-1 ring-[#d8dea4]">
            <CircleHelp className="h-4 w-4" aria-hidden="true" />사용법
          </button>}
          <Link to="/search" aria-label="검색" className="p-2">
            <Search className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}


