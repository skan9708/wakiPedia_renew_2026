import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home as HomeIcon, Search, MessageSquare, User, LifeBuoy } from 'lucide-react';

type SideDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function SideDrawer({ open, onClose }: SideDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const items = [
    { to: '/', label: '홈', icon: HomeIcon },
    { to: '/search', label: '검색', icon: Search },
    { to: '/reviews', label: '리뷰', icon: MessageSquare },
    { to: '/me', label: '마이페이지', icon: User },
    { to: '/support', label: '고객센터', icon: LifeBuoy },
  ];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label="사이드 메뉴"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={panelRef}
        className="absolute left-0 top-0 h-full w-72 max-w-[80%] bg-white dark:bg-neutral-900 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-base font-semibold">메뉴</span>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="메뉴 닫기"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <nav className="p-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-3 text-sm ${
                  isActive ? 'text-accent bg-neutral-50' : 'text-fg hover:bg-neutral-100'
                }`
              }
              aria-label={label}
              onClick={onClose}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}


