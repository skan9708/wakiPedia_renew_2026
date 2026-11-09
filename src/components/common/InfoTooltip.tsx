import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function InfoTooltip({ label, text, small = false }: { label: string; text: ReactNode; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className={`flex items-center justify-center rounded-full border border-accent font-semibold text-[#4c5700] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${small ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm'}`}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open && (
        <div id={tooltipId} role="tooltip" className="absolute right-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-[65vh] overflow-y-auto rounded-xl border border-border bg-white p-3 text-sm font-normal leading-5 text-fg shadow-card">
          {text}
        </div>
      )}
    </span>
  );
}
