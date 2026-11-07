import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  disableAnalyticsAndReload,
  gaMeasurementId,
  readAnalyticsConsent,
  saveAnalyticsConsent,
  trackPageView,
  type AnalyticsConsent,
} from '@/lib/analytics';

export function AnalyticsTracker() {
  const location = useLocation();
  const [consent, setConsent] = useState<AnalyticsConsent>(readAnalyticsConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (consent === 'granted') trackPageView(location.pathname, location.search);
  }, [consent, location.pathname, location.search]);

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener('open-analytics-settings', openSettings);
    return () => window.removeEventListener('open-analytics-settings', openSettings);
  }, []);

  if (!gaMeasurementId || location.pathname.startsWith('/admin-panel')) return null;
  if (consent !== null && !settingsOpen) return null;

  const choose = (value: Exclude<AnalyticsConsent, null>) => {
    saveAnalyticsConsent(value);
    setConsent(value);
    setSettingsOpen(false);
    if (value === 'denied') disableAnalyticsAndReload();
  };

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-mobile rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl"
      role="dialog"
      aria-labelledby="analytics-consent-title"
    >
      <h2 id="analytics-consent-title" className="font-semibold text-sm">방문 통계 사용 안내</h2>
      <p className="mt-2 text-xs leading-relaxed text-neutral-600">
        방문·페이지 조회 통계를 위해 Google Analytics를 사용해도 될까요?
        동의하면 분석 쿠키와 이용 정보가 Google에 전송됩니다. 거부해도 서비스 이용에 영향이 없습니다.
      </p>
      <Link to="/privacy" className="mt-2 inline-block text-xs underline text-neutral-600">
        개인정보처리방침 보기
      </Link>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => choose('denied')} className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm">
          거부
        </button>
        <button type="button" onClick={() => choose('granted')} className="flex-1 rounded-lg bg-[#A7B621] py-2 text-sm font-semibold text-white">
          동의
        </button>
      </div>
    </aside>
  );
}
