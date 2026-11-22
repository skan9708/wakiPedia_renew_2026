import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Smartphone, X } from 'lucide-react';
import { canPromptInstall, isAppInstalled, promptInstall } from '@/lib/installApp';

type Phone = 'ios' | 'android';

function initialPhone(): Phone {
  if (typeof navigator === 'undefined') return 'android';
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'android';
}

export function AddToHomeScreen({ variant }: { variant: 'menu' | 'guide' }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState<Phone>(initialPhone);
  const [available, setAvailable] = useState(canPromptInstall);
  const [installed, setInstalled] = useState(isAppInstalled);
  const [copied, setCopied] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateAvailable = () => setAvailable(canPromptInstall());
    const updateInstalled = () => setInstalled(true);
    window.addEventListener('waki-install-available', updateAvailable);
    window.addEventListener('waki-app-installed', updateInstalled);
    return () => {
      window.removeEventListener('waki-install-available', updateAvailable);
      window.removeEventListener('waki-app-installed', updateInstalled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const onAdd = async () => {
    if (available && !installed) {
      try {
        const outcome = await promptInstall();
        setAvailable(false);
        if (outcome === 'accepted') {
          setInstalled(true);
          return;
        }
      } catch {
        setAvailable(false);
      }
    }
    setOpen(true);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {variant === 'menu' ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center gap-3 rounded-lg bg-[#eef1d2] px-3 py-3 text-left text-sm font-semibold text-[#566400] hover:bg-[#e4eab9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b8b11] dark:bg-[#30391d] dark:text-[#d8e027] dark:hover:bg-[#3d4925]"
        >
          <Smartphone className="h-5 w-5" aria-hidden="true" />
          <span>홈 화면에 추가</span>
        </button>
      ) : (
        <section aria-labelledby="home-screen-title" className="rounded-2xl border border-[#d9df9c] bg-[#f6f7e9] p-5">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-6 w-6 shrink-0 text-[#7b8b11]" aria-hidden="true" />
            <div>
              <h2 id="home-screen-title" className="text-base font-semibold">홈 화면에서 바로 열기</h2>
              <p className="mt-1 text-sm leading-6 text-muted">와키피디아를 휴대폰 홈 화면에 추가하면, 와인을 찾거나 기록할 때 아이콘을 눌러 바로 들어올 수 있어요.</p>
            </div>
          </div>
          <button type="button" onClick={onAdd} className="mt-4 w-full rounded-xl bg-[#a7b621] px-4 py-3 text-sm font-semibold text-[#17200c]">
            {installed ? '추가 방법 다시 보기' : available ? '홈 화면에 추가하기' : '기기별 추가 방법 보기'}
          </button>
        </section>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-home-title" className="w-full max-w-md rounded-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#18201c] shadow-xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#7b8b11]">와키피디아 바로가기</p>
                <h2 id="add-home-title" className="mt-1 text-xl font-bold">홈 화면에 추가하는 방법</h2>
              </div>
              <button ref={closeButton} type="button" aria-label="안내 닫기" onClick={() => setOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">한 번 추가하면 앱 아이콘처럼 와키피디아를 열 수 있어요.</p>
            <div className="mt-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1" aria-label="휴대폰 종류">
              <button type="button" aria-pressed={phone === 'ios'} onClick={() => setPhone('ios')} className={`rounded-lg py-2 text-sm ${phone === 'ios' ? 'bg-white font-semibold shadow-sm' : 'text-gray-500'}`}>아이폰</button>
              <button type="button" aria-pressed={phone === 'android'} onClick={() => setPhone('android')} className={`rounded-lg py-2 text-sm ${phone === 'android' ? 'bg-white font-semibold shadow-sm' : 'text-gray-500'}`}>안드로이드</button>
            </div>
            {phone === 'ios' ? (
              <ol className="mt-5 space-y-3 text-sm leading-6">
                <li><strong className="mr-2 text-[#7b8b11]">1</strong>사파리에서 와키피디아를 열어요.</li>
                <li><strong className="mr-2 text-[#7b8b11]">2</strong>브라우저의 <b>공유</b> 버튼을 누르고 <b>홈 화면에 추가</b>를 골라요.</li>
                <li><strong className="mr-2 text-[#7b8b11]">3</strong><b>웹앱으로 열기</b>가 보이면 켜고 <b>추가</b>를 눌러요.</li>
              </ol>
            ) : (
              <ol className="mt-5 space-y-3 text-sm leading-6">
                <li><strong className="mr-2 text-[#7b8b11]">1</strong>크롬·엣지 등에서 와키피디아를 열어요.</li>
                <li><strong className="mr-2 text-[#7b8b11]">2</strong>브라우저 <b>메뉴(⋮)</b>에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 골라요.</li>
                <li><strong className="mr-2 text-[#7b8b11]">3</strong><b>설치</b> 또는 <b>추가</b>를 누르면 완료돼요.</li>
              </ol>
            )}
            <div className="mt-5 rounded-xl bg-[#f6f7e9] p-3 text-xs leading-5 text-gray-600">
              네이버·구글 앱 등 앱 안 브라우저에서 추가 메뉴가 보이지 않으면 주소를 복사해 휴대폰 브라우저에서 열어 주세요.
              <button type="button" onClick={copyAddress} className="mt-2 flex items-center gap-1 font-semibold text-[#647400] underline underline-offset-2">
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                {copied ? '주소 복사 완료' : '와키피디아 주소 복사'}
              </button>
              <span className="mt-1 block select-all">wakipedia.co.kr</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
