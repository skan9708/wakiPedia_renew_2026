import { clsx } from 'clsx';

type Props = { children: React.ReactNode; selected?: boolean; onClick?: () => void };

export function Tag({ children, selected, onClick }: Props) {
  return (
    <button
      type="button"
      className={clsx(
        'px-3 py-1 rounded-full text-xs border',
        selected ? 'bg-accent text-white border-accent' : 'bg-white text-fg border-border'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}


