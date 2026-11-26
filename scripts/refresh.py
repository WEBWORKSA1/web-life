#!/usr/bin/env python3
"""Web.Life auto-refresh (runs in GitHub Actions every 6 hours).

Pulls headline metadata (title, link, date, source only) from public RSS/Atom
feeds and the public Have I Been Pwned breach list, then writes:
  data/news.json, data/breaches.json, data/status.json
and bumps <lastmod> for the home and pulse pages in sitemap.xml.

Standard library only. If a source fails, the previous data is kept.
"""
import datetime as dt
import email.utils
import html
import json
import pathlib
import re
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UA = "Web.Life-Pulse/1.0 (+https://web.life/pulse.html)"
NOW = dt.datetime.now(dt.timezone.utc)
MAX_AGE_DAYS = 45
PER_SOURCE = 6

FEEDS = [
    # (stage, source name, url)
    ("grow", "Google Search Central", "https://developers.google.com/search/blog/feed.xml"),
    ("grow", "Google Search Central", "https://feeds.feedburner.com/blogspot/amDG"),
    ("grow", "Search Engine Land", "https://searchengineland.com/feed"),
    ("grow", "Search Engine Journal", "https://www.searchenginejournal.com/feed/"),
    ("grow", "Chrome for Developers", "https://developer.chrome.com/static/blog/feed.xml"),
    ("grow", "web.dev", "https://web.dev/static/blog/feed.xml"),
    ("launch", "Smashing Magazine", "https://www.smashingmagazine.com/feed/"),
    ("launch", "CSS-Tricks", "https://css-tricks.com/feed/"),
    ("launch", "freeCodeCamp", "https://www.freecodecamp.org/news/rss/"),
    ("launch", "MDN Blog", "https://developer.mozilla.org/en-US/blog/rss.xml"),
    ("launch", "WordPress News", "https://wordpress.org/news/feed/"),
    ("protect", "Krebs on Security", "https://krebsonsecurity.com/feed/"),
    ("protect", "Troy Hunt", "https://www.troyhunt.com/rss/"),
    ("earn", "Google AdSense Blog", "https://blog.google/products/adsense/rss/"),
]


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def clean(text):
    text = html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()
    return re.sub(r"\s+", " ", text)[:180]


def parse_date(s):
    if not s:
        return None
    s = s.strip()
    try:
        d = email.utils.parsedate_to_datetime(s)
    except (TypeError, ValueError):
        d = None
    if d is None:
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


def local(tag):
    return tag.rsplit("}", 1)[-1]


def parse_feed(raw):
    root = ET.fromstring(raw)
    items = []
    for el in root.iter():
        name = local(el.tag)
        if name not in ("item", "entry"):
            continue
        title = link = date = None
        for c in el:
            n = local(c.tag)
            if n == "title":
                title = clean(c.text)
            elif n == "link":
                href = c.get("href")
                if href and (c.get("rel") in (None, "alternate")):
                    link = href
                elif c.text and c.text.strip().startswith("http"):
                    link = c.text.strip()
            elif n in ("pubDate", "published", "updated", "date") and not date:
                date = parse_date(c.text)
        if title and link and link.startswith("http"):
            items.append({"title": title, "link": link, "date": date})
    return items


def load(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def refresh_news():
    old = load(DATA / "news.json", {"items": []})
    items, ok, failed, seen_sources = [], [], [], set()
    for stage, source, url in FEEDS:
        if source in seen_sources:  # alternate URL for a source that already worked
            continue
        try:
            entries = parse_feed(fetch(url))
        except Exception as e:  # noqa: BLE001 - any failure: skip this source
            failed.append(f"{source}: {type(e).__name__}")
            continue
        fresh = [x for x in entries if x["date"] and (NOW - x["date"]).days <= MAX_AGE_DAYS]
        fresh.sort(key=lambda x: x["date"], reverse=True)
        for x in fresh[:PER_SOURCE]:
            items.append({"title": x["title"], "link": x["link"], "date": x["date"].isoformat(),
                          "source": source, "stage": stage})
        if fresh:
            ok.append(source)
            seen_sources.add(source)
    if not items:  # keep the last good data rather than blanking the page
        return old, ok, failed, False
    dedup, links = [], set()
    for x in sorted(items, key=lambda x: x["date"], reverse=True):
        if x["link"] in links:
            continue
        links.add(x["link"])
        dedup.append(x)
    return {"updated": NOW.isoformat(), "items": dedup[:80]}, ok, failed, True


def refresh_breaches():
    old = load(DATA / "breaches.json", {"items": []})
    try:
        raw = json.loads(fetch("https://haveibeenpwned.com/api/v3/breaches"))
    except Exception as e:  # noqa: BLE001
        return old, f"HIBP: {type(e).__name__}", False
    rows = [b for b in raw if not b.get("IsSpamList") and not b.get("IsFabricated") and not b.get("IsRetired")]
    rows.sort(key=lambda b: b.get("AddedDate", ""), reverse=True)
    out = [{"name": b.get("Name"), "title": b.get("Title") or b.get("Name"), "domain": b.get("Domain"),
            "count": b.get("PwnCount", 0), "added": b.get("AddedDate"), "breach_date": b.get("BreachDate"),
            "classes": (b.get("DataClasses") or [])[:6], "verified": bool(b.get("IsVerified"))}
           for b in rows[:20]]
    return {"updated": NOW.isoformat(), "source": "Have I Been Pwned (haveibeenpwned.com)", "items": out}, None, True


def bump_sitemap():
    path = ROOT / "sitemap.xml"
    if not path.exists():
        return
    today = NOW.date().isoformat()
    text = path.read_text(encoding="utf-8")
    for loc in ("https://web.life/</loc>", "https://web.life/pulse.html</loc>"):
        text = re.sub(re.escape(loc) + r"<lastmod>[^<]+</lastmod>", loc + f"<lastmod>{today}</lastmod>", text)
    path.write_text(text, encoding="utf-8")


def main():
    DATA.mkdir(exist_ok=True)
    news, ok, failed, news_changed = refresh_news()
    breaches, b_err, b_changed = refresh_breaches()
    if b_err:
        failed.append(b_err)
    if news_changed:
        (DATA / "news.json").write_text(json.dumps(news, ensure_ascii=False, indent=1), encoding="utf-8")
    if b_changed:
        (DATA / "breaches.json").write_text(json.dumps(breaches, ensure_ascii=False, indent=1), encoding="utf-8")
    (DATA / "status.json").write_text(json.dumps({
        "updated": NOW.isoformat(), "news_items": len(news.get("items", [])),
        "breach_items": len(breaches.get("items", [])), "sources_ok": ok, "sources_failed": failed,
    }, indent=1), encoding="utf-8")
    if news_changed or b_changed:
        bump_sitemap()
    print(f"news: {len(news.get('items', []))} items from {len(ok)} sources; failed: {failed}")


if __name__ == "__main__":
    main()
