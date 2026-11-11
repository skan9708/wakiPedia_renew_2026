import { useEffect, useRef, useState } from 'react';
import type { PageGuide } from './pageGuides';

type Spotlight = { top: number; left: number; width: number; height: number };
const seenKey = (id: string) => `wakipedia-guide-seen-v1:${id}`;
const autoOffKey = 'wakipedia-guide-auto-off-v1';

function readSetting(key: string) {
  try { return window.localStorage.getItem(key) === '1'; } catch { return false; }
}

function saveSetting(key: string) {
  try { window.localStorage.setItem(key, '1'); } catch { /* Private browsing can block storage. */ }
}

export function PageGuideTour({ guide, openRequest }: { guide: PageGuide; openRequest: number }) {
  const [step, setStep] = useState<number | null>(null);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const lastOpenRequest = useRef(openRequest);
  const autoTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (guide.autoOpen === false || readSetting(autoOffKey) || readSetting(seenKey(guide.id))) return;
    autoTimer.current = window.setTimeout(() => {
      previousFocus.current = document.activeElement as HTMLElement;
      saveSetting(seenKey(guide.id));
      setStep(0);
    }, 800);
    return () => window.clearTimeout(autoTimer.current);
  }, [guide.id]);

  useEffect(() => {
    if (lastOpenRequest.current === openRequest) return;
    lastOpenRequest.current = openRequest;
    window.clearTimeout(autoTimer.current);
    previousFocus.current = document.activeElement as HTMLElement;
    saveSetting(seenKey(guide.id));
    setStep(0);
  }, [openRequest, guide.id]);

  useEffect(() => {
    if (step === null) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStep(null);
      if (event.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step]);

  useEffect(() => {
    if (step === null) {
      setSpotlight(null);
      previousFocus.current?.focus();
      return;
    }
    const selector = guide.steps[step]?.target;
    const target = selector ? document.querySelector<HTMLElement>(selector) : null;
    if (target) {
      const top = target.getBoundingClientRect().top;
      if (top < 85 || top > window.innerHeight - 300) {
        window.scrollTo({ top: Math.max(0, window.scrollY + top - 95), behavior: 'smooth' });
      }
    }
    const updateSpotlight = () => {
      const targets = selector ? Array.from(document.querySelectorAll<HTMLElement>(selector)) : [];
      const highlightedTargets = guide.steps[step].highlightAll ? targets : targets.slice(0, 1);
      const rects = highlightedTargets.map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
      if (rects.length === 0) { setSpotlight(null); return; }
      const top = Math.min(...rects.map((rect) => rect.top));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      const left = Math.min(...rects.map((rect) => rect.left));
      const right = Math.max(...rects.map((rect) => rect.right));
      if (bottom < 65 || top > window.innerHeight - 180) {
        setSpotlight(null);
        return;
      }
      const visibleTop = Math.max(64, top - 5);
      setSpotlight({ top: visibleTop, left: Math.max(4, left - 5), width: right - left + 10, height: bottom - visibleTop + 5 });
    };
    const timer = window.setTimeout(updateSpotlight, 300);
    updateSpotlight();
    const observer = new MutationObserver(updateSpotlight);
    observer.observe(document.querySelector('main') ?? document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', updateSpotlight, true);
    window.addEventListener('resize', updateSpotlight);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('scroll', updateSpotlight, true);
      window.removeEventListener('resize', updateSpotlight);
    };
  }, [guide, step]);

  if (step === null) return null;

  const current = guide.steps[step];
  return (
    <>
      <button type="button" className={`fixed inset-0 z-[60] h-full w-full ${spotlight ? '' : 'bg-black/55'}`} aria-label="사용법 닫기" onClick={() => setStep(null)} />
      {spotlight && <div aria-hidden="true" className={`pointer-events-none fixed z-[70] ring-4 ring-accent ${current.shape === 'circle' ? 'rounded-full' : 'rounded-xl'}`} style={{ ...spotlight, boxShadow: '0 0 0 9999px rgba(0, 0, 0, .55)' }} />}
      <div ref={dialogRef} className="fixed inset-x-0 bottom-0 z-[80] mx-auto w-full max-w-mobile rounded-t-3xl bg-white px-5 pb-8 pt-5 text-fg shadow-xl" role="dialog" aria-modal="true" aria-labelledby="page-guide-title" aria-describedby="page-guide-description">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-accent">{guide.name} 사용법 {step + 1} / {guide.steps.length}</span>
          <button ref={closeRef} type="button" className="rounded-full px-2 py-1 text-sm text-muted" onClick={() => setStep(null)}>닫기</button>
        </div>
        <h2 id="page-guide-title" className="text-lg font-semibold">{current.title}</h2>
        <p id="page-guide-description" className="mt-2 text-sm leading-6 text-muted">{current.description}</p>
        <div className="mt-5 flex gap-2">
          {step > 0 && <button type="button" className="rounded-xl border border-border px-4 py-2.5 text-sm" onClick={() => setStep(step - 1)}>이전</button>}
          <button type="button" className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white" onClick={() => setStep(step === guide.steps.length - 1 ? null : step + 1)}>
            {step === guide.steps.length - 1 ? '완료' : '다음'}
          </button>
        </div>
        <button type="button" className="mt-4 w-full text-center text-xs text-muted underline underline-offset-2" onClick={() => { saveSetting(autoOffKey); setStep(null); }}>
          다른 화면에서도 자동 안내 보지 않기
        </button>
      </div>
    </>
  );
}
