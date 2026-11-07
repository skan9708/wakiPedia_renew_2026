const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/analytics.ts'), 'utf8');

function loadAnalytics(now) {
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
    source.replace('import.meta.env.VITE_GA_MEASUREMENT_ID', "'G-TEST1234'"),
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
  analytics.trackPageView('/search');
  analytics.trackPageView('/admin-panel');
  analytics.trackPageView('/auth/kakao/callback');

  const pageViews = window.dataLayer.filter((entry) => entry[0] === 'event' && entry[1] === 'page_view');
  assert.equal(pageViews.length, 2);
  assert.equal(pageViews[1][2].page_location, 'https://wakipedia.co.kr/search?utm_source=instagram');
  assert.equal(pageViews[0][2].page_referrer, 'https://instagram.com');

  analytics.saveAnalyticsConsent('denied');
  analytics.trackPageView('/reviews');
  assert.equal(window.dataLayer.filter((entry) => entry[1] === 'page_view').length, 2);
});
