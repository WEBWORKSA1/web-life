#!/usr/bin/env python3
"""Web.Life static builder.

Wraps every fragment in src/pages/ with the shared template and writes the
result to the repo root (GitHub Pages serves main/root). Also regenerates
sitemap.xml. Standard library only.

Fragment format: the file starts with an HTML comment holding JSON meta:
<!--{"title": "...", "description": "...", "stage": "grow", "scripts": ["tools"]}-->
"""
import datetime as dt
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "pages"
SITE = "https://web.life/"
PUB = "ca-pub-6620975821265271"
ADSENSE = ('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
           '?client=ca-pub-6620975821265271" crossorigin="anonymous"></script>')
NOTICE = "contact, if you are interested in this website/domain name/Sponsorship/Advertisement/Partnership"
NOTICE_URL = "https://web.works/contact"

STAGES = [
    ("launch", "Launch", "launch.html"),
    ("grow", "Grow", "grow.html"),
    ("earn", "Earn", "earn.html"),
    ("protect", "Protect", "protect.html"),
    ("legacy", "Legacy", "legacy.html"),
]
LINKS = [("Tools", "tools.html"), ("Guides", "guides.html"), ("Videos", "videos.html"), ("Pulse", "pulse.html")]

LOGO = ('<svg viewBox="0 0 34 22" aria-hidden="true"><path d="M2 15 L9 15 L12 6 L17 18 L21 9 L24 15 L32 15" '
        'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
        '<circle cx="2.5" cy="15" r="2.3" fill="#2F6BFF"/><circle cx="12" cy="6" r="2.3" fill="#1E9E6A"/>'
        '<circle cx="17" cy="18" r="2.3" fill="#D99A0B"/><circle cx="21" cy="9" r="2.3" fill="#7B4DD8"/>'
        '<circle cx="31.5" cy="15" r="2.3" fill="#B8325E"/></svg>')

SUN = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'
       '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>')
MENU = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'
        '<path d="M4 7h16M4 12h16M4 17h16"/></svg>')


# ---- Content registry (drives tiles, rows and video grids) ----
TOOLS = [
    ("website-cost-calculator", "launch", "Website launch cost calculator", "Price your first year: domain, hosting, platform, design and apps."),
    ("domain-name-generator", "launch", "Domain name generator", "Blend keywords into brandable names and score them before you buy."),
    ("website-health-check", "launch", "Website health check", "A 30-point readiness score for launch day and every quarter after."),
    ("color-palette-generator", "launch", "Colour palette generator", "Press space for a palette, lock what you like, check contrast."),
    ("seo-meta-checker", "grow", "SEO meta checker", "Preview your search snippet and audit a page's on-page basics."),
    ("page-weight-budget", "grow", "Page-weight budget", "See how many seconds your images, scripts and fonts cost visitors."),
    ("schema-generator", "grow", "Schema generator", "Build JSON-LD for organisations, local businesses, articles and FAQs."),
    ("robots-sitemap-builder", "grow", "Robots.txt & sitemap builder", "Generate crawl rules and an XML sitemap from a list of URLs."),
    ("website-revenue-estimator", "earn", "Website revenue estimator", "Model ad, affiliate and lead revenue from your real traffic."),
    ("utm-builder", "earn", "UTM link builder", "Tag campaign links so you know which channel actually pays."),
    ("password-generator", "protect", "Password generator", "Random passwords and passphrases with a real strength estimate."),
    ("uptime-calculator", "protect", "Uptime calculator", "Turn an uptime percentage into minutes of downtime, and back."),
    ("website-valuation", "legacy", "Website valuation estimator", "Estimate what a buyer might pay using profit, age and risk."),
    ("digital-legacy-planner", "legacy", "Digital legacy planner", "Inventory your domains, sites and accounts with handover notes."),
]
GUIDES = [
    ("30-day-website-launch-plan", "launch", "The 30-day website launch plan", "A day-by-day schedule from idea to indexed site.", "4 min"),
    ("choose-a-domain-name", "launch", "How to choose a domain name that lasts", "Length, extension, trademarks and the checks to run before you pay.", "4 min"),
    ("builder-vs-cms-vs-static", "launch", "Website builder, CMS or static site?", "A decision framework based on budget, skills and growth plans.", "4 min"),
    ("seo-fundamentals", "grow", "SEO fundamentals for new websites", "How crawling, indexing and ranking actually work, and what to do first.", "4 min"),
    ("core-web-vitals", "grow", "Core Web Vitals in plain English", "LCP, INP and CLS explained with fixes in priority order.", "4 min"),
    ("website-monetization-models", "earn", "Nine ways websites make money", "Ads, affiliates, leads, products and more, with the maths for each.", "4 min"),
    ("ad-network-readiness", "earn", "Getting ad-network ready", "A policy-safe checklist for content, pages, traffic and layout.", "4 min"),
    ("website-security-baseline", "protect", "The website security baseline", "Ten controls every owner should have in place this week.", "4 min"),
    ("backups-uptime-incident-response", "protect", "Backups, uptime and incident response", "What to back up, how often, and what to do when the site goes down.", "4 min"),
    ("how-websites-are-valued-and-sold", "legacy", "How websites are valued and sold", "Profit multiples, buyer due diligence and how to prepare for a sale.", "4 min"),
    ("digital-legacy-planning", "legacy", "Digital legacy planning", "What happens to your sites, domains and accounts, and how to plan for it.", "4 min"),
]
VIDEOS = [
    ("pQN-pnXPaVg", "launch", "HTML full course: build a website", "freeCodeCamp.org", "A beginner course on the building blocks every page is made of."),
    ("1Rs2ND1ryYc", "launch", "CSS tutorial: zero to hero", "freeCodeCamp.org", "Colour, layout, flexbox, grid and animation from the ground up."),
    ("a_iQb1lnAEQ", "launch", "Learn HTML and CSS by building projects", "Scrimba course", "Six small projects with coding challenges along the way."),
    ("mpQZVYPuDGU", "launch", "How a DNS server works", "Animated explainer", "An animated explanation of how a domain name finds your server."),
    ("ONr5Z7VhNFI", "grow", "Intro to Google Search Console", "Google Search Central", "The official introduction to the tool every site owner should use."),
    ("mdB-J6BRReo", "grow", "The most effective Core Web Vitals opportunities", "Chrome for Developers", "Nine performance fixes ranked by the Chrome team."),
    ("fWoI9DXmpdk", "grow", "A deep dive into optimizing LCP", "Chrome for Developers", "How to break Largest Contentful Paint into parts you can fix."),
    ("F0NYT7DIlDQ", "grow", "Understanding performance with Core Web Vitals", "Chrome for Developers", "Where the metrics came from and how to measure them."),
    ("oKR2BX2kHvw", "earn", "How to use Google AdSense", "Full tutorial", "Sign-up, site connection and how ad revenue is calculated."),
    ("0mvCeNsTa1g", "protect", "What is two-factor authentication?", "Security explainer", "Why a second factor stops most account takeovers."),
]
STAGE_NAMES = {k: n for k, n, _ in STAGES}


def tool_tiles(stage=None, prefix=""):
    out = []
    for slug, st, name, desc in TOOLS:
        if stage and st not in stage.split("+"):
            continue
        out.append(f'<a class="tile" data-stage="{st}" data-tags="{st}" href="{prefix}tools/{slug}.html">'
                   f'<h3>{name}</h3><p>{desc}</p><span class="meta">{STAGE_NAMES[st]} tool</span></a>')
    return '<div class="tile-grid">' + "".join(out) + "</div>"


def guide_rows(stage=None, prefix="", limit=None):
    out = []
    for slug, st, title, desc, mins in GUIDES:
        if stage and st not in stage.split("+"):
            continue
        out.append(f'<a class="row" data-stage="{st}" data-tags="{st}" href="{prefix}guides/{slug}.html">'
                   f'<div><h3>{title}</h3><p>{desc}</p></div><span class="go">{mins} read</span></a>')
    if limit:
        out = out[:limit]
    return '<div class="rows">' + "".join(out) + "</div>"


def video_card(vid, st, title, channel, desc):
    return (f'<figure class="video" data-stage="{st}" data-tags="{st}"><div class="video-frame">'
            f'<button class="yt-facade" type="button" data-yt="{vid}" aria-label="Play video: {html.escape(title)}"></button></div>'
            f'<figcaption><h3>{html.escape(title)}</h3><p>{html.escape(channel)}. {html.escape(desc)} '
            f'<a href="https://www.youtube.com/watch?v={vid}" target="_blank" rel="noopener">Watch on YouTube</a></p></figcaption></figure>')


def video_grid(stage=None, limit=None):
    vids = [v for v in VIDEOS if not stage or v[1] in stage.split("+")]
    if limit:
        vids = vids[:limit]
    return '<div class="video-grid">' + "".join(video_card(*v) for v in vids) + "</div>"


def expand(body, prefix):
    def repl(m):
        name, arg = m.group(1), m.group(2)
        if name == "tool_tiles":
            return tool_tiles(arg, prefix)
        if name == "guide_rows":
            if arg and "|" in arg:
                st, lim = arg.split("|")
                return guide_rows(st or None, prefix, int(lim))
            return guide_rows(arg, prefix)
        if name == "video_grid":
            if arg and "|" in arg:
                st, lim = arg.split("|")
                return video_grid(st or None, int(lim))
            return video_grid(arg)
        if name == "video":
            v = next(x for x in VIDEOS if x[0] == arg)
            return video_card(*v)
        if name == "root":
            return prefix
        return m.group(0)
    return re.sub(r"\{\{(\w+)(?::([^}]*))?\}\}", repl, body)


def parse(path):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(\{.*?\})-->\s*", raw, re.S)
    if not m:
        raise SystemExit(f"Missing meta header in {path}")
    meta = json.loads(m.group(1))
    return meta, raw[m.end():]


def head(meta, rel, prefix):
    title = meta["title"]
    full_title = title if "Web.Life" in title else f"{title} | Web.Life"
    desc = meta["description"]
    canon = SITE + ("" if rel == "index.html" else rel)
    og_type = "article" if meta.get("type") == "article" else "website"
    ld = [
        {"@context": "https://schema.org", "@type": "WebSite", "name": "Web.Life", "url": SITE,
         "description": "The life-cycle hub for websites: launch, grow, earn, protect and pass them on."},
        {"@context": "https://schema.org", "@type": "Organization", "name": "Web.Life", "url": SITE,
         "logo": SITE + "assets/img/icon-512.png"},
    ]
    if rel != "index.html":
        crumbs = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE}]
        if meta.get("parent"):
            p_name, p_url = meta["parent"]
            crumbs.append({"@type": "ListItem", "position": 2, "name": p_name, "item": SITE + p_url})
        crumbs.append({"@type": "ListItem", "position": len(crumbs) + 1, "name": title, "item": canon})
        ld.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs})
    for extra in meta.get("schema", []):
        ld.append(extra)
    ld_html = "\n".join(
        f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    ads = "" if meta.get("noads") else ADSENSE
    robots = '<meta name="robots" content="noindex">' if meta.get("noindex") else ""
    base = ('<script>document.write(\'<base href="\'+(location.hostname.indexOf("github.io")>-1?"/web-life/":"/")+\'">\')</script>\n'
            if meta.get("base_fix") else "")
    return f"""<!doctype html>
<html lang="en" data-root="{prefix}">
<head>
<meta charset="utf-8">
{base}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{canon}">
{robots}
<meta name="google-adsense-account" content="{PUB}">
<meta name="theme-color" content="#14261F">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Web.Life">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}assets/img/og-card.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{prefix}assets/img/icon-192.png">
<link rel="manifest" href="{prefix}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap">
<link rel="stylesheet" href="{prefix}assets/css/site.css">
<script>(function(){{try{{var t=localStorage.getItem("wl-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}}catch(e){{}}}})();</script>
{ads}
{ld_html}
</head>"""


def header(meta, rel, prefix):
    current = meta.get("nav", "")
    items = []
    for key, name, url in STAGES:
        cur = ' aria-current="page"' if current == key else ""
        items.append(f'<a data-stage="{key}" href="{prefix}{url}"{cur}>{name}</a>')
    items.append('<span class="sep" aria-hidden="true"></span>')
    for name, url in LINKS:
        cur = ' aria-current="page"' if current == name.lower() else ""
        items.append(f'<a href="{prefix}{url}"{cur}>{name}</a>')
    items.append(f'<a class="btn btn-solid btn-sm" href="{prefix}services.html">Get expert help</a>')
    nav = "\n      ".join(items)
    return f"""
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="notice"><a href="{NOTICE_URL}" target="_blank" rel="noopener">{NOTICE}</a></div>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="{prefix}index.html" aria-label="Web.Life home">{LOGO}<span>Web<span class="dot">.</span>Life</span></a>
    <nav class="nav" id="site-nav" aria-label="Main">
      {nav}
    </nav>
    <div class="header-tools">
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch colour theme">{SUN}</button>
      <button class="icon-btn menu-btn" type="button" data-menu-btn aria-controls="site-nav" aria-expanded="false" aria-label="Open menu">{MENU}</button>
    </div>
  </div>
</header>
<main id="main">
"""


def footer(meta, prefix):
    stage_links = "".join(
        f'<li><a class="foot-stage" data-stage="{k}" href="{prefix}{u}">{n}</a></li>' for k, n, u in STAGES)
    scripts = "".join(f'\n<script src="{prefix}assets/js/{s}.js" defer></script>' for s in meta.get("scripts", []))
    return f"""
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-news">
        <a class="brand" href="{prefix}index.html" aria-label="Web.Life home">{LOGO}<span>Web.Life</span></a>
        <p>One practical email a week: a tool, a fix and a number worth knowing for every stage of your website's life.</p>
        <form class="nl" data-form="newsletter" data-subject="Newsletter signup" data-success="You're in. The next issue lands in your inbox this week.">
          <label class="visually-hidden" for="nl-email">Email address</label>
          <input id="nl-email" name="email" type="email" placeholder="you@example.com" required autocomplete="email" data-label="Email">
          <div class="hp" aria-hidden="true"><label>Leave empty<input name="_honey" tabindex="-1" autocomplete="off"></label></div>
          <button class="btn btn-sm" type="submit">Subscribe</button>
          <div data-status aria-live="polite"></div>
        </form>
      </div>
      <div><h2>Stages</h2><ul>{stage_links}</ul></div>
      <div><h2>Resources</h2><ul>
        <li><a href="{prefix}tools.html">Free tools</a></li>
        <li><a href="{prefix}guides.html">Guides</a></li>
        <li><a href="{prefix}videos.html">Videos</a></li>
        <li><a href="{prefix}pulse.html">Web Pulse</a></li>
        <li><a href="{prefix}glossary.html">Glossary</a></li></ul></div>
      <div><h2>Get involved</h2><ul>
        <li><a href="{prefix}services.html">Get expert help</a></li>
        <li><a href="{prefix}support.html">Support Web.Life</a></li>
        <li><a href="{prefix}contests.html">Contests &amp; prizes</a></li>
        <li><a href="{prefix}careers.html">Careers &amp; talent</a></li>
        <li><a href="{prefix}advertise.html">Advertise &amp; sponsor</a></li></ul></div>
      <div><h2>Company</h2><ul>
        <li><a href="{prefix}about.html">About</a></li>
        <li><a href="{prefix}contact.html">Contact</a></li>
        <li><a href="{prefix}privacy.html">Privacy policy</a></li>
        <li><a href="{prefix}terms.html">Terms of use</a></li>
        <li><a href="{prefix}disclaimer.html">Disclaimer &amp; trademarks</a></li></ul></div>
    </div>
    <div class="foot-bottom">
      <p>Web.Life is an independent publication. It is not affiliated with, endorsed by or connected to any company, product or trademark called "WebLife", "Web Life" or similar. Third-party names belong to their owners and are used only to identify them. <a href="{prefix}disclaimer.html">Read the full disclosure</a>.</p>
      <p>&copy; <span data-year>2026</span> Web.Life. All rights reserved. Free tools run in your browser; nothing you type into them is sent to us.</p>
    </div>
  </div>
</footer>
<script src="{prefix}assets/js/site.js" defer></script>{scripts}
</body>
</html>
"""


def build():
    pages = sorted(SRC.rglob("*.html"))
    today = dt.date.today().isoformat()
    sitemap = []
    for p in pages:
        rel = p.relative_to(SRC).as_posix()
        depth = rel.count("/")
        prefix = "../" * depth
        meta, body = parse(p)
        body = expand(body, prefix)
        out = head(meta, rel, prefix) + header(meta, rel, prefix) + body + footer(meta, prefix)
        dest = ROOT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out, encoding="utf-8")
        if not meta.get("noindex"):
            loc = SITE + ("" if rel == "index.html" else rel)
            pri = meta.get("priority", "0.9" if rel == "index.html" else ("0.6" if depth else "0.8"))
            freq = meta.get("changefreq", "daily" if rel in ("index.html", "pulse.html") else "weekly")
            sitemap.append(f"  <url><loc>{loc}</loc><lastmod>{today}</lastmod>"
                           f"<changefreq>{freq}</changefreq><priority>{pri}</priority></url>")
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(sitemap) + "\n</urlset>\n",
        encoding="utf-8")
    print(f"Built {len(pages)} pages, {len(sitemap)} in sitemap.")


if __name__ == "__main__":
    build()
