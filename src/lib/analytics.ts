const configuredId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? '';
const announcedActivationTime = Date.parse('2026-11-14T00:00:00+09:00');
export const gaMeasurementId =
  /^G-[A-Z0-9]+$/.test(configuredId) && Date.now() >= announcedActivationTime
    ? configuredId
    : null;

const CONSENT_KEY = 'wakipedia.analytics-consent.v1';
const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export type AnalyticsConsent = 'granted' | 'denied' | null;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;
let memoryConsent: AnalyticsConsent = null;
let lastTrackedRoute: string | null = null;
let lastTrackedUrl: string | null = null;
let lastViewedWine: string | null = null;

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : memoryConsent;
  } catch {
    return memoryConsent;
  }
}

export function saveAnalyticsConsent(value: Exclude<AnalyticsConsent, null>): void {
  memoryConsent = value;
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Private browsing may block storage; the current page still honors the choice.
  }
}

function safePageUrl(): string {
  const url = new URL(window.location.pathname, window.location.origin);
  const params = new URLSearchParams(window.location.search);
  for (const name of CAMPAIGN_PARAMS) {
    const value = params.get(name);
    if (value && value.length <= 80 && /^[\p{L}\p{N}_. -]+$/u.test(value)
      && !/\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(value)) {
      url.searchParams.set(name, value);
    }
  }
  return url.href;
}

function initialReferrer(): string {
  try {
    return document.referrer ? new URL(document.referrer).origin : '';
  } catch {
    return '';
  }
}

function initializeAnalytics(pageUrl: string): void {
  if (initialized || !gaMeasurementId) return;
  initialized = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', gaMeasurementId, {
    send_page_view: false,
    page_location: pageUrl,
    cookie_expires: 90 * 24 * 60 * 60,
    cookie_update: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
  document.head.appendChild(script);
}

export function trackPageView(pathname: string, search = ''): void {
  if (!gaMeasurementId || readAnalyticsConsent() !== 'granted') return;
  if (pathname.startsWith('/admin-panel') || pathname === '/auth/kakao/callback') {
    lastTrackedRoute = null;
    return;
  }
  const route = pathname + search;
  if (lastTrackedRoute === route) return;

  const pageUrl = safePageUrl();
  initializeAnalytics(pageUrl);
  window.gtag?.('config', gaMeasurementId, {
    update: true,
    page_location: pageUrl,
    send_page_view: false,
  });
  window.gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: pageUrl,
    page_referrer: lastTrackedUrl ?? initialReferrer(),
    send_to: gaMeasurementId,
  });
  lastTrackedRoute = route;
  lastTrackedUrl = pageUrl;
  lastViewedWine = null;
}

function trackEvent(name: string, parameters: Record<string, string | number | object[]> = {}): boolean {
  if (!gaMeasurementId || readAnalyticsConsent() !== 'granted') return false;
  const pageUrl = safePageUrl();
  initializeAnalytics(pageUrl);
  window.gtag?.('event', name, {
    ...parameters,
    page_location: pageUrl,
    send_to: gaMeasurementId,
  });
  return true;
}

export function trackWineSearch(term: string, wines: { nameKr: string; nameEng: string }[]): boolean {
  const normalized = term.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (normalized.length < 2 || normalized.length > 80 || /[@<>:/\\?#]/.test(normalized)) return false;
  if (/\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(normalized)) return false;
  const compact = normalized.toLocaleLowerCase().replace(/\s/g, '');
  if (!wines.some((wine) => [wine.nameKr, wine.nameEng].some((name) =>
    name.normalize('NFKC').toLocaleLowerCase().replace(/\s/g, '').includes(compact)))) return false;
  return trackEvent('search', { search_term: normalized });
}

export function trackWineDetail(wine: { id: number; nameKr: string; nameEng: string; wineType?: string }): void {
  const wineKey = `${window.location.pathname}:${wine.id}`;
  if (lastViewedWine === wineKey) return;
  if (trackEvent('view_item', {
    items: [{
      item_id: String(wine.id),
      item_name: (wine.nameKr || wine.nameEng).slice(0, 100),
      item_category: wine.wineType ?? 'wine',
    }],
  })) lastViewedWine = wineKey;
}

export function trackSignUp(method: 'email' | 'kakao'): void {
  trackEvent('sign_up', { method });
}

export function trackReviewCreated(wineId: string, visibility: 'public' | 'private'): void {
  if (!/^\d+$/.test(wineId)) return;
  trackEvent('review_created', { wine_id: wineId, review_visibility: visibility });
}

export function disableAnalyticsAndReload(): void {
  if (gaMeasurementId && initialized) {
    (window as unknown as Record<string, boolean>)[`ga-disable-${gaMeasurementId}`] = true;
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^_(ga(?:_|$)|gid$|gat(?:_|$))/.test(name)) continue;
      document.cookie = `${name}=; Max-Age=0; Path=/`;
      if (window.location.hostname.endsWith('wakipedia.co.kr')) {
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.wakipedia.co.kr`;
      }
    }
    window.location.reload();
  }
}
