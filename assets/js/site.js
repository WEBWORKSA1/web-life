/* Web.Life — shared behaviour (no dependencies) */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var ROOT = root.getAttribute("data-root") || "";
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  window.WL = window.WL || {};
  WL.root = ROOT; WL.store = store; WL.$ = $; WL.$$ = $$;

  /* Toast */
  WL.toast = function (msg) {
    var t = doc.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    doc.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  };
  WL.copy = function (text) {
    var done = function () { WL.toast("Copied"); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
    function fallback() { var ta = doc.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; doc.body.appendChild(ta); ta.select(); try { doc.execCommand("copy"); done(); } catch (e) {} ta.remove(); }
  };

  /* Theme */
  var themeBtn = $("[data-theme-toggle]");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next); store.set("wl-theme", next);
    themeBtn.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
  });

  /* Mobile menu */
  var menuBtn = $("[data-menu-btn]"), nav = $(".nav"), scrim;
  function closeMenu() { if (!nav) return; nav.classList.remove("open"); menuBtn && menuBtn.setAttribute("aria-expanded", "false"); if (scrim) { scrim.remove(); scrim = null; } }
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = !nav.classList.contains("open");
      if (open) { nav.classList.add("open"); menuBtn.setAttribute("aria-expanded", "true"); scrim = doc.createElement("div"); scrim.className = "scrim"; scrim.addEventListener("click", closeMenu); doc.body.appendChild(scrim); var f = $("a", nav); f && f.focus(); }
      else closeMenu();
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  /* Year */
  $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });

  /* Cookie notice */
  if (!store.get("wl-consent")) {
    var c = doc.createElement("div");
    c.className = "cookie"; c.setAttribute("role", "dialog"); c.setAttribute("aria-label", "Cookie notice");
    c.innerHTML = '<p>Web.Life uses cookies for advertising (Google AdSense) and to remember your settings. Read the <a href="' + ROOT + 'privacy.html">privacy policy</a> for choices, including how to opt out of personalised ads.</p><div class="inline-actions"><button class="btn btn-solid btn-sm" data-c="all">Accept</button><button class="btn btn-sm" data-c="essential">Essential only</button></div>';
    doc.body.appendChild(c);
    $$("button", c).forEach(function (b) { b.addEventListener("click", function () {
      store.set("wl-consent", b.getAttribute("data-c"));
      if (b.getAttribute("data-c") === "essential") { (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1; }
      c.remove();
    }); });
  } else if (store.get("wl-consent") === "essential") {
    (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1;
  }

  /* ---------- Forms (FormSubmit, AJAX) ---------- */
  function endpoint() {
    var k = ["bW9jLmxpYW1n", "QDFhc2tyb3diZXc="];
    return "https://formsubmit.co/ajax/" + atob(k.join("")).split("").reverse().join("");
  }
  function fieldLabel(el) {
    if (el.getAttribute("data-label")) return el.getAttribute("data-label");
    var l = el.id && doc.querySelector('label[for="' + el.id + '"]');
    if (l) return l.textContent.replace(/\s*\(optional\)\s*/i, "").trim();
    var fs = el.closest("fieldset"); var lg = fs && $("legend", fs);
    return lg ? lg.textContent.trim() : el.name;
  }
  function showErr(el, msg) {
    el.setAttribute("aria-invalid", "true");
    var box = el.closest(".field, fieldset") || el.parentNode;
    var e = $(".err", box); if (!e) { e = doc.createElement("div"); e.className = "err"; e.id = (el.id || el.name) + "-err"; box.appendChild(e); }
    e.textContent = msg; el.setAttribute("aria-describedby", e.id);
  }
  function clearErr(el) { el.removeAttribute("aria-invalid"); var box = el.closest(".field, fieldset") || el.parentNode; var e = box && $(".err", box); if (e) e.remove(); }
  function validate(scope) {
    var ok = true, first = null;
    $$("input, select, textarea", scope).forEach(function (el) {
      if (el.closest(".hp") || el.type === "hidden" || el.disabled) return;
      clearErr(el);
      if (el.type === "radio") {
        if (!el.required) return;
        var group = $$('input[name="' + el.name + '"]', scope);
        if (group[0] !== el) return;
        if (!group.some(function (r) { return r.checked; })) { ok = false; showErr(el, "Choose one option."); first = first || el; }
        return;
      }
      if (!el.checkValidity()) {
        ok = false; first = first || el;
        var m = "Fill in this field.";
        if (el.validity.typeMismatch && el.type === "email") m = "Enter an email address like name@example.com.";
        else if (el.validity.typeMismatch && el.type === "url") m = "Enter a full web address starting with https://";
        else if (el.type === "checkbox") m = "Tick this box to continue.";
        else if (el.validity.tooShort) m = "Add a little more detail (" + el.minLength + "+ characters).";
        showErr(el, m);
      }
    });
    if (first) first.focus();
    return ok;
  }
  function collect(form) {
    var data = {}, seen = {};
    $$("input, select, textarea", form).forEach(function (el) {
      if (!el.name || el.name.charAt(0) === "_" || el.closest(".hp") || el.disabled) return;
      var label = fieldLabel(el);
      if (el.type === "radio") { if (el.checked) data[label] = el.value; return; }
      if (el.type === "checkbox") {
        if (el.getAttribute("data-multi")) { if (!seen[label]) { seen[label] = []; } if (el.checked) seen[label].push(el.value); data[label] = seen[label].join(", ") || "None"; }
        else data[label] = el.checked ? "Yes" : "No";
        return;
      }
      if (el.value.trim() !== "") data[label] = el.value.trim();
    });
    return data;
  }
  WL.collect = collect;
  $$("form[data-form]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("input", function (e) { if (e.target.getAttribute("aria-invalid")) clearErr(e.target); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var hp = $(".hp input", form); if (hp && hp.value) return;
      var status = $("[data-status]", form) || (function () { var s = doc.createElement("div"); s.setAttribute("data-status", ""); s.setAttribute("aria-live", "polite"); form.appendChild(s); return s; })();
      var btn = $('button[type="submit"]', form); var label = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      var payload = collect(form);
      var emailEl = $('input[type="email"]', form);
      payload._subject = "[Web.Life] " + (form.getAttribute("data-subject") || form.getAttribute("data-form"));
      payload._template = "table";
      payload._captcha = "false";
      if (emailEl && emailEl.value) payload._replyto = emailEl.value.trim();
      payload["Form"] = form.getAttribute("data-form");
      payload["Page"] = location.href;
      payload["Submitted"] = new Date().toISOString();
      fetch(endpoint(), { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok ? "true" : "false" }; }); })
        .then(function (res) {
          if (String(res.success) !== "true") throw new Error(res.message || "not sent");
          var okMsg = form.getAttribute("data-success") || "Sent. We'll reply by email within one business day.";
          status.className = "form-status ok"; status.textContent = okMsg;
          form.reset(); if (form._resetSteps) form._resetSteps();
          $$("input, select, textarea, button", form).forEach(function (x) { if (x.type !== "submit") x.blur(); });
          status.setAttribute("tabindex", "-1"); status.focus();
          if (window.gtag) window.gtag("event", "generate_lead", { form: form.getAttribute("data-form") });
        })
        .catch(function () {
          status.className = "form-status bad";
          status.textContent = "Your message didn't go through. Check your connection and press the button again.";
        })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  });

  /* Multi-step forms */
  $$("form[data-steps]").forEach(function (form) {
    var steps = $$(".step", form), bar = $(".steps-bar", form), count = $(".step-count", form), i = 0;
    if (bar) { bar.style.setProperty("--n", steps.length); bar.innerHTML = steps.map(function () { return "<span></span>"; }).join(""); }
    function show(n) {
      i = Math.max(0, Math.min(n, steps.length - 1));
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      if (bar) $$("span", bar).forEach(function (s, k) { s.classList.toggle("on", k <= i); });
      if (count) count.textContent = "Step " + (i + 1) + " of " + steps.length + ": " + (steps[i].getAttribute("data-title") || "");
      var rv = $("[data-review]", steps[i]);
      if (rv) {
        var d = collect(form), html = "<dl>";
        Object.keys(d).forEach(function (k) { if (/consent|agree/i.test(k)) return; html += "<dt>" + esc(k) + "</dt><dd>" + esc(d[k]) + "</dd>"; });
        rv.innerHTML = html + "</dl>";
      }
    }
    $$("[data-next]", form).forEach(function (b) { b.addEventListener("click", function () { if (validate(steps[i])) { show(i + 1); var h = $("h3, legend, label", steps[i]); h && steps[i].scrollIntoView({ block: "nearest" }); } }); });
    $$("[data-back]", form).forEach(function (b) { b.addEventListener("click", function () { show(i - 1); }); });
    form._resetSteps = function () { show(0); };
    show(0);
  });
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  WL.esc = esc;

  /* Prefill selects from ?topic= / ?service= */
  var qs = new URLSearchParams(location.search);
  $$("[data-prefill]").forEach(function (el) {
    var v = qs.get(el.getAttribute("data-prefill")); if (!v) return;
    if (el.tagName === "SELECT") { $$("option", el).forEach(function (o) { if (o.value === v) el.value = v; }); }
    else if (el.type === "radio") { if (el.value === v) el.checked = true; }
    else el.value = v;
  });

  /* ---------- Lifeline (home) ---------- */
  var tabs = $$(".lifeline .node");
  if (tabs.length) {
    var select = function (t, focus) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute("aria-selected", on ? "true" : "false"); x.tabIndex = on ? 0 : -1; var p = doc.getElementById(x.getAttribute("aria-controls")); if (p) p.hidden = !on; });
      if (focus) t.focus();
      store.set("wl-stage", t.getAttribute("data-stage"));
    };
    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") n = tabs[(k + 1) % tabs.length];
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = tabs[(k - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0]; if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var saved = store.get("wl-stage"), pre = tabs.filter(function (t) { return t.getAttribute("data-stage") === saved; })[0];
    select(pre || tabs[0]);
  }

  /* ---------- Today strip ---------- */
  var TIPS = [
    ["launch", "Buy your domain for at least two years and turn on auto-renew the same day.", "guides/choose-a-domain-name.html"],
    ["launch", "Write your About and Contact pages before your homepage. They force clarity.", "guides/30-day-website-launch-plan.html"],
    ["launch", "Pick the platform you can update in 10 minutes on a tired evening.", "guides/builder-vs-cms-vs-static.html"],
    ["grow", "Every page needs one job and one title that says it in under 60 characters.", "tools/seo-meta-checker.html"],
    ["grow", "Verify your site in Google Search Console on launch day, not launch month.", "guides/seo-fundamentals.html"],
    ["grow", "Compress your hero image first. It's usually the Largest Contentful Paint.", "guides/core-web-vitals.html"],
    ["grow", "Link new posts from two older, already-indexed pages.", "guides/seo-fundamentals.html"],
    ["earn", "Revenue = sessions × pages per session × RPM ÷ 1,000. Grow the middle term.", "tools/website-revenue-estimator.html"],
    ["earn", "One honest comparison page can out-earn twenty thin listicles.", "guides/website-monetization-models.html"],
    ["earn", "Never ask anyone to click ads. It's the fastest way to lose an ad account.", "guides/ad-network-readiness.html"],
    ["protect", "Turn on two-factor authentication for your registrar before anything else.", "guides/website-security-baseline.html"],
    ["protect", "A backup you haven't restored is a hope, not a backup.", "guides/backups-uptime-incident-response.html"],
    ["protect", "Use a password manager and give every account its own random password.", "tools/password-generator.html"],
    ["protect", "Set an uptime monitor so you hear about downtime before your visitors do.", "tools/uptime-calculator.html"],
    ["legacy", "Write down where your domains, hosting and logins live. Your future self will thank you.", "tools/digital-legacy-planner.html"],
    ["legacy", "Buyers pay for documented, diversified revenue. Start keeping clean records now.", "guides/how-websites-are-valued-and-sold.html"],
    ["legacy", "Name a trusted contact for each major account that supports one.", "guides/digital-legacy-planning.html"],
    ["launch", "Use one email address that you control for every registrar and host account.", "guides/website-security-baseline.html"],
    ["grow", "Add descriptive alt text to every meaningful image. It helps people and search.", "tools/seo-meta-checker.html"],
    ["earn", "Track every campaign link with UTM tags so you know which channel pays.", "tools/utm-builder.html"],
    ["protect", "Renew SSL automatically. Expired certificates scare visitors away instantly.", "guides/backups-uptime-incident-response.html"],
    ["legacy", "Keep a one-page handover note: domain, host, DNS, email, analytics, payments.", "tools/digital-legacy-planner.html"]
  ];
  var TOOLS = [
    ["launch", "Website launch cost calculator", "tools/website-cost-calculator.html"],
    ["launch", "Domain name generator", "tools/domain-name-generator.html"],
    ["grow", "SEO meta checker", "tools/seo-meta-checker.html"],
    ["grow", "Page-weight budget", "tools/page-weight-budget.html"],
    ["earn", "Website revenue estimator", "tools/website-revenue-estimator.html"],
    ["earn", "UTM link builder", "tools/utm-builder.html"],
    ["protect", "Password generator", "tools/password-generator.html"],
    ["protect", "Uptime calculator", "tools/uptime-calculator.html"],
    ["launch", "Website health check", "tools/website-health-check.html"],
    ["grow", "Schema generator", "tools/schema-generator.html"],
    ["grow", "Robots.txt & sitemap builder", "tools/robots-sitemap-builder.html"],
    ["legacy", "Website valuation estimator", "tools/website-valuation.html"],
    ["legacy", "Digital legacy planner", "tools/digital-legacy-planner.html"],
    ["launch", "Colour palette generator", "tools/color-palette-generator.html"]
  ];
  WL.TOOLS = TOOLS;
  var now = new Date(), start = new Date(now.getFullYear(), 0, 0), day = Math.floor((now - start) / 864e5);
  var tipEl = $("[data-tip]"), toolEl = $("[data-tool-of-day]"), dateEl = $("[data-today-date]");
  if (tipEl) { var tip = TIPS[day % TIPS.length]; tipEl.innerHTML = esc(tip[1]) + ' <a class="text-link" data-stage="' + tip[0] + '" href="' + ROOT + tip[2] + '">Learn how</a>'; }
  if (toolEl) { var tl = TOOLS[(day * 5) % TOOLS.length]; toolEl.innerHTML = '<a data-stage="' + tl[0] + '" class="text-link" href="' + ROOT + tl[2] + '">' + esc(tl[1]) + "</a>"; }
  if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  /* ---------- Feeds ---------- */
  function ago(iso) {
    var t = Date.parse(iso); if (!t) return "";
    var s = (Date.now() - t) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    if (s < 86400 * 30) return Math.round(s / 86400) + " d ago";
    return new Date(t).toLocaleDateString();
  }
  WL.ago = ago;
  function getJSON(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  $$("[data-news]").forEach(function (box) {
    var limit = +box.getAttribute("data-limit") || 12, cat = box.getAttribute("data-news");
    getJSON(ROOT + "data/news.json").then(function (d) {
      var items = (d.items || []).filter(function (x) { return cat === "all" || x.stage === cat; }).slice(0, limit);
      if (!items.length) throw new Error("empty");
      box.innerHTML = items.map(function (x) {
        return '<li data-stage="' + esc(x.stage || "") + '"><div><a href="' + esc(x.link) + '" target="_blank" rel="noopener nofollow">' + esc(x.title) + '</a><div class="src">' + esc(x.source) + "</div></div><span class=\"when\">" + ago(x.date) + "</span></li>";
      }).join("");
      $$("[data-news-updated]").forEach(function (n) { n.textContent = d.updated ? "Updated " + ago(d.updated) : ""; });
    }).catch(function () { box.innerHTML = '<li><span class="empty">Headlines refresh automatically every few hours. Check back shortly.</span></li>'; });
  });
  $$("[data-breaches]").forEach(function (box) {
    var limit = +box.getAttribute("data-limit") || 8;
    getJSON(ROOT + "data/breaches.json").then(function (d) {
      var items = (d.items || []).slice(0, limit); if (!items.length) throw new Error("empty");
      box.innerHTML = items.map(function (b) {
        return '<li><div><a href="https://haveibeenpwned.com/Breach/' + encodeURIComponent(b.name) + '" target="_blank" rel="noopener nofollow">' + esc(b.title) + '</a><div class="src">' + Number(b.count || 0).toLocaleString() + " accounts · " + esc((b.classes || []).slice(0, 3).join(", ")) + '</div></div><span class="when">Added ' + ago(b.added) + "</span></li>";
      }).join("");
    }).catch(function () { box.innerHTML = '<li><span class="empty">The breach list refreshes automatically. Check back shortly.</span></li>'; });
  });
  $$("[data-hn]").forEach(function (box) {
    var q = box.getAttribute("data-hn") || "website";
    fetch("https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=12&query=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var hits = (d.hits || []).filter(function (h) { return h.title; }).slice(0, 10);
        if (!hits.length) throw new Error("none");
        box.innerHTML = hits.map(function (h) {
          var url = h.url || ("https://news.ycombinator.com/item?id=" + h.objectID);
          return '<li><div><a href="' + esc(url) + '" target="_blank" rel="noopener nofollow">' + esc(h.title) + '</a><div class="src">Hacker News · <a href="https://news.ycombinator.com/item?id=' + h.objectID + '" target="_blank" rel="noopener nofollow">' + (h.num_comments || 0) + " comments</a></div></div><span class=\"when\">" + ago(h.created_at) + "</span></li>";
        }).join("");
      })
      .catch(function () { box.innerHTML = '<li><span class="empty">Live community stories are unavailable right now. Reload the page to try again.</span></li>'; });
  });

  /* ---------- YouTube facades ---------- */
  $$(".yt-facade").forEach(function (b) {
    var id = b.getAttribute("data-yt");
    b.style.backgroundImage = "url(https://i.ytimg.com/vi/" + id + "/hqdefault.jpg)";
    b.addEventListener("click", function () {
      var f = doc.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      f.title = b.getAttribute("aria-label") || "YouTube video";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      f.allowFullscreen = true; f.loading = "lazy"; f.referrerPolicy = "strict-origin-when-cross-origin";
      b.replaceWith(f);
    });
  });

  /* ---------- Filters ---------- */
  $$("[data-filter-scope]").forEach(function (scope) {
    var btns = $$("[data-filter-btn]", scope), search = $("[data-filter-search]", scope), items = $$("[data-tags]", scope), empty = $("[data-filter-empty]", scope);
    var active = "all";
    function run() {
      var q = search ? search.value.trim().toLowerCase() : "", shown = 0;
      items.forEach(function (it) {
        var okTag = active === "all" || (" " + it.getAttribute("data-tags") + " ").indexOf(" " + active + " ") > -1;
        var okQ = !q || it.textContent.toLowerCase().indexOf(q) > -1;
        it.hidden = !(okTag && okQ); if (!it.hidden) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { active = b.getAttribute("data-filter-btn"); btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); run(); }); });
    if (search) search.addEventListener("input", run);
    var pre = qs.get("stage"); if (pre) { var pb = btns.filter(function (b) { return b.getAttribute("data-filter-btn") === pre; })[0]; if (pb) pb.click(); }
  });

  /* ---------- Contests ---------- */
  var CONTESTS = [
    { key: "launch", title: "Launch of the Month", stage: "launch", body: "Show us a website that went live in the last 90 days. We judge clarity, usefulness, accessibility and speed." },
    { key: "speed", title: "Speed Sprint", stage: "grow", body: "Make an existing site faster. Send before-and-after PageSpeed Insights results for the same URL; biggest real-world improvement wins." },
    { key: "idea", title: "Tool Idea Challenge", stage: "earn", body: "Pitch a free web tool that would help website owners. The winning idea gets built and credited on Web.Life." }
  ];
  var cBox = $("[data-contest]");
  if (cBox) {
    var m = now.getMonth(), cur = CONTESTS[m % 3], nxt = CONTESTS[(m + 1) % 3];
    var monthName = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    $$("[data-contest-title]").forEach(function (n) { n.textContent = cur.title; });
    $$("[data-contest-month]").forEach(function (n) { n.textContent = monthName; });
    $$("[data-contest-body]").forEach(function (n) { n.textContent = cur.body; });
    $$("[data-contest-next]").forEach(function (n) { n.textContent = nxt.title; });
    cBox.setAttribute("data-stage", cur.stage);
    var sel = $("[data-contest-select]"); if (sel) sel.value = cur.title;
  }
  $$("[data-countdown]").forEach(function (box) {
    var end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0) - 1;
    function tick() {
      var d = Math.max(0, end - Date.now()), parts = [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60, Math.floor(d / 1e3) % 60];
      $$("b", box).forEach(function (b, k) { b.textContent = String(parts[k]).padStart(2, "0"); });
    }
    tick(); setInterval(tick, 1000);
  });

  /* ---------- Support / pledge summary ---------- */
  var pledge = $("form[data-form='support-pledge']");
  if (pledge) {
    var sum = $("[data-pledge-summary]", pledge), custom = $("#pledge-custom", pledge);
    var upd = function () {
      var amt = ($("input[name=amount]:checked", pledge) || {}).value || "";
      if (amt === "custom") amt = custom && custom.value ? custom.value : "";
      if (custom) { custom.closest(".field").hidden = (($("input[name=amount]:checked", pledge) || {}).value !== "custom"); custom.required = !custom.closest(".field").hidden; }
      var freq = ($("input[name=frequency]:checked", pledge) || {}).value || "One-time";
      var to = ($("select[name=purpose]", pledge) || {}).value || "Wherever it's needed most";
      if (sum) sum.textContent = amt ? ("$" + amt + " " + freq.toLowerCase() + ", directed to: " + to) : "Choose an amount to see your pledge summary.";
    };
    pledge.addEventListener("change", upd); pledge.addEventListener("input", upd); upd();
  }

  /* Copy buttons */
  $$("[data-copy-target]").forEach(function (b) { b.addEventListener("click", function () { var t = $(b.getAttribute("data-copy-target")); if (t) WL.copy(t.value !== undefined && t.tagName !== "PRE" && t.tagName !== "DIV" ? t.value : t.textContent); }); });

  /* Print */
  $$("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
})();
