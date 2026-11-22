import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Search, MessageSquare, User, MessageSquarePlus, BookOpen, Info, LogIn, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { AddToHomeScreen } from '@/components/common/AddToHomeScreen';

type SideDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function SideDrawer({ open, onClose }: SideDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const mainItems = [
    { to: '/', label: '홈', icon: HomeIcon },
    { to: '/search', label: '검색', icon: Search },
    { to: '/reviews', label: '리뷰', icon: MessageSquare },
    { to: '/me', label: '마이페이지', icon: User },
  ];
  const supportItems = [
    { to: '/about', label: '와키피디아 소개', icon: Info },
    { to: '/guide', label: '사용 가이드', icon: BookOpen },
    { to: '/feedback', label: '피드백 남기기', icon: MessageSquarePlus },
  ];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.getElementById('add-home-title')) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const onLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="사이드 메뉴"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={panelRef}
        className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-white dark:bg-neutral-900 shadow-xl outline-none"
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
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          <div aria-label="주요 메뉴">
            <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">와키 이용</p>
            {mainItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded px-3 py-3 text-sm ${
                    isActive ? 'text-accent bg-neutral-50 dark:bg-neutral-800' : 'text-fg hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`
                }
                aria-label={label}
                onClick={onClose}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
          <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800" aria-label="안내 메뉴">
            <p className="px-3 pb-1 text-xs font-semibold text-muted">와키 안내</p>
            {supportItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded px-3 py-3 text-sm ${
                    isActive ? 'text-accent bg-neutral-50 dark:bg-neutral-800' : 'text-fg hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`
                }
                aria-label={label}
                onClick={onClose}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            <AddToHomeScreen variant="menu" />
          </div>
        </nav>
        <div className="border-t border-neutral-200 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] dark:border-neutral-800">
          {token ? (
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded px-3 py-3 text-left text-sm text-fg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span>로그아웃</span>
            </button>
          ) : (
            <NavLink
              to="/auth/login"
              onClick={onClose}
              className="flex items-center gap-3 rounded px-3 py-3 text-sm text-fg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              <span>로그인</span>
            </NavLink>
          )}
        </div>
      </div>
    </div>
  );
}


