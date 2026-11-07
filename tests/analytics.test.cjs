const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/analytics.ts'), 'utf8');

function loadAnalytics(now, streamReady = true) {
  const storage = new Map();
  const scripts = [];
  const location = {
    origin: 'https://wakipedia.co.kr',
    hostname: 'wakipedia.co.kr',
    pathname: '/',
    search: '',
    reload() {},
  };
  const window = { location };
  const document = {
    title: 'Wakipedia',
    referrer: 'https://instagram.com/profile?private=value',
    head: { appendChild: (script) => scripts.push(script) },
    createElement: () => ({}),
    cookie: '',
  };
  class TestDate extends Date {
    static now() { return now; }
  }
  const js = ts.transpileModule(
    source
      .replace('import.meta.env.VITE_GA_MEASUREMENT_ID', "'G-TEST1234'")
      .replace('import.meta.env.VITE_GA_STREAM_READY', streamReady ? "'true'" : "'false'"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
  ).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, {
    module,
    exports: module.exports,
    window,
    document,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    Date: TestDate,
    URL,
    URLSearchParams,
  });
  return { analytics: module.exports, location, window, scripts };
}

test('analytics stays inactive before the announced date', () => {
  const { analytics, scripts } = loadAnalytics(Date.parse('2026-11-13T00:00:00+09:00'));
  analytics.saveAnalyticsConsent('granted');
  analytics.trackPageView('/');
  assert.equal(analytics.gaMeasurementId, null);
  assert.equal(scripts.length, 0);
});

test('analytics stays inactive until the GA4 stream settings are confirmed', () => {
  const { analytics, scripts } = loadAnalytics(Date.parse('2026-11-14T00:00:00+09:00'), false);
  analytics.saveAnalyticsConsent('granted');
  analytics.trackPageView('/');
  assert.equal(analytics.gaMeasurementId, null);
  assert.equal(scripts.length, 0);
});

test('consent gates analytics and routes create one sanitized page view', () => {
  const { analytics, location, window, scripts } = loadAnalytics(Date.parse('2026-11-14T00:00:00+09:00'));
  analytics.trackPageView('/');
  assert.equal(scripts.length, 0);

  analytics.saveAnalyticsConsent('granted');
  analytics.trackPageView('/');
  analytics.trackPageView('/');
  assert.equal(scripts.length, 1);

  location.pathname = '/search';
  location.search = '?q=private-value&utm_source=instagram';
  analytics.trackPageView('/search', location.search);
  analytics.trackPageView('/search', location.search);
  location.search = '?q=other-private-value&utm_source=instagram';
  analytics.trackPageView('/search', location.search);
  analytics.trackPageView('/admin-panel');
  analytics.trackPageView('/auth/kakao/callback');

  const pageViews = window.dataLayer.filter((entry) => entry[0] === 'event' && entry[1] === 'page_view');
  assert.equal(pageViews.length, 3);
  assert.equal(pageViews[1][2].page_location, 'https://wakipedia.co.kr/search?utm_source=instagram');
  assert.equal(pageViews[0][2].page_referrer, 'https://instagram.com');

  analytics.saveAnalyticsConsent('denied');
  analytics.trackPageView('/reviews');
  assert.equal(window.dataLayer.filter((entry) => entry[1] === 'page_view').length, 3);
});

test('wine searches, detail views, signup and review completion are consent-gated', () => {
  const { analytics, location, window, scripts } = loadAnalytics(Date.parse('2026-11-14T00:00:00+09:00'));
  const wines = [{ nameKr: '빌라 마리아', nameEng: 'Villa Maria' }];
  assert.equal(analytics.trackWineSearch('빌라마리아', wines), false);
  assert.equal(scripts.length, 0);

  analytics.saveAnalyticsConsent('granted');
  assert.equal(analytics.trackWineSearch('person@example.com', wines), false);
  assert.equal(analytics.trackWineSearch('010-1234-5678', wines), false);
  assert.equal(analytics.trackWineSearch('unknown wine', wines), false);
  assert.equal(analytics.trackWineSearch('빌라마리아', wines), true);

  location.pathname = '/wines/6725';
  analytics.trackPageView(location.pathname);
  analytics.trackWineDetail({ id: 6725, nameKr: '빌라 마리아', nameEng: 'Villa Maria', wineType: 'White' });
  analytics.trackWineDetail({ id: 6725, nameKr: '빌라 마리아', nameEng: 'Villa Maria', wineType: 'White' });
  analytics.trackSignUp('kakao');
  analytics.trackReviewCreated('6725', 'public');

  const events = window.dataLayer.filter((entry) => entry[0] === 'event').map((entry) => entry[1]);
  assert.deepEqual(Array.from(events), ['search', 'page_view', 'view_item', 'sign_up', 'review_created']);
  const item = window.dataLayer.find((entry) => entry[1] === 'view_item')[2].items[0];
  assert.equal(item.item_id, '6725');
  assert.equal(item.item_name, '빌라 마리아');
  assert.equal(scripts.length, 1);
});
