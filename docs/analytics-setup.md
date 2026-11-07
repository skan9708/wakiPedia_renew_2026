# Google Analytics 4 setup

## Create the Wakipedia property

1. Sign in to [Google Analytics](https://analytics.google.com/) with the owner's Google account.
2. Create an Analytics account named `Wakipedia` if one does not exist.
3. Create a GA4 property named `Wakipedia`, with reporting time zone `South Korea` and currency `KRW`.
4. Add a **Web** data stream for `https://wakipedia.co.kr`, named `Wakipedia Web`.
5. In **Enhanced measurement → Page views → Advanced settings**, turn off **Page changes based on browser history events**. The React app sends one manual `page_view` for each route. Leaving this setting on double counts navigation.
6. In **Enhanced measurement**, turn off **Site search** and **Form interactions**. The app sends a filtered wine-name `search` event and success-only signup/review events; automatic site search would read raw `q` values from URLs.
7. In **Admin → Data retention**, set user and event data retention to **2 months** to match the privacy policy.
8. Confirm that the web stream's measurement ID is `G-FPSQN03XHQ`.

## Connect the site

The public measurement ID is tracked in `.env.production`, so a production Vite build includes it automatically. The site owner confirmed the web stream settings above on 2026-11-07, and `VITE_GA_STREAM_READY` is now `true`. Supply the existing `VITE_KAKAO_REST_API_KEY` in the build environment, then build and deploy `dist/`. Never commit the Kakao key or server credentials.

The Analytics script is inserted into `<head>` only after a visitor agrees to the optional analytics prompt. A visitor can change their choice on `/privacy`. Admin pages and the Kakao login callback are excluded from page views. Page URLs sent as manual `page_view` events include only the path and safe `utm_*` campaign parameters; search terms and login codes are omitted from URLs sent to GA.

Events sent after consent:

| Event | When | GA4 report |
| --- | --- | --- |
| `page_view` | Each distinct route or search/filter URL | Pages and screens; acquisition uses the initial UTM/source |
| `search` with `search_term` | Wine search returns a wine whose name matches the search term, or a matching suggestion is selected | Search terms |
| `view_item` with wine `item_id` and `item_name` | Wine detail API successfully loads | Ecommerce item views, or an Exploration by item name |
| `sign_up` with `method` (`email`/`kakao`) | A new account is created successfully | Events and signup funnel |
| `review_created` with `wine_id` and `review_visibility` | Review POST succeeds | Events; register `wine_id` as an event-scoped custom dimension for a wine breakdown |

Only wine-matched search terms are sent, and email addresses, phone-like values, URLs, review text, and account identifiers are excluded. The Kakao callback response distinguishes newly created accounts from existing logins. No historical events are sent when consent is granted later.

The updated privacy policy is announced on **2026-11-07** and states an effective date of **2026-11-14**. The frontend prevents measurement before **2026-11-14 00:00 KST** or until the web stream settings are confirmed, even if the measurement ID is configured earlier.

## Check collection

1. Open the live website in a fresh browser profile and agree to analytics.
2. Visit the home page, search page, and a wine page.
3. In Google Analytics **Reports → Realtime**, verify the visit and page views. In **Admin → DebugView**, inspect `page_view` events if needed. Check that each route change produces one event. Also verify `search`, `view_item`, `sign_up`, and `review_created` on test interactions; avoid creating production test accounts/reviews solely for this check.
4. For Instagram campaigns, use a link such as `https://wakipedia.co.kr/?utm_source=instagram&utm_medium=paid_social&utm_campaign=co_create`. Review source and campaign in **Reports → Acquisition → Traffic acquisition**.
5. Mark `sign_up` and `review_created` as key events if conversion rates are desired. In **Explore → Funnel exploration**, compare `session_start` or `first_visit`, `/auth/signup` page views, `sign_up`, and `review_created`. Kakao signup may skip `/auth/signup`, so also compare all visits directly with `sign_up`.

Counts represent visitors who consented to analytics. Data collected before activation is unavailable in GA4.
