# Web.Life

**Every website has a life.** Web.Life is a static, self-updating hub of free tools, guides and expert help for the five stages of a website: **Launch, Grow, Earn, Protect, Legacy**.

- 47 pages: 5 stage hubs, 14 browser-only tools, 11 guides, video library, glossary (70 terms), Web Pulse feed, services (lead generation), support (pledges), contests, careers, advertise, legal pages.
- Hosting: GitHub Pages from `main` (root). Works at `https://webworksa1.github.io/web-life/` and at `https://web.life/` once DNS points to GitHub Pages.
- Monetisation: Google AdSense on every content page (`ads.txt` included), sponsorships, pledges, paid services.

## Structure

```
src/pages/           Page sources (HTML fragments with a JSON meta header) — edit these
scripts/build.py     Wraps fragments in the shared template, writes root HTML + sitemap.xml
scripts/refresh.py   Pulls headlines + public breach data into data/*.json (run by Actions)
assets/css|js|img    Styles, shared JS (forms, filters, feeds), tools engine, images
data/                Auto-updated JSON for Web Pulse
.github/workflows/   auto-refresh.yml — every 6 hours, commits changes, requests a Pages build
```

## Editing

1. Edit or add a file in `src/pages/` (copy an existing page for the meta header format).
2. Register new tools/guides/videos in the lists at the top of `scripts/build.py` so they appear in tiles, rows and grids.
3. Run `python3 scripts/build.py` and commit the generated HTML.

## Forms

All forms post via FormSubmit (AJAX). The destination address is never shown on the site; it is assembled at runtime in `assets/js/site.js`. After deployment, submit any form once and click **Activate** in the FormSubmit activation email so submissions start arriving. Subjects are prefixed `[Web.Life]` with the form name.

## Go-live checklist

1. Settings → Pages: Source = Deploy from branch, `main`, `/ (root)`.
2. DNS for `web.life`: A records to GitHub Pages IPs (185.199.108.153, .109.153, .110.153, .111.153) and/or `www` CNAME to `webworksa1.github.io`; then add `web.life` as the custom domain in Pages settings and enforce HTTPS.
3. AdSense: add the site `web.life`, keep `ads.txt` at the root, and enable a Google-certified consent message (Privacy & messaging) for EEA/UK/CH visitors.
4. Search Console: verify `web.life`, submit `https://web.life/sitemap.xml`.

## Trademark & copyright

Web.Life is an independent publication, not affiliated with any company, product or trademark named "WebLife", "Web Life" or similar. Third-party names are used for identification only. © Web.Life. All rights reserved. Content and code are not licensed for reuse without permission.
