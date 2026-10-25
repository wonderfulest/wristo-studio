# Public search pages

The homepage and two guides are rendered from `src/content/searchPages.ts`. The Vue page and `scripts/search-pages.ts` use the same escaped content. The Vite build emits complete HTML, canonical/description/social metadata, JSON-LD, `sitemap.xml` and `robots.txt` without a browser, API requests or login.

```sh
npm run test:unit -- src/content/searchPages.test.ts src/content/searchBuild.test.ts src/auth/studioAccess.test.ts
npm run build
```

`VITE_WRISTO_STUDIO_URL` selects the public origin. Loopback development values fall back to `https://studio.wristo.io` to prevent shared local settings appearing in production canonicals. Regional public origins are preserved.

Only the three editorial pages are indexable. Gallery/app/editor routes receive the neutral `app.html` shell with `noindex`; dynamic route navigation updates metadata. Private designs still require authentication. Unknown Vercel paths fall through to the generated `404.html`, while the explicit app-route rewrite preserves editor and account deep links. When adding an app route, update that rewrite if it introduces a new top-level prefix. On other static hosts configure equivalent filesystem-first routing and a genuine 404 for unknown paths.

After deployment verify page HTML with JavaScript disabled, both guide links, the sign-in/design flow, unknown-page status, `robots.txt` and the sitemap. Submit `https://studio.wristo.io/sitemap.xml` through the verified Search Console property and record a baseline of impressions, clicks and existing Studio/design conversion events. No verification token or analytics account was invented by this implementation. Public-copy pricing and compatibility should only change when supported by current product behavior.
