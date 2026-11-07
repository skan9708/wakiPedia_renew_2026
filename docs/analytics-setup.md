# Google Analytics 4 setup

## Create the Wakipedia property

1. Sign in to [Google Analytics](https://analytics.google.com/) with the Wakipedia Google account.
2. Create an Analytics account named `Wakipedia` if one does not exist.
3. Create a GA4 property named `Wakipedia`, with reporting time zone `South Korea` and currency `KRW`.
4. Add a **Web** data stream for `https://wakipedia.co.kr`, named `Wakipedia Web`.
5. In **Enhanced measurement → Page views → Advanced settings**, turn off **Page changes based on browser history events**. The React app sends one manual `page_view` for each route. Leaving this setting on double counts navigation.
6. In **Admin → Data retention**, set user and event data retention to **2 months** to match the privacy policy.
7. Copy the web stream's measurement ID, which begins with `G-`.

## Connect the site

Set `VITE_GA_MEASUREMENT_ID=G-...` in the frontend build environment along with the existing `VITE_KAKAO_REST_API_KEY`, then build and deploy `dist/`. The measurement ID is public configuration, not a secret. Do not put the Kakao key or any server credentials in this document.

The Analytics script loads only after a visitor agrees to the optional analytics prompt. A visitor can change their choice on `/privacy`. Admin pages and the Kakao login callback are excluded. Page URLs sent as manual `page_view` events include only the path and `utm_*` campaign parameters; search terms and login codes are omitted.

The updated privacy policy is announced on **2026-11-07** and states an effective date of **2026-11-14**. The frontend prevents measurement before **2026-11-14 00:00 KST**, even if the measurement ID is configured earlier.

## Check collection

1. Open the live website in a fresh browser profile and agree to analytics.
2. Visit the home page, search page, and a wine page.
3. In Google Analytics **Reports → Realtime**, verify the visit and page views. In **Admin → DebugView**, inspect `page_view` events if needed. Check that each route change produces one event.
4. For Instagram campaigns, use a link such as `https://wakipedia.co.kr/?utm_source=instagram&utm_medium=paid_social&utm_campaign=co_create`. Review source and campaign in **Reports → Acquisition → Traffic acquisition**.

Counts represent visitors who consented to analytics. Data collected before activation is unavailable in GA4.
