import { Home as HomeIcon, Search, MessageSquare, User, Bot } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: '홈', icon: HomeIcon },
  { to: '/search', label: '검색', icon: Search },
  { to: '/reviews', label: '리뷰', icon: MessageSquare },
  { to: '/me', label: '마이페이지', icon: User },
  { to: '/chat', label: '챗봇', icon: Bot },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white">
      <div className="mx-auto w-full max-w-mobile px-4 grid grid-cols-5 place-items-center py-1.5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[12px] leading-tight ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
            aria-label={label}
          >
            <Icon className="w-7 h-7" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}


