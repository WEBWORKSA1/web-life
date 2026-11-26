/* Web.Life — free tools. Everything runs in the browser; nothing is sent anywhere. */
(function () {
  "use strict";
  var doc = document, $ = function (s, c) { return (c || doc).querySelector(s); }, $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var num = function (el, d) { var v = parseFloat(typeof el === "string" ? ($(el) || {}).value : (el || {}).value); return isFinite(v) ? v : (d || 0); };
  var money = function (v, cur) { cur = cur || "$"; return cur + Math.round(v).toLocaleString(); };
  var money2 = function (v) { return "$" + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: v < 100 ? 2 : 0 }); };
  var copy = function (t) { if (window.WL && WL.copy) WL.copy(t); };
  var download = function (name, text, type) { var b = new Blob([text], { type: type || "text/plain" }); var a = doc.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; doc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  var store = (window.WL && WL.store) || { get: function () { return null; }, set: function () {} };
  function rand(n) { // crypto-safe integer in [0, n)
    var max = Math.floor(4294967296 / n) * n, x = new Uint32Array(1);
    do { crypto.getRandomValues(x); } while (x[0] >= max);
    return x[0] % n;
  }
  function on(root, fn) { root.addEventListener("input", fn); root.addEventListener("change", fn); fn(); }

  var T = {};

  /* 1. Website launch cost calculator */
  T.cost = function (r) {
    var plat = $("#c-platform", r);
    var presets = { builder: 17, wp: 25, shared: 8, static: 0, shop: 39 };
    plat.addEventListener("change", function () { $("#c-host", r).value = presets[plat.value]; });
    on(r, function () {
      var host = num("#c-host"), dom = num("#c-domain"), theme = num("#c-theme"), apps = num("#c-apps"),
        design = num("#c-design"), mailUsers = num("#c-mailusers"), mail = num("#c-mail"), content = num("#c-content"), articles = num("#c-articles"), mkt = num("#c-marketing");
      var monthly = host + apps + mailUsers * mail + mkt;
      var oneOff = theme + design + content * articles;
      var yearOne = monthly * 12 + dom + oneOff;
      $("#c-out-year", r).textContent = money(yearOne);
      $("#c-out", r).innerHTML = [
        ["Hosting or platform (12 months)", host * 12], ["Domain (1 year)", dom], ["Apps and plugins (12 months)", apps * 12],
        ["Professional email (12 months)", mailUsers * mail * 12], ["Marketing (12 months)", mkt * 12],
        ["Theme or template", theme], ["Design and build help", design], ["Launch content", content * articles]
      ].map(function (x) { return "<div>" + x[0] + "</div><div>" + money(x[1]) + "</div>"; }).join("");
      $("#c-out-month", r).textContent = money(monthly + dom / 12) + " per month after launch";
      var share = yearOne ? Math.round(oneOff / yearOne * 100) : 0;
      $("#c-out-note", r).textContent = share > 60 ? "Most of your first-year cost is one-off setup. Year two should be much cheaper." : "Most of your cost is recurring. Review subscriptions every six months.";
    });
  };

  /* 2. Domain name generator */
  T.domain = function (r) {
    var PRE = ["get", "try", "my", "go", "the", "hey", "use", "join", "meet", "all"], SUF = ["hq", "hub", "lab", "ly", "kit", "base", "works", "now", "life", "wise", "nest", "stack", "spot", "zone", "craft"];
    function score(name, tld) {
      var s = 100, len = name.length, vowels = (name.match(/[aeiouy]/g) || []).length;
      if (len > 8) s -= (len - 8) * 4; if (len > 15) s -= 15;
      if (/-/.test(name)) s -= 18; if (/\d/.test(name)) s -= 12;
      var ratio = vowels / len; if (ratio < .25 || ratio > .6) s -= 10;
      if (/(.)\1\1/.test(name)) s -= 10; if (/[^aeiouy]{4,}/.test(name)) s -= 8;
      if (tld === ".com") s += 6; else if (/^\.(io|co|app|dev|ai)$/.test(tld)) s += 0; else s -= 2;
      return Math.max(5, Math.min(100, Math.round(s)));
    }
    function blend(a, b) {
      for (var k = Math.min(a.length, b.length) - 1; k >= 2; k--) { if (a.slice(-k) === b.slice(0, k)) return a + b.slice(k); }
      return null;
    }
    function gen() {
      var words = $("#d-words", r).value.toLowerCase().split(/[\s,]+/).map(function (w) { return w.replace(/[^a-z0-9-]/g, ""); }).filter(Boolean).slice(0, 6);
      var tlds = $$("input[name=tld]:checked", r).map(function (x) { return x.value; });
      var max = num("#d-max", 15), out = $("#d-out", r);
      if (!words.length) { out.innerHTML = '<li class="muted">Type one to three words that describe your site, for example: garden, tools.</li>'; return; }
      if (!tlds.length) tlds = [".com"];
      var names = {};
      var add = function (n) { if (n.length >= 3 && n.length <= max) names[n] = 1; };
      words.forEach(function (w) { add(w); PRE.forEach(function (p) { add(p + w); }); SUF.forEach(function (s) { add(w + s); }); });
      for (var i = 0; i < words.length; i++) for (var j = 0; j < words.length; j++) if (i !== j) { add(words[i] + words[j]); var b = blend(words[i], words[j]); if (b) add(b); add(words[i].slice(0, Math.ceil(words[i].length * .6)) + words[j]); }
      var list = [];
      Object.keys(names).forEach(function (n) { tlds.forEach(function (t) { list.push({ n: n, t: t, s: score(n, t) }); }); });
      list.sort(function (a, b) { return b.s - a.s || a.n.length - b.n.length; });
      list = list.slice(0, 40);
      out.innerHTML = list.map(function (x) {
        var cls = x.s >= 80 ? "good" : x.s >= 60 ? "warn" : "bad", full = x.n + x.t;
        return '<li><span class="name">' + esc(full) + '</span><span class="inline-actions" style="margin:0"><span class="badge ' + cls + '">' + x.s + '/100</span><a class="badge" href="https://lookup.icann.org/en/lookup?name=' + encodeURIComponent(full) + '" target="_blank" rel="noopener nofollow">Look up</a><button class="badge" type="button" data-c="' + esc(full) + '" style="border:0;cursor:pointer">Copy</button></span></li>';
      }).join("");
      $$("button[data-c]", out).forEach(function (b) { b.addEventListener("click", function () { copy(b.getAttribute("data-c")); }); });
      $("#d-count", r).textContent = list.length + " ideas, best first";
    }
    $("#d-go", r).addEventListener("click", gen);
    $("#d-words", r).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); gen(); } });
    $$("input[name=tld], #d-max", r).forEach(function (x) { x.addEventListener("change", gen); });
    gen();
  };

  /* 3. SEO meta checker */
  T.seo = function (r) {
    var cv = doc.createElement("canvas").getContext("2d");
    var px = function (t, font) { cv.font = font; return cv.measureText(t).width; };
    var badge = function (ok, warnTxt, okTxt) { return ok === true ? '<span class="badge good">' + (okTxt || "Good") + "</span>" : ok === "warn" ? '<span class="badge warn">' + warnTxt + "</span>" : '<span class="badge bad">' + warnTxt + "</span>"; };
    on($("#s-snippet", r), function () {
      var t = $("#s-title", r).value.trim(), d = $("#s-desc", r).value.trim(), u = $("#s-url", r).value.trim() || "https://example.com/page";
      var tp = px(t, "20px arial"), dp = px(d, "14px arial");
      var showT = t || "Your page title appears here", showD = d || "Your meta description appears here. Write one or two sentences that tell searchers exactly what they'll get.";
      if (tp > 600) { while (showT.length && px(showT + "…", "20px arial") > 600) showT = showT.slice(0, -1); showT += "…"; }
      if (dp > 920) { while (showD.length && px(showD + "…", "14px arial") > 920) showD = showD.slice(0, -1); showD += "…"; }
      var crumb = u.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/").join(" › ");
      $("#s-serp", r).innerHTML = '<div class="u">' + esc(crumb) + '</div><div class="t">' + esc(showT) + '</div><div class="d">' + esc(showD) + "</div>";
      $("#s-tlen", r).innerHTML = t.length + " characters, about " + Math.round(tp) + "px " + badge(!t ? false : tp <= 600 && t.length >= 25 ? true : t.length < 25 ? "warn" : false, !t ? "Missing" : t.length < 25 ? "Short" : "Too long");
      $("#s-dlen", r).innerHTML = d.length + " characters, about " + Math.round(dp) + "px " + badge(!d ? false : dp <= 920 && d.length >= 70 ? true : d.length < 70 ? "warn" : false, !d ? "Missing" : d.length < 70 ? "Short" : "May be cut off");
    });
    $("#s-audit", r).addEventListener("click", function () {
      var src = $("#s-html", r).value, out = $("#s-report", r);
      if (!src.trim()) { out.innerHTML = '<p class="muted">Paste the full HTML of a page (View source, select all, copy) to run the audit.</p>'; return; }
      var dom = new DOMParser().parseFromString(src, "text/html"), checks = [];
      var meta = function (n) { var m = dom.querySelector('meta[name="' + n + '"]'); return m ? (m.getAttribute("content") || "").trim() : null; };
      var prop = function (n) { var m = dom.querySelector('meta[property="' + n + '"]'); return m ? (m.getAttribute("content") || "").trim() : null; };
      var title = (dom.title || "").trim(); checks.push(["Title tag", title ? (title.length <= 60 ? true : "warn") : false, title ? esc(title) + " (" + title.length + " chars)" : "No title found"]);
      var desc = meta("description"); checks.push(["Meta description", desc ? (desc.length >= 70 && desc.length <= 160 ? true : "warn") : false, desc ? desc.length + " characters" : "Missing"]);
      var h1 = dom.querySelectorAll("h1").length; checks.push(["One H1 heading", h1 === 1 ? true : h1 === 0 ? false : "warn", h1 + " found"]);
      var imgs = dom.querySelectorAll("img"), noAlt = Array.prototype.filter.call(imgs, function (i) { return !i.hasAttribute("alt"); }).length;
      checks.push(["Image alt text", imgs.length === 0 ? true : noAlt === 0 ? true : noAlt <= 2 ? "warn" : false, imgs.length + " images, " + noAlt + " without alt"]);
      var canon = dom.querySelector('link[rel="canonical"]'); checks.push(["Canonical URL", canon ? true : "warn", canon ? esc(canon.getAttribute("href")) : "Not set"]);
      var vp = meta("viewport"); checks.push(["Mobile viewport", vp ? true : false, vp ? "Present" : "Missing: page may not be mobile-friendly"]);
      var lang = dom.documentElement.getAttribute("lang"); checks.push(["Language attribute", lang ? true : "warn", lang || "Not set on <html>"]);
      var robots = meta("robots"); checks.push(["Indexable", robots && /noindex/i.test(robots) ? false : true, robots ? esc(robots) : "No robots restrictions"]);
      checks.push(["Open Graph title and image", prop("og:title") && prop("og:image") ? true : "warn", (prop("og:title") ? "Title set" : "No og:title") + ", " + (prop("og:image") ? "image set" : "no og:image")]);
      var ld = dom.querySelectorAll('script[type="application/ld+json"]').length; checks.push(["Structured data", ld ? true : "warn", ld ? ld + " JSON-LD block(s)" : "None found"]);
      var text = (dom.body ? dom.body.textContent : "").replace(/\s+/g, " ").trim(), words = text ? text.split(" ").length : 0;
      checks.push(["Content length", words >= 300 ? true : words >= 150 ? "warn" : false, words + " words"]);
      var links = dom.querySelectorAll("a[href]").length; checks.push(["Links", links ? true : "warn", links + " links"]);
      var pts = checks.reduce(function (a, c) { return a + (c[1] === true ? 1 : c[1] === "warn" ? .5 : 0); }, 0), pct = Math.round(pts / checks.length * 100);
      var outline = Array.prototype.slice.call(dom.querySelectorAll("h1,h2,h3")).slice(0, 25).map(function (h) { return "<li style='margin-left:" + (parseInt(h.tagName[1]) - 1) * 1 + "rem'>" + h.tagName + ": " + esc(h.textContent.trim().slice(0, 90)) + "</li>"; }).join("");
      out.innerHTML = '<p class="result-label">On-page score</p><p class="result-big">' + pct + '/100</p><div class="meter"><i style="width:' + pct + '%"></i></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Check</th><th>Result</th><th>Status</th></tr></thead><tbody>' + checks.map(function (c) { return "<tr><td>" + c[0] + "</td><td>" + c[2] + "</td><td>" + badge(c[1], c[1] === "warn" ? "Improve" : "Fix") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        (outline ? "<h3 style='margin-top:1.25rem'>Heading outline</h3><ul style='list-style:none;padding:0;font-size:.92rem'>" + outline + "</ul>" : "");
    });
  };

  /* 4. Password generator */
  var WORDS = "able acid aged also area army away baby back bake ball band bank barn base bath bead beam bean bear beat bell belt bend best bike bird bite blue boat body bold bolt bone book boot born boss bowl brag brew brick bride brim brook brush buck bulb bull bump bush busy cabin cable cake calm camp cane cape card care cart case cash cast cave cell chalk chef chip city clam clay clip club coal coat code coin cold comb cone cook cool copy cord core corn cost cove crab crew crop crow cube cuff cure curl cute dairy dance dart dash data dawn deal deck deer desk dial dice dish dock dome door dove draw dream drum duck dune dust eagle early earth easy echo edge eel elbow elk ember epic fable face fact fair fall fame farm fern ferry field film fire fish five flag flame flash fleet flip flock flute foam fog fold folk food fork fort fox frog frost fruit fuel gale game gate gear gem gift glad glow glue goat gold golf good gown grain grape grass gray grid grin grip gulf gust hail hand harp hawk hazel heat helm herb hero hill hive hold home hook hope horn host hull hunt husk idea inch iron isle ivory ivy jade jam jar jazz jeep jelly jet jog joke jolly judge juice jump jungle kale keen kelp kept kettle key kick kind king kite kiwi knee knot lace lake lamb lamp land lane lark lava lawn leaf lean lemon lens lily lime line lion list loaf lock loft logo loop lord loud lucky lunar lynx mango maple march mask mast maze meal melon mesa mild mill mint mist moat mole moon moss moth mule music nest net noble north note oak oasis ocean olive onion opal orbit otter oven owl pace page palm panda paper park pass path peach pear pebble pecan pen pepper piano pier pilot pine pipe plan plum poem pole pond pony pool port prism pulse quail quart queen quest quick quiet quilt radar raft rain ramp ranch raven reef rest rice ridge ring river road robin rock roof rope rose ruby rust safe sage sail salt sand scarf scout seal seed shell ship shore silk silver sky slate sled slope snow soap sofa solar song spark spice spoon spring star steam stone storm straw sugar sun swan table tango tea tent thorn tide tiger toast topaz torch tower trail tree tulip tuna tune twig umbra uncle unit urban valley vapor vault velvet vine violet vivid voice wagon walnut water wave wheat whale willow wind wing winter wolf wood wool yacht yard yarn yeast yoga zebra zero zest zinc zone".split(" ");
  T.password = function (r) {
    var out = $("#p-out", r);
    function gen() {
      var mode = ($("input[name=pmode]:checked", r) || {}).value || "password", pw = "", bits = 0;
      $("#p-pw-opts", r).hidden = mode !== "password"; $("#p-pp-opts", r).hidden = mode !== "phrase";
      if (mode === "password") {
        var len = num("#p-len", 20); $("#p-len-v", r).textContent = len;
        var sets = { lower: "abcdefghijkmnopqrstuvwxyz", upper: "ABCDEFGHJKLMNPQRSTUVWXYZ", digits: "23456789", symbols: "!@#$%^&*()-_=+[]{};:,.?" };
        if (!$("#p-amb", r).checked) { sets.lower += "l"; sets.upper += "IO"; sets.digits += "01"; }
        var chosen = $$("input[name=pset]:checked", r).map(function (x) { return sets[x.value]; });
        if (!chosen.length) { chosen = [sets.lower]; }
        var pool = chosen.join("");
        var chars = chosen.map(function (s) { return s[rand(s.length)]; });
        while (chars.length < len) chars.push(pool[rand(pool.length)]);
        for (var i = chars.length - 1; i > 0; i--) { var j = rand(i + 1), t = chars[i]; chars[i] = chars[j]; chars[j] = t; }
        pw = chars.slice(0, len).join(""); bits = len * Math.log2(pool.length);
      } else {
        var n = num("#p-words", 5), sep = $("#p-sep", r).value, cap = $("#p-cap", r).checked, dig = $("#p-num", r).checked;
        $("#p-words-v", r).textContent = n;
        var w = []; for (var k = 0; k < n; k++) { var word = WORDS[rand(WORDS.length)]; w.push(cap ? word[0].toUpperCase() + word.slice(1) : word); }
        if (dig) w.push(String(rand(100)));
        pw = w.join(sep); bits = n * Math.log2(WORDS.length) + (dig ? Math.log2(100) : 0);
      }
      out.value = pw;
      var secs = Math.pow(2, bits - 1) / 1e10, label;
      if (secs < 3600) label = "under an hour"; else if (secs < 86400 * 365) label = Math.round(secs / 86400) + " days"; else if (secs < 31536e3 * 1e6) label = Math.round(secs / 31536e3).toLocaleString() + " years"; else label = "longer than the age of the universe";
      var pct = Math.min(100, bits / 128 * 100);
      $("#p-meter", r).style.width = pct + "%";
      $("#p-bits", r).textContent = Math.round(bits) + " bits of entropy";
      $("#p-crack", r).textContent = "Estimated time to guess offline at 10 billion guesses per second: " + label + ".";
      $("#p-verdict", r).textContent = bits >= 80 ? "Strong" : bits >= 60 ? "Good for most accounts" : bits >= 45 ? "Fair: make it longer" : "Weak: make it much longer";
    }
    $$("input, select", r).forEach(function (x) { x.addEventListener("input", gen); x.addEventListener("change", gen); });
    $("#p-new", r).addEventListener("click", gen);
    $("#p-copy", r).addEventListener("click", function () { copy(out.value); });
    gen();
  };

  /* 5. Revenue estimator */
  T.revenue = function (r) {
    var niche = $("#v-niche", r);
    niche.addEventListener("change", function () { $("#v-rpm", r).value = niche.value; });
    on(r, function () {
      var sess = num("#v-sessions"), pps = num("#v-pps", 1.5), rpm = num("#v-rpm"), views = sess * pps;
      var ads = views / 1000 * rpm;
      var aff = sess * num("#v-affclick") / 100 * num("#v-affconv") / 100 * num("#v-affcomm");
      var leads = sess * num("#v-leadconv") / 100, leadRev = leads * num("#v-leadval");
      var prod = num("#v-sales") * num("#v-margin");
      var spons = num("#v-spons");
      var total = ads + aff + leadRev + prod + spons;
      $("#v-total", r).textContent = money(total);
      $("#v-year", r).textContent = money(total * 12) + " per year";
      $("#v-break", r).innerHTML = [["Display ads (" + Math.round(views).toLocaleString() + " pageviews)", ads], ["Affiliate commissions", aff], ["Leads (" + Math.round(leads).toLocaleString() + " per month)", leadRev], ["Own products or services", prod], ["Sponsorships", spons]]
        .map(function (x) { return "<div>" + x[0] + "</div><div>" + money(x[1]) + "</div>"; }).join("");
      var rpv = sess ? total / sess * 1000 : 0; $("#v-rps", r).textContent = money2(rpv) + " earned per 1,000 sessions";
      var row = function (lbl, f) { return "<tr><td>" + lbl + "</td>" + [.5, 1, 1.5].map(function (m) { return '<td class="num">' + money(f(m)) + "</td>"; }).join("") + "</tr>"; };
      $("#v-sens", r).innerHTML = row("Traffic", function (m) { return total - ads - aff - leadRev + (ads + aff + leadRev) * m; }) + row("Ad RPM", function (m) { return total - ads + ads * m; }) + row("Lead value", function (m) { return total - leadRev + leadRev * m; });
    });
  };

  /* 6. UTM builder */
  T.utm = function (r) {
    on(r, function () {
      var base = $("#u-url", r).value.trim(), lower = $("#u-lower", r).checked, out = $("#u-out", r), note = $("#u-note", r);
      if (!base) { out.textContent = "Enter the page address to tag."; note.textContent = ""; return; }
      var u; try { u = new URL(/^https?:\/\//i.test(base) ? base : "https://" + base); } catch (e) { out.textContent = "That address doesn't look valid. Include the full domain, like https://example.com/page"; return; }
      var f = { utm_source: "#u-source", utm_medium: "#u-medium", utm_campaign: "#u-campaign", utm_term: "#u-term", utm_content: "#u-content" };
      Object.keys(f).forEach(function (k) { var v = $(f[k], r).value.trim().replace(/\s+/g, "_"); if (lower) v = v.toLowerCase(); if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); });
      out.textContent = u.toString();
      var missing = ["#u-source", "#u-medium", "#u-campaign"].filter(function (s) { return !$(s, r).value.trim(); });
      note.textContent = missing.length ? "Add source, medium and campaign. Analytics tools group traffic by these three." : "Ready to use. Keep naming consistent so reports group correctly.";
    });
    $("#u-copy", r).addEventListener("click", function () { copy($("#u-out", r).textContent); });
  };

  /* 7. Page-weight budget */
  T.weight = function (r) {
    var NET = { slow3g: [0.4, 400], fast3g: [1.6, 150], "4g": [9, 85], broadband: [50, 20] };
    on(r, function () {
      var parts = [["HTML", num("#w-html")], ["CSS", num("#w-css")], ["JavaScript", num("#w-js")], ["Images", num("#w-img")], ["Fonts", num("#w-font")], ["Video and other", num("#w-other")]];
      var kb = parts.reduce(function (a, p) { return a + p[1]; }, 0), reqs = num("#w-req", 30), n = NET[$("#w-net", r).value] || NET.fast3g;
      var secs = kb * 8 / 1000 / n[0] + (n[1] / 1000) * (3 + Math.ceil(reqs / 6));
      var jsCost = num("#w-js") / 100 * 0.35; secs += jsCost;
      $("#w-total", r).textContent = secs.toFixed(1) + " s";
      $("#w-kb", r).textContent = (kb / 1024).toFixed(2) + " MB across " + reqs + " requests";
      var pct = Math.min(100, secs / 2.5 * 100);
      $("#w-meter", r).style.width = pct + "%";
      $("#w-verdict", r).textContent = secs <= 2.5 ? "Inside a 2.5 second budget on this connection." : "Over a 2.5 second budget. Trim the biggest bar first.";
      var max = Math.max.apply(null, parts.map(function (p) { return p[1]; })) || 1;
      $("#w-bars", r).innerHTML = parts.map(function (p) { return '<div style="display:grid;grid-template-columns:130px 1fr 70px;gap:.6rem;align-items:center;margin:.35rem 0"><span>' + p[0] + '</span><span class="meter" style="margin:0"><i style="width:' + (p[1] / max * 100) + '%"></i></span><span style="text-align:right;font-variant-numeric:tabular-nums">' + Math.round(p[1]) + " KB</span></div>"; }).join("");
    });
  };

  /* 8. Colour palette generator */
  T.palette = function (r) {
    var sw = $$(".swatch", r), locked = [0, 0, 0, 0, 0], cols = ["#14261F", "#2F6BFF", "#1E9E6A", "#D99A0B", "#EEF3EF"];
    function hsl2hex(h, s, l) { s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); }; return "#" + [f(0), f(8), f(4)].map(function (x) { return Math.round(x * 255).toString(16).padStart(2, "0"); }).join("").toUpperCase(); }
    function lum(hex) { var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
    function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
    function gen() {
      var mode = $("#k-mode", r).value, base = Math.random() * 360, s = 45 + Math.random() * 35;
      var hues = { random: [0, 0, 0, 0, 0].map(function () { return Math.random() * 360; }), analogous: [0, 20, 40, -20, -40].map(function (d) { return base + d; }), complementary: [0, 180, 0, 180, 30].map(function (d) { return base + d; }), triadic: [0, 120, 240, 0, 120].map(function (d) { return base + d; }), mono: [0, 0, 0, 0, 0].map(function () { return base; }) }[mode];
      var lights = mode === "mono" ? [18, 32, 48, 66, 88] : [22, 45, 55, 65, 90].sort(function () { return Math.random() - .5; });
      cols = cols.map(function (c, i) { return locked[i] ? c : hsl2hex(((hues[i] % 360) + 360) % 360, mode === "random" ? 30 + Math.random() * 60 : s, lights[i]); });
      paint();
    }
    function paint() {
      sw.forEach(function (el, i) {
        var c = cols[i], dark = lum(c) < .35; el.style.background = c; el.style.color = dark ? "#fff" : "#14261F";
        $(".hex", el).textContent = c; $(".lock", el).textContent = locked[i] ? "Locked" : "Lock"; $(".lock", el).setAttribute("aria-pressed", locked[i] ? "true" : "false");
      });
      var rows = cols.map(function (c) { var w = contrast(c, "#FFFFFF"), b = contrast(c, "#000000"); return "<tr><td><span style='display:inline-block;width:14px;height:14px;border-radius:4px;background:" + c + ";vertical-align:middle;border:1px solid #0002'></span> " + c + "</td><td class='num'>" + w.toFixed(1) + (w >= 4.5 ? " <span class='badge good'>AA</span>" : "") + "</td><td class='num'>" + b.toFixed(1) + (b >= 4.5 ? " <span class='badge good'>AA</span>" : "") + "</td></tr>"; }).join("");
      $("#k-contrast", r).innerHTML = rows;
      $("#k-css", r).textContent = ":root {\n" + cols.map(function (c, i) { return "  --color-" + (i + 1) + ": " + c + ";"; }).join("\n") + "\n}";
    }
    sw.forEach(function (el, i) {
      $(".lock", el).addEventListener("click", function () { locked[i] = !locked[i]; paint(); });
      $(".cp", el).addEventListener("click", function () { copy(cols[i]); });
    });
    $("#k-gen", r).addEventListener("click", gen);
    $("#k-mode", r).addEventListener("change", gen);
    $("#k-copy", r).addEventListener("click", function () { copy($("#k-css", r).textContent); });
    doc.addEventListener("keydown", function (e) { if (e.code === "Space" && !/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(doc.activeElement.tagName)) { e.preventDefault(); gen(); } });
    paint();
  };

  /* 9. Uptime calculator */
  T.uptime = function (r) {
    var fmt = function (s) { if (s < 60) return s.toFixed(1) + " s"; var m = s / 60; if (m < 60) return m.toFixed(1) + " min"; var h = m / 60; if (h < 24) return h.toFixed(1) + " h"; return (h / 24).toFixed(1) + " days"; };
    on(r, function () {
      var p = Math.min(100, Math.max(0, num("#t-pct", 99.9))), down = 1 - p / 100;
      $("#t-out", r).innerHTML = [["Per day", 86400], ["Per week", 604800], ["Per month (30.4 days)", 2629800], ["Per quarter", 7889400], ["Per year", 31557600]].map(function (x) { return "<div>" + x[0] + "</div><div>" + fmt(down * x[1]) + "</div>"; }).join("");
      $("#t-big", r).textContent = fmt(down * 2629800);
      var mins = num("#t-mins", 43.8); $("#t-rev", r).textContent = (100 - mins * 60 / 2629800 * 100).toFixed(4) + "% uptime";
    });
  };

  /* 10. Website health check */
  T.health = function (r) {
    var boxes = $$(".checklist input", r), key = "wl-health";
    var saved = {}; try { saved = JSON.parse(store.get(key) || "{}"); } catch (e) {}
    boxes.forEach(function (b) { if (saved[b.id]) b.checked = true; });
    on(r, function () {
      var done = boxes.filter(function (b) { return b.checked; }).length, pct = Math.round(done / boxes.length * 100), s = {};
      boxes.forEach(function (b) { if (b.checked) s[b.id] = 1; }); store.set(key, JSON.stringify(s));
      $("#h-score", r).textContent = pct + "/100"; $("#h-meter", r).style.width = pct + "%";
      $("#h-grade", r).textContent = pct >= 90 ? "Excellent. Re-run this every quarter." : pct >= 70 ? "Solid, with a few gaps worth closing this month." : pct >= 40 ? "Some important basics are missing. Start with the unticked Security and Search items." : "Your site is at risk of being slow, invisible or insecure. Work through the list top to bottom.";
      var missing = boxes.filter(function (b) { return !b.checked; }).slice(0, 5).map(function (b) { return "<li>" + esc(b.parentNode.textContent.trim()) + "</li>"; }).join("");
      $("#h-next", r).innerHTML = missing ? "<h3 style='margin-top:1rem'>Fix next</h3><ol>" + missing + "</ol>" : "<p>Everything is ticked. Nicely done.</p>";
      var hid = doc.getElementById("h-score-field"); if (hid) hid.value = pct + "/100 (" + done + " of " + boxes.length + " checks)";
    });
    $("#h-reset", r).addEventListener("click", function () { boxes.forEach(function (b) { b.checked = false; }); r.dispatchEvent(new Event("change")); });
  };

  /* 11. Schema generator */
  T.schema = function (r) {
    var type = $("#g-type", r);
    function show() { $$("[data-for]", r).forEach(function (f) { f.hidden = f.getAttribute("data-for").split(" ").indexOf(type.value) < 0; }); }
    type.addEventListener("change", show); show();
    on(r, function () {
      var v = function (id) { return ($(id, r) || {}).value ? $(id, r).value.trim() : ""; }, o = { "@context": "https://schema.org", "@type": type.value };
      if (type.value === "Organization" || type.value === "LocalBusiness") {
        if (v("#g-name")) o.name = v("#g-name"); if (v("#g-url")) o.url = v("#g-url"); if (v("#g-logo")) o.logo = v("#g-logo");
        var same = v("#g-same").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); if (same.length) o.sameAs = same;
        if (type.value === "LocalBusiness") {
          if (v("#g-phone")) o.telephone = v("#g-phone");
          if (v("#g-street") || v("#g-city")) o.address = { "@type": "PostalAddress", streetAddress: v("#g-street"), addressLocality: v("#g-city"), addressRegion: v("#g-region"), postalCode: v("#g-postal"), addressCountry: v("#g-country") };
          if (v("#g-hours")) o.openingHours = v("#g-hours"); if (v("#g-price")) o.priceRange = v("#g-price");
        }
      } else if (type.value === "Article") {
        o.headline = v("#g-headline"); if (v("#g-author")) o.author = { "@type": "Person", name: v("#g-author") };
        if (v("#g-date")) o.datePublished = v("#g-date"); if (v("#g-image")) o.image = v("#g-image"); if (v("#g-pub")) o.publisher = { "@type": "Organization", name: v("#g-pub") };
      } else if (type.value === "FAQPage") {
        var lines = v("#g-faq").split(/\n\s*\n/).map(function (b) { var p = b.split("\n"); return { q: (p.shift() || "").replace(/^Q:\s*/i, "").trim(), a: p.join(" ").replace(/^A:\s*/i, "").trim() }; }).filter(function (x) { return x.q && x.a; });
        o.mainEntity = lines.map(function (x) { return { "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } }; });
      }
      $("#g-out", r).textContent = '<script type="application/ld+json">\n' + JSON.stringify(o, null, 2) + "\n</" + "script>";
    });
    $("#g-copy", r).addEventListener("click", function () { copy($("#g-out", r).textContent); });
  };

  /* 12. Robots.txt & sitemap */
  T.robots = function (r) {
    on(r, function () {
      var dom = $("#b-domain", r).value.trim().replace(/\/+$/, ""), lines = ["User-agent: *"];
      var dis = $("#b-disallow", r).value.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (dis.length) dis.forEach(function (d) { lines.push("Disallow: " + (d[0] === "/" ? d : "/" + d)); }); else lines.push("Allow: /");
      $$("input[name=bot]:checked", r).forEach(function (b) { lines.push("", "User-agent: " + b.value, "Disallow: /"); });
      if (dom) lines.push("", "Sitemap: " + (/^https?:/.test(dom) ? dom : "https://" + dom) + "/sitemap.xml");
      $("#b-robots", r).textContent = lines.join("\n") + "\n";
      var base = dom ? (/^https?:/.test(dom) ? dom : "https://" + dom) : "https://example.com", today = new Date().toISOString().slice(0, 10), freq = $("#b-freq", r).value;
      var urls = $("#b-urls", r).value.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (!urls.length) urls = ["/"];
      var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(function (u) {
        var loc = /^https?:/.test(u) ? u : base + (u[0] === "/" ? u : "/" + u);
        return "  <url><loc>" + esc(loc) + "</loc><lastmod>" + today + "</lastmod><changefreq>" + freq + "</changefreq></url>";
      }).join("\n") + "\n</urlset>\n";
      $("#b-sitemap", r).textContent = xml;
      $("#b-count", r).textContent = urls.length + (urls.length === 1 ? " URL" : " URLs");
    });
    $("#b-dl-robots", r).addEventListener("click", function () { download("robots.txt", $("#b-robots", r).textContent); });
    $("#b-dl-sitemap", r).addEventListener("click", function () { download("sitemap.xml", $("#b-sitemap", r).textContent, "application/xml"); });
  };

  /* 13. Website valuation */
  T.valuation = function (r) {
    on(r, function () {
      var profit = num("#x-profit"), m = 30, notes = [];
      var age = num("#x-age"); if (age < 1) { m -= 8; notes.push("Under a year old: buyers discount unproven history."); } else if (age < 2) m -= 4; else if (age >= 3) { m += 4; notes.push("Three-plus years of history supports a higher multiple."); }
      var trend = $("#x-trend", r).value; if (trend === "down") { m -= 8; notes.push("Declining traffic is the biggest single discount."); } else if (trend === "up") { m += 6; notes.push("Steady growth raises buyer confidence."); }
      var streams = num("#x-streams", 1); if (streams <= 1) { m -= 4; notes.push("One revenue stream concentrates risk."); } else if (streams >= 3) m += 3;
      var conc = num("#x-conc", 70); if (conc > 80) { m -= 4; notes.push("Over 80% of traffic from one source is a key risk."); }
      var hrs = num("#x-hours"); if (hrs > 20) { m -= 3; notes.push("High owner workload lowers the price; document and delegate."); }
      if ($("#x-docs", r).checked) m += 2; else notes.push("Written processes and clean records typically lift offers.");
      m = Math.max(12, Math.min(60, m));
      var lo = Math.max(10, m - 4), hi = m + 4;
      $("#x-range", r).textContent = money(profit * lo) + " – " + money(profit * hi);
      $("#x-mult", r).textContent = lo + "× to " + hi + "× average monthly profit (" + (lo / 12).toFixed(1) + "× to " + (hi / 12).toFixed(1) + "× annual)";
      $("#x-notes", r).innerHTML = notes.length ? notes.map(function (n) { return "<li>" + n + "</li>"; }).join("") : "<li>No major risk flags from your answers.</li>";
      var hid = doc.getElementById("x-estimate-field"); if (hid) hid.value = $("#x-range", r).textContent + " (" + lo + "–" + hi + "× monthly profit of " + money(profit) + ")";
    });
  };

  /* 14. Digital legacy planner */
  T.legacy = function (r) {
    var key = "wl-legacy", body = $("#l-rows", r), items = [];
    try { items = JSON.parse(store.get(key) || "[]"); } catch (e) { items = []; }
    var TYPES = ["Domain", "Website", "Hosting", "Email", "Social media", "Payments or bank", "Cloud storage", "Password manager", "Other"];
    var ACTIONS = ["Keep running", "Transfer to someone", "Sell", "Archive then close", "Close"];
    function save() { store.set(key, JSON.stringify(items)); $("#l-count", r).textContent = items.length + (items.length === 1 ? " item" : " items") + " saved in this browser"; }
    function opt(list, v) { return list.map(function (x) { return "<option" + (x === v ? " selected" : "") + ">" + x + "</option>"; }).join(""); }
    function render() {
      body.innerHTML = items.length ? items.map(function (it, i) {
        return '<tr data-i="' + i + '"><td><select aria-label="Type" data-k="type">' + opt(TYPES, it.type) + '</select></td><td><input aria-label="Name or address" data-k="name" value="' + esc(it.name || "") + '"></td><td><input aria-label="Provider" data-k="provider" value="' + esc(it.provider || "") + '"></td><td><input type="date" aria-label="Renewal date" data-k="renew" value="' + esc(it.renew || "") + '"></td><td><select aria-label="What should happen" data-k="action">' + opt(ACTIONS, it.action) + '</select></td><td><input aria-label="Who and notes" data-k="notes" value="' + esc(it.notes || "") + '"></td><td><button type="button" class="badge bad" data-del style="border:0;cursor:pointer">Remove</button></td></tr>';
      }).join("") : '<tr><td colspan="7" class="muted">No items yet. Add your first domain or account.</td></tr>';
      save();
    }
    body.addEventListener("input", function (e) { var tr = e.target.closest("tr"), k = e.target.getAttribute("data-k"); if (!tr || !k) return; items[+tr.getAttribute("data-i")][k] = e.target.value; save(); });
    body.addEventListener("change", function (e) { var tr = e.target.closest("tr"), k = e.target.getAttribute("data-k"); if (!tr || !k) return; items[+tr.getAttribute("data-i")][k] = e.target.value; save(); });
    body.addEventListener("click", function (e) { if (e.target.hasAttribute("data-del")) { items.splice(+e.target.closest("tr").getAttribute("data-i"), 1); render(); } });
    $("#l-add", r).addEventListener("click", function () { items.push({ type: "Domain", action: "Keep running" }); render(); var last = body.querySelector("tr:last-child input"); last && last.focus(); });
    $("#l-export", r).addEventListener("click", function () { download("digital-legacy-plan.json", JSON.stringify({ created: new Date().toISOString(), items: items }, null, 2), "application/json"); });
    $("#l-import", r).addEventListener("change", function (e) { var f = e.target.files[0]; if (!f) return; f.text().then(function (t) { try { var d = JSON.parse(t); items = Array.isArray(d) ? d : (d.items || []); render(); } catch (x) { alert("That file isn't a Web.Life legacy plan export."); } }); });
    $("#l-clear", r).addEventListener("click", function () { if (confirm("Remove every item saved in this browser?")) { items = []; render(); } });
    render();
  };

  $$("[data-tool]").forEach(function (el) { var fn = T[el.getAttribute("data-tool")]; if (fn) { try { fn(el); } catch (e) { console.error("Tool error:", e); } } });
})();
