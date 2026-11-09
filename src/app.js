/* Salama Agents app: router, readiness check, report, AI brief, documents and the
 * founder's pipeline. Runs in three modes: inside a claude.ai artifact (db + Claude on
 * the viewer's account), standalone with Supabase (production), or local only.
 * Every piece of user or model text is set with textContent. No innerHTML. */
(function () {
  "use strict";
  var C = window.SALAMA_CONTENT, E = window.SalamaEngine, RD = window.SalamaRedact, ST = window.SALAMA_STANDARD;
  var CFG = Object.assign({
    supabaseUrl: "", supabaseAnonKey: "", publicUrl: "", bookingUrl: "", whatsapp: "", contactEmail: "",
    legalEntity: "[Legal entity name]", privacyEmail: "[privacy email]", odpcNumber: "[pending]", euRep: "[not yet appointed]",
    region: "[EU, Frankfurt]", hostName: "[website host]", aiTerms: "[Confirm Anthropic's commercial terms on training and retention before launch.]",
    partners: {}, heroVariant: "", consentVersion: "c1-2026-10-19", repoUrl: ""
  }, window.SALAMA_CONFIG || {});

  // ---------- storage (per-viewer conveniences only; every call guarded) ----------
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("salama:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("salama:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del: function (k) { try { localStorage.removeItem("salama:" + k); } catch (e) { /* ignore */ } }
  };
  var DRAFT_TTL = 72 * 3600 * 1000;
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var hx = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return hx.slice(0, 8) + "-" + hx.slice(8, 12) + "-" + hx.slice(12, 16) + "-" + hx.slice(16, 20) + "-" + hx.slice(20);
  }

  // ---------- state ----------
  var navLang = (navigator.language || "en").toLowerCase().indexOf("sw") === 0 ? "sw" : "en";
  var state = {
    lang: LS.get("lang", navLang),
    answers: {}, step: 0, shared: false, localOnly: false,
    report: null, assessmentId: null, brief: null, submitted: false,
    sessionId: uuid(), // memory only, never stored
    ref: null, variant: null, view: "home", adminExample: false
  };
  (function initRef() {
    var q = "";
    try { q = new URLSearchParams(location.search).get("ref") || ""; } catch (e) { q = ""; }
    q = q.toLowerCase();
    if (q) { state.ref = /^[a-z0-9-]{3,24}$/.test(q) ? q : "other"; LS.set("ref", state.ref); }
    else state.ref = LS.get("ref", null);
    state.variant = CFG.heroVariant || LS.get("variant", null) || (Math.random() < 0.5 ? "A" : "B");
    LS.set("variant", state.variant);
  })();

  // ---------- DOM helpers ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") Object.assign(el.style, v);
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  var SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  function $(id) { return document.getElementById(id); }
  // Null-safe replaceChildren: skips null/false and flattens arrays (replaceChildren would print "null").
  function ap(el) { for (var i = 1; i < arguments.length; i++) add(el, arguments[i]); return el; }
  function rc(el) { el.textContent = ""; for (var i = 1; i < arguments.length; i++) add(el, arguments[i]); return el; }
  function ui() { return C.ui[state.lang] || C.ui.en; }
  function t(key, vars) {
    var str = ui()[key];
    if (str == null) str = C.ui.en[key];
    if (str == null) str = key;
    return E.fill(str, Object.assign({ legalEntity: CFG.legalEntity, privacyEmail: CFG.privacyEmail }, vars || {}));
  }
  function toast(msg) { var el = $("toast"); el.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(function () { el.textContent = ""; }, 3200); }
  function announce(msg) { var el = $("live"); el.textContent = ""; setTimeout(function () { el.textContent = msg; }, 30); }
  // Text with [TOKEN_n] labels shown as redaction tape.
  function tokenText(text) {
    var frag = document.createDocumentFragment();
    String(text).split(/(\[[A-Z]+_\d+\])/).forEach(function (part) {
      if (/^\[[A-Z]+_\d+\]$/.test(part)) frag.appendChild(h("span", { class: "tok", text: part }));
      else if (part) frag.appendChild(document.createTextNode(part));
    });
    return frag;
  }
  function copyText(text, btn) {
    function fallback() { toast(t("copy_fail")); }
    try {
      navigator.clipboard.writeText(text).then(function () { toast(t("copied")); if (btn) btn.textContent = t("copied"); }, fallback);
    } catch (e) { fallback(); }
  }

  // ---------- logo, seal and band icons (inline SVG, theme tokens) ----------
  function logo(size) {
    size = size || 28;
    return s("svg", { width: size, height: size, viewBox: "0 0 32 32", "aria-hidden": "true" },
      s("rect", { x: "2", y: "2", width: "28", height: "28", rx: "7", fill: "var(--forest)" }),
      s("rect", { x: "8", y: "10", width: "16", height: "4", rx: "1", fill: "var(--tape)" }),
      s("rect", { x: "8", y: "18", width: "10", height: "4", rx: "1", fill: "var(--forest-ink)" }));
  }
  function seal(size) {
    size = size || 120;
    var id = "arc" + Math.random().toString(36).slice(2, 7);
    return s("svg", { width: size, height: size, viewBox: "0 0 120 120", role: "img", "aria-label": "SAFE-A standard, version 0.1" },
      s("defs", {}, s("path", { id: id, d: "M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" })),
      s("circle", { cx: "60", cy: "60", r: "56", fill: "none", stroke: "var(--forest)", "stroke-width": "3" }),
      s("circle", { cx: "60", cy: "60", r: "34", fill: "var(--forest)" }),
      s("text", { "font-family": "ui-monospace, Consolas, monospace", "font-size": "9.5", "letter-spacing": "2.4", fill: "var(--forest)" },
        s("textPath", { href: "#" + id, text: "SCOPE · ANONYMISE · FENCE · EVIDENCE · ADAPT · " })),
      s("text", { x: "60", y: "58", "text-anchor": "middle", "font-family": "system-ui, sans-serif", "font-weight": "900", "font-size": "17", fill: "var(--forest-ink)", text: "SAFE-A" }),
      s("text", { x: "60", y: "74", "text-anchor": "middle", "font-family": "ui-monospace, Consolas, monospace", "font-size": "10", fill: "var(--tape)", text: "v0.1" }));
  }
  function bandIcon(id) {
    var c = "currentColor";
    var shapes = {
      foundations: [s("rect", { x: "2", y: "11", width: "14", height: "5", rx: "1", fill: c })],
      building: [s("rect", { x: "2", y: "11", width: "14", height: "5", rx: "1", fill: c }), s("rect", { x: "4", y: "5", width: "10", height: "5", rx: "1", fill: c })],
      pilot: [s("rect", { x: "3", y: "2", width: "2", height: "14", fill: c }), s("path", { d: "M5 3h10l-3 3 3 3H5z", fill: c })],
      scale: [s("rect", { x: "2", y: "11", width: "14", height: "5", rx: "1", fill: c }), s("rect", { x: "4", y: "6", width: "10", height: "4", rx: "1", fill: c }), s("rect", { x: "6", y: "1", width: "6", height: "4", rx: "1", fill: c })]
    };
    var el = s("svg", { width: "18", height: "18", viewBox: "0 0 18 18", "aria-hidden": "true" });
    (shapes[id] || []).forEach(function (x) { el.appendChild(x); });
    return el;
  }

  // =====================================================================
  // Backend adapters
  // =====================================================================
  var B = { mode: "local", ai: false, canAdmin: false, canStore: false, isArtifact: !!(window.claude && typeof window.claude.use === "function"), cap: {} };

  function sbHeaders(token, extra) {
    return Object.assign({ apikey: CFG.supabaseAnonKey, Authorization: "Bearer " + (token || CFG.supabaseAnonKey), "Content-Type": "application/json" }, extra || {});
  }
  function sbInsert(table, row) {
    return fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + table, {
      method: "POST", headers: sbHeaders(null, { Prefer: "return=minimal" }), body: JSON.stringify(row)
    }).then(function (r) { if (!r.ok) throw { code: r.status === 429 ? "rate_limited" : "store_failed", status: r.status }; });
  }

  B.init = function () {
    var hasClaude = !!(window.claude && typeof window.claude.use === "function");
    if (hasClaude) {
      B.isArtifact = true;
      var names = ["db", "user", "sample", "downloads"];
      return Promise.all(names.map(function (n) { return window.claude.use(n).catch(function () { return null; }); })).then(function (res) {
        B.cap = { db: res[0], user: res[1], sample: res[2], downloads: res[3] };
        var u = B.cap.user;
        return Promise.all([u ? u.isOwner() : false, u ? u.canEdit() : false]).then(function (r) {
          B.isOwner = !!r[0]; B.canEdit = !!r[1];
          B.canStore = !!B.cap.db && (B.isOwner || B.canEdit);
          B.canAdmin = B.canStore;
          B.ai = !!B.cap.sample;
          B.mode = B.canStore ? "artifact" : "artifact-guest";
        });
      });
    }
    if (CFG.supabaseUrl && CFG.supabaseAnonKey) { B.mode = "supabase"; B.ai = true; B.canStore = true; B.canAdmin = true; }
    else { B.mode = "local"; B.ai = false; B.canStore = false; B.canAdmin = true; }
    return Promise.resolve();
  };

  // ---- events: first-party, no persistent ids, supabase mode only ----
  var evQueue = [];
  B.event = function (name, props) {
    if (B.mode !== "supabase" || E.EVENTS.indexOf(name) < 0) return;
    props = props || {};
    evQueue.push({ session_id: state.sessionId, name: name, step: props.step || null,
      detail: props.detail ? String(props.detail).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) : null,
      ref: state.ref, lang: state.lang, variant: state.variant });
    flushEvents();
  };
  function flushEvents() {
    if (!navigator.onLine || !evQueue.length || flushEvents.busy) return;
    flushEvents.busy = true;
    var batch = evQueue.splice(0, 20);
    sbInsert("events", batch).catch(function () { evQueue = batch.concat(evQueue).slice(-200); })
      .then(function () { flushEvents.busy = false; });
  }

  // ---- assessments (with an offline outbox that never holds contact details) ----
  B.submitAssessment = function (rec, report) {
    if (state.localOnly) return Promise.resolve("local");
    if (B.mode === "supabase") {
      return sbInsert("assessments", rec).then(function () { return "sent"; }, function (e) {
        if (!state.shared) { var ob = LS.get("outbox", []); ob.push(rec); LS.set("outbox", ob.slice(-10)); }
        else B._memOutbox = (B._memOutbox || []).concat([rec]);
        throw e;
      });
    }
    if (B.mode === "artifact") {
      return B.cap.db.doc("assessments/" + rec.id).set({
        created: new Date().toISOString(), source: "artifact", lang: rec.lang, ref: rec.ref || null, variant: rec.variant,
        answers: rec.answers, task_text: rec.task_text, client_score: rec.client_score, consent_report: rec.consent_report,
        status: "new", contact: null, feedback: null, brief: null
      }).then(function () { return "sent"; });
    }
    // local mode: keep a copy on this device for the founder's test view (never on a shared device)
    if (!state.shared) { var list = LS.get("local_submissions", []); list.unshift({ rec: rec, created: new Date().toISOString() }); LS.set("local_submissions", list.slice(0, 50)); }
    return Promise.resolve("local");
  };
  function flushOutbox() {
    if (B.mode !== "supabase" || !navigator.onLine) return;
    var ob = LS.get("outbox", []);
    if (!ob.length) return;
    LS.set("outbox", []);
    ob.forEach(function (rec) { sbInsert("assessments", rec).catch(function () { var cur = LS.get("outbox", []); cur.push(rec); LS.set("outbox", cur); }); });
  }

  B.canSendContact = function () { return B.mode === "supabase" || B.mode === "artifact"; };
  B.submitContact = function (c) {
    if (B.mode === "supabase") return sbInsert("contacts", c);
    if (B.mode === "artifact") return B.cap.db.doc("assessments/" + c.assessment_id).update({ contact: c });
    return Promise.reject({ code: "unavailable" });
  };
  B.submitFeedback = function (f) {
    if (B.mode === "supabase") return sbInsert("feedback", f);
    if (B.mode === "artifact") return B.cap.db.doc("assessments/" + f.assessment_id).update({ feedback: { rating: f.rating, comment: f.comment } });
    return Promise.resolve();
  };

  // ---- AI brief ----
  B.brief = function (report, assessmentId, signal) {
    if (B.mode === "artifact" || B.mode === "artifact-guest") {
      var p = E.prompt(report);
      return B.cap.sample.json(p.combined, { signal: signal }).then(function (raw) { return raw; }, function (e) {
        if (e && e.code === "invalid_json" && e.text) return e.text;
        throw e;
      }).then(function (raw) {
        var v = E.validateBrief(raw, report);
        if (!v.ok) throw { code: "invalid" };
        if (B.mode === "artifact" && assessmentId) B.cap.db.doc("assessments/" + assessmentId).update({ brief: v.brief }).catch(function () { /* brief stays on screen */ });
        return v.brief;
      });
    }
    if (B.mode === "supabase") {
      return fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/functions/v1/brief", {
        method: "POST", headers: sbHeaders(), body: JSON.stringify({ kind: "brief", assessment_id: assessmentId, lang: report.lang }), signal: signal
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.brief) throw { code: r.status === 429 ? "rate_limited" : r.status === 503 ? "disabled" : "upstream_error" };
          return j.brief;
        });
      }, function (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "upstream_error" }; });
    }
    return Promise.reject({ code: "unavailable" });
  };

  // ---- downloads ----
  B.download = function (filename, text) {
    if (B.isArtifact) {
      if (!B.cap.downloads) return Promise.reject({ code: "unavailable" });
      return B.cap.downloads.save({ filename: filename, data: text });
    }
    var url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    var a = h("a", { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return Promise.resolve();
  };

  // =====================================================================
  // Router and chrome
  // =====================================================================
  var VIEWS = ["home", "check", "report", "standard", "case", "privacy", "admin"];
  function currentView() {
    var hsh = (location.hash || "").replace(/^#/, "");
    return VIEWS.indexOf(hsh) >= 0 ? hsh : "home";
  }
  function go(view) {
    if (location.hash !== "#" + view) location.hash = view; else render();
  }
  function render() {
    var v = currentView();
    if (v === "report" && !state.report) v = "check";
    state.view = v;
    VIEWS.forEach(function (name) { $("v-" + name).hidden = name !== v; });
    document.documentElement.lang = state.lang;
    renderChrome();
    var fn = { home: renderHome, check: renderCheck, report: renderReport, standard: renderStandard, case: renderCase, privacy: renderPrivacy, admin: renderAdmin }[v];
    fn();
    if (v !== "check") document.title = (v === "home" ? "" : navLabel(v) + " · ") + "Salama Agents";
    B.event("page_view", { detail: v });
  }
  function navLabel(v) {
    return { check: t("nav_check"), report: t("rep_eyebrow"), standard: t("nav_standard"), case: t("nav_case"), privacy: t("nav_privacy"), admin: t("nav_pipeline") }[v] || "";
  }
  function renderChrome() {
    var brand = $("brand"); rc(brand, logo(28), h("span", { text: "Salama Agents" }));
    var nav = $("nav"); rc(nav, );
    [["check", t("nav_check")], ["standard", t("nav_standard")], ["case", t("nav_case")]].concat(
      B.isArtifact && B.canAdmin ? [["admin", t("nav_pipeline")]] : []
    ).forEach(function (it) {
      nav.appendChild(h("a", { href: "#" + it[0], "aria-current": state.view === it[0] || (it[0] === "check" && state.view === "report") ? "page" : null, text: it[1] }));
    });
    var lb = $("lang-btn");
    rc(lb, t("lang_other"), ui().lang_beta ? h("small", { text: " (" + ui().lang_beta + ")" }) : null);
    lb.setAttribute("lang", ui().lang_other_code);
    lb.setAttribute("aria-label", ui().lang_other_code === "sw" ? "Badilisha lugha kuwa Kiswahili" : "Switch language to English");
    var foot = $("foot");
    rc(foot, 
      h("div", { class: "stack" }, h("span", { text: t("footer_line") }), h("span", { class: "small", text: t("open_licence") }), h("span", { class: "small", text: t("footer_beta") })),
      h("div", { class: "row" },
        h("a", { href: "#privacy", text: t("nav_privacy") }),
        h("a", { href: "#standard", text: t("nav_standard") }),
        CFG.repoUrl ? h("a", { href: CFG.repoUrl, target: "_blank", rel: "noopener", text: t("open_source") }) : null,
        !B.isArtifact ? h("a", { href: "#admin", text: t("footer_team") }) : null));
    $("skip").textContent = state.lang === "sw" ? "Ruka hadi maudhui" : "Skip to content";
  }
  $("lang-btn").addEventListener("click", function () {
    state.lang = state.lang === "sw" ? "en" : "sw";
    LS.set("lang", state.lang);
    if (state.report) state.report = E.build(state.report.answers, state.lang, { date: state.report.date, extra: { ref: state.ref } });
    B.event("lang_toggle", { detail: state.lang });
    render();
    $("lang-btn").focus();
  });
  window.addEventListener("hashchange", function () {
    window.scrollTo(0, 0);
    render();
    var target = !$("v-report").hidden && $("rep-h") ? $("rep-h") : !$("v-check").hidden && $("step-h") ? $("step-h") : $("main");
    if (target) target.focus({ preventScroll: true });
  });
  window.addEventListener("online", function () { flushEvents(); flushOutbox(); });

  // =====================================================================
  // Home
  // =====================================================================
  function renderHome() {
    var root = $("v-home");
    rc(root, );
    var partner = state.ref && CFG.partners[state.ref];
    var demoIn = h("textarea", { id: "demo-in", spellcheck: "false", "aria-describedby": "demo-limit" });
    demoIn.value = t("demo_sample");
    var demoOut = h("div", { class: "demo-out", id: "demo-out", "aria-live": "polite" });
    var count = h("span", { class: "count" });
    function runDemo() {
      var r = RD.redact(demoIn.value);
      rc(demoOut, tokenText(r.text));
      count.textContent = t("demo_count", { n: r.count });
    }
    var used = false;
    var hideBtn = h("button", { type: "button", class: "btn sm", onclick: function () { runDemo(); if (!used) { used = true; B.event("demo_used"); } } }, t("demo_btn"));
    runDemo();
    var heroTitle = state.variant === "B" ? t("heroB_title") : t("heroA_title");

    root.appendChild(h("div", { class: "wrap" },
      partner ? h("p", { class: "partner", text: t("partner_banner", { partner: partner }) }) : null,
      h("div", { class: "hero" },
        h("div", { class: "hero-copy" },
          h("p", { class: "eyebrow", text: t("hero_eyebrow") }),
          h("h1", { text: heroTitle }),
          h("p", { class: "lead", text: t("hero_sub") }),
          h("div", { class: "hero-cta" },
            h("a", { class: "btn", href: "#check", onclick: function () { B.event("cta_click", { detail: "hero_check_" + state.variant }); } }, t("cta_check")),
            h("span", { class: "small muted", text: t("cta_meta") }),
            h("a", { href: "#standard", text: t("cta_standard") }))),
        h("div", { class: "demo", role: "group", "aria-labelledby": "demo-title" },
          h("h2", { id: "demo-title", class: "", style: { fontSize: "1.25rem" }, text: t("demo_title") }),
          h("p", { class: "small muted", text: t("demo_lead") }),
          h("label", { for: "demo-in", text: t("demo_in") }), demoIn,
          h("div", { class: "row" }, hideBtn,
            h("button", { type: "button", class: "linkbtn", onclick: function () { demoIn.value = t("demo_sample"); runDemo(); } }, t("demo_reset"))),
          h("div", { class: "demo-meta" }, h("strong", { text: t("demo_out") }), count),
          demoOut,
          h("p", { class: "small muted", id: "demo-limit", text: t("demo_limit") })))));

    root.appendChild(h("div", { class: "band-sec" }, h("div", { class: "wrap" },
      h("div", { class: "sec-head" }, h("p", { class: "eyebrow", text: "SAFE-A v0.1" }), h("h2", { text: t("pillars_title") }), h("p", { class: "lead", text: t("pillars_sub") })),
      h("div", { class: "pillars" }, C.pillars.map(function (p, i) {
        var letter = ["S", "A", "F", "E", "A"][i];
        return h("div", { class: "pillar" },
          h("span", { class: "letter", "aria-hidden": "true" }, i === 4 ? h("i", { text: letter }) : letter),
          h("h3", { text: E.tr(p.name, state.lang) }),
          h("p", { class: "small muted", text: E.tr(p.desc, state.lang) }));
      })))));

    root.appendChild(h("div", { class: "band-sec alt" }, h("div", { class: "wrap" },
      h("div", { class: "sec-head" }, h("h2", { text: t("agents_title") }), h("p", { class: "lead", text: t("agents_sub") })),
      h("div", { class: "agents" }, C.agents.map(function (ag) {
        return h("div", { class: "agent-row" },
          h("div", {}, h("h3", { text: E.tr(ag.name, state.lang) }), h("p", { class: "small", text: E.tr(ag.who, state.lang) })),
          h("p", { text: E.fill(E.tr(ag.desc, state.lang), { curriculum: state.lang === "sw" ? "mtaala wa kitaifa" : "the national curriculum" }) }),
          h("span", { class: "tier " + ag.tier, text: t("tier_" + ag.tier) }));
      })))));

    root.appendChild(h("div", { class: "band-sec" }, h("div", { class: "wrap" },
      h("div", { class: "sec-head" }, h("h2", { text: t("how_title") })),
      h("ol", { class: "steps3", style: { listStyle: "none", padding: "0", margin: "0" } }, [1, 2, 3].map(function (n) {
        return h("li", { class: "card" }, h("span", { class: "num", text: "0" + n }), h("h3", { text: t("how_" + n + "_t") }), h("p", { class: "muted", text: t("how_" + n + "_d") }));
      })))));

    root.appendChild(h("div", { class: "band-sec alt" }, h("div", { class: "wrap" },
      h("div", { class: "proof" }, seal(110), h("div", { class: "stack" }, h("h2", { text: t("proof_title") }), h("p", { class: "lead", text: t("proof_body") }))))));

    root.appendChild(h("div", { class: "band-sec" }, h("div", { class: "wrap" },
      h("div", { class: "open-grid" },
        h("div", { class: "stack" }, h("p", { class: "eyebrow", text: "CC BY 4.0 · Apache-2.0" }), h("h2", { text: t("open_title") }), h("p", { class: "lead", text: t("open_body") }),
          CFG.repoUrl ? h("p", {}, h("a", { href: CFG.repoUrl, target: "_blank", rel: "noopener", text: t("open_source") })) : null),
        h("ul", { class: "list-check open-list" }, t("open_points").split("|").map(function (x) { return h("li", { text: x }); }))))));

    root.appendChild(h("div", { class: "band-sec alt" }, h("div", { class: "wrap" },
      h("div", { class: "cta-band" },
        h("div", { class: "stack" }, h("h2", { text: t("cta_band_title") }), h("p", { class: "muted", text: t("cta_band_body") })),
        h("a", { class: "btn", href: "#check", onclick: function () { B.event("cta_click", { detail: "band_check" }); } }, t("cta_check"))))));
  }

  // =====================================================================
  // Readiness check
  // =====================================================================
  function saveDraft() {
    if (state.shared) return;
    var a = Object.assign({}, state.answers);
    LS.set("draft", { at: Date.now(), step: state.step, answers: a, localOnly: state.localOnly });
  }
  function loadDraft() {
    var d = LS.get("draft", null);
    if (!d || !d.at || Date.now() - d.at > DRAFT_TTL) { LS.del("draft"); return null; }
    return d;
  }
  function clearDevice() {
    ["draft", "result", "outbox", "local_submissions"].forEach(LS.del);
    B.event("clear_device");
  }
  function steps() { return E.stepsFor(state.answers); }
  function ctx() { return E.context(state.answers, state.lang); }

  function renderCheck() {
    var root = $("v-check");
    rc(root, );
    var wrap = h("div", { class: "wrap" }, h("div", { class: "check", id: "check-box" }));
    root.appendChild(wrap);
    if (state.step === 0) renderIntro(); else if (state.step === "funder") renderFunder(); else renderStep();
  }

  function renderIntro() {
    var box = $("check-box");
    document.title = t("check_intro_title") + " · Salama Agents";
    var draft = loadDraft();
    var shared = h("input", { type: "checkbox", id: "t-shared" }); shared.checked = state.shared;
    var local = h("input", { type: "checkbox", id: "t-local" }); local.checked = !!state.localOnly;
    ap(box, 
      h("div", { class: "step-head" }, h("p", { class: "eyebrow", text: "SAFE-A" }), h("h1", { tabindex: "-1", id: "step-h", text: t("check_intro_title") }), h("p", { class: "lead", text: t("check_intro_body") })),
      draft && !state.shared ? h("div", { class: "resume" },
        h("strong", { text: t("resume_title") }),
        h("div", { class: "row" },
          h("button", { type: "button", class: "btn sm", onclick: function () { state.answers = draft.answers || {}; state.step = Math.max(1, draft.step || 1); state.localOnly = !!draft.localOnly; B.event("check_start", { detail: "resume" }); renderCheck(); } }, t("resume")),
          h("button", { type: "button", class: "btn sm quiet", onclick: function () { LS.del("draft"); state.answers = {}; renderCheck(); } }, t("start_fresh")))) : null,
      h("p", { class: "note" }, t("notice_short") + " ", h("a", { href: "#privacy", text: t("notice_link") })),
      h("div", { class: "toggles" },
        h("label", { class: "toggle", for: "t-shared" }, shared, h("span", { text: t("shared_label") })),
        h("label", { class: "toggle", for: "t-local" }, local, h("span", { text: t("keep_local_label") }))),
      h("button", { type: "button", class: "btn", id: "start-btn", onclick: function () {
        state.shared = shared.checked; state.localOnly = local.checked;
        if (state.shared) LS.del("draft");
        state.step = 1; state.answers = state.answers || {};
        B.event("check_start", { detail: state.ref ? "partner" : "direct" });
        renderCheck();
      } }, t("start")));
    focusHeading();
  }

  function focusHeading() { var el = $("step-h"); if (el) el.focus({ preventScroll: false }); }

  function renderStep() {
    var box = $("check-box");
    var list = steps();
    var idx = Math.min(state.step, list.length) - 1;
    var st = list[idx];
    var c = ctx();
    var total = C.steps.length;
    document.title = t("step_of", { a: idx + 1, b: total }) + ": " + E.tr(st.title, state.lang) + " · Salama Agents";

    var prog = h("div", { class: "progress", "aria-hidden": "true" });
    for (var i = 0; i < total; i++) prog.appendChild(h("span", { class: i < idx ? "done" : i === idx ? "now" : "" }));
    var saved = h("span", { text: state.shared ? t("not_saved") : t("saved_device") });

    var form = h("form", { novalidate: true, id: "step-form", onsubmit: function (ev) { ev.preventDefault(); next(); } });
    var errBox = h("div", { class: "err-summary", id: "err-summary", tabindex: "-1", role: "alert", hidden: true });
    form.appendChild(errBox);
    E.visibleQuestions(st, state.answers, c).forEach(function (q) { form.appendChild(renderQuestion(q, c)); });

    ap(box, 
      prog,
      h("div", { class: "step-meta" }, h("span", { text: t("step_of", { a: idx + 1, b: total }) }), saved),
      h("div", { class: "step-head" },
        h("h2", { tabindex: "-1", id: "step-h", text: E.tr(st.title, state.lang) }),
        h("p", { class: "muted", text: E.tr(st.intro, state.lang) }),
        st.note ? h("p", { class: "note", text: t(st.note) }) : null),
      form,
      h("div", { class: "check-nav" },
        h("button", { type: "button", class: "btn quiet", onclick: back }, t("back")),
        h("button", { type: "submit", class: "btn", form: "step-form" }, idx + 1 === total ? t("finish") : t("next"))),
      h("p", { class: "small" }, h("button", { type: "button", class: "linkbtn", onclick: function () {
        clearDevice(); state.answers = {}; state.step = 0; toast(t("cleared")); renderCheck();
      } }, t("clear_device"))));
  }

  function optLabel(o, c) { return E.fill(E.tr(o, state.lang), c.vars); }

  function renderQuestion(q, c) {
    var label = E.fill(E.tr(q.label, state.lang), c.vars);
    var fs = h("fieldset", { class: "q", id: "q-" + q.id, "aria-describedby": "err-" + q.id });
    var legendKids = [label];
    if (q.optional && q.type !== "checkbox") legendKids.push(h("span", { class: "opt-tag", text: " · " + t("optional") }));
    fs.appendChild(h("legend", {}, legendKids));
    var helpKey = q.help;
    var helpText = helpKey ? t(helpKey) : "";
    if (q.type === "multi" && q.max) helpText = t("pick_up_to", { n: q.max });
    if (helpText && q.type !== "checkbox") fs.appendChild(h("p", { class: "q-help", id: "help-" + q.id, text: helpText }));
    var val = state.answers[q.id];

    if (q.type === "single" || q.type === "multi") {
      var multi = q.type === "multi";
      var grid = h("div", { class: "opts" });
      var counter = multi && q.max ? h("p", { class: "counter", id: "count-" + q.id, "aria-live": "polite" }) : null;
      q.options.forEach(function (o) {
        var id = "q_" + q.id + "_" + o.v;
        var checked = multi ? Array.isArray(val) && val.indexOf(o.v) >= 0 : val === o.v;
        var input = h("input", { type: multi ? "checkbox" : "radio", name: "q_" + q.id, id: id, value: o.v });
        input.checked = checked;
        var lab = h("label", { class: "opt" + (checked ? " on" : ""), for: id }, input, h("span", { text: optLabel(o, c) }));
        input.addEventListener("change", function () {
          if (multi) {
            var cur = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
            if (input.checked) {
              if (q.max && cur.length >= q.max) { input.checked = false; announce(t("max_reached", { n: q.max })); toast(t("max_reached", { n: q.max })); return; }
              cur.push(o.v);
            } else cur = cur.filter(function (x) { return x !== o.v; });
            state.answers[q.id] = cur;
            lab.classList.toggle("on", input.checked);
            if (counter) counter.textContent = t("chosen", { a: cur.length, b: q.max });
          } else {
            state.answers[q.id] = o.v;
            grid.querySelectorAll(".opt").forEach(function (l) { l.classList.remove("on"); });
            lab.classList.add("on");
          }
          fs.classList.remove("has-error");
          saveDraft();
          if (!multi) maybeRerender(q.id, id);
        });
        grid.appendChild(lab);
      });
      fs.appendChild(grid);
      if (counter) { counter.textContent = t("chosen", { a: Array.isArray(val) ? val.length : 0, b: q.max }); fs.appendChild(counter); }
    } else if (q.type === "select") {
      var sel = h("select", { id: "q_" + q.id, "aria-labelledby": "q-" + q.id });
      sel.appendChild(h("option", { value: "", text: t("select_country") }));
      C.countries.forEach(function (grp) {
        var og = h("optgroup", { label: grp[0] });
        grp[1].forEach(function (cc) { var op = h("option", { value: cc[0], text: cc[1] }); if (val === cc[0]) op.selected = true; og.appendChild(op); });
        sel.appendChild(og);
      });
      sel.addEventListener("change", function () { state.answers[q.id] = sel.value || undefined; fs.classList.remove("has-error"); saveDraft(); });
      fs.appendChild(sel);
    } else if (q.type === "textarea") {
      var ta = h("textarea", { id: "q_" + q.id, maxlength: String(q.maxLength || 280), "aria-describedby": "help-" + q.id + " prev-" + q.id });
      ta.value = val || "";
      var cnt = h("p", { class: "counter" });
      var prev = h("div", { class: "preview", id: "prev-" + q.id, "aria-live": "polite" });
      function upd() {
        cnt.textContent = ta.value.length + " / " + (q.maxLength || 280);
        var cl = E.cleanNote(ta.value, q.maxLength || 280);
        rc(prev, h("strong", { text: t("redact_preview") + ": " }), cl.text ? tokenText(cl.text) : h("span", { class: "muted", text: "-" }));
      }
      var deb;
      ta.addEventListener("input", function () { state.answers[q.id] = ta.value; clearTimeout(deb); deb = setTimeout(function () { upd(); saveDraft(); }, 250); });
      upd();
      ap(fs, ta, cnt, prev);
    } else if (q.type === "checkbox") {
      var cb = h("input", { type: "checkbox", id: "q_" + q.id });
      cb.checked = !!val;
      cb.addEventListener("change", function () { state.answers[q.id] = cb.checked; saveDraft(); });
      rc(fs, h("legend", { class: "sr", text: t("optional") }),
        h("label", { class: "toggle", for: "q_" + q.id }, cb, h("span", {}, label, h("br"), h("span", { class: "small muted", text: t(q.help || "consent_helper") }))));
    }
    fs.appendChild(h("p", { class: "q-err", id: "err-" + q.id, text: t("err_required") }));
    return fs;
  }

  // Re-render the step when an answer changes which questions are visible, keeping focus.
  var TRIGGERS = ["org_type", "ai_use", "report_days", "country"];
  function maybeRerender(qid, focusId) {
    if (TRIGGERS.indexOf(qid) < 0) return;
    var y = window.scrollY;
    renderCheck();
    window.scrollTo(0, y);
    var el = $(focusId); if (el) el.focus({ preventScroll: true });
  }

  function next() {
    var list = steps();
    var st = list[state.step - 1];
    var miss = E.missing(st, state.answers, ctx());
    document.querySelectorAll("fieldset.q").forEach(function (f) { f.classList.remove("has-error"); });
    var err = $("err-summary");
    if (miss.length) {
      miss.forEach(function (id) { var f = $("q-" + id); if (f) f.classList.add("has-error"); });
      err.hidden = false;
      rc(err, h("p", { text: t("err_summary", { n: miss.length }) }),
        h("ul", {}, miss.map(function (id) {
          var q = E.questions[id];
          return h("li", {}, h("a", { href: "#q-" + id, onclick: function (ev) { ev.preventDefault(); var f = $("q-" + id); var inp = f && f.querySelector("input,select,textarea"); if (inp) inp.focus(); } },
            E.fill(E.tr(q.label, state.lang), ctx().vars)));
        })));
      err.focus();
      return;
    }
    B.event("step_done", { step: state.step });
    if (st.id === "about" && state.answers.org_type === "funder") { state.step = "funder"; B.event("funder_route"); renderCheck(); return; }
    if (state.step >= list.length) { finish(); return; }
    state.step += 1; saveDraft(); renderCheck(); window.scrollTo(0, 0); focusHeading();
  }
  function back() {
    if (state.step === "funder") state.step = 1;
    else if (state.step <= 1) state.step = 0;
    else state.step -= 1;
    renderCheck(); window.scrollTo(0, 0); focusHeading();
  }

  function finish() {
    var rep = E.build(state.answers, state.lang, { extra: { ref: state.ref } });
    var note = E.cleanNote(state.answers.pain_text || "", 280);
    state.assessmentId = uuid();
    var rec = {
      id: state.assessmentId, schema_version: C.schemaVersion, lang: state.lang, ref: state.ref, variant: state.variant,
      answers: rep.answers, task_text: note.text || null, client_score: rep.score.readiness, consent_report: !!state.answers.consent_report
    };
    state.report = rep; state.brief = null; state.submitted = false;
    LS.del("draft");
    if (!state.shared) LS.set("result", { id: rec.id, answers: rep.answers, lang: rep.lang, date: rep.date, localOnly: state.localOnly });
    B.submitAssessment(rec, rep).then(function (r) { state.submitted = r === "sent"; }, function () { state.submitted = false; });
    B.event("report_view", { detail: rep.score.band.id });
    state.step = 0;
    go("report");
  }

  function renderFunder() {
    var box = $("check-box");
    ap(box, 
      h("div", { class: "step-head" }, h("h2", { tabindex: "-1", id: "step-h", text: t("funder_title") }), h("p", { class: "lead", text: t("funder_body") })),
      contactCard(null, "funder"),
      h("div", { class: "check-nav" }, h("button", { type: "button", class: "btn quiet", onclick: back }, t("back"))));
    focusHeading();
  }

  // =====================================================================
  // Report
  // =====================================================================
  function section(title, kids, cls) {
    return h("section", { class: "card " + (cls || "") }, h("h2", { style: { fontSize: "1.35rem", marginBottom: "12px" }, text: title }), kids);
  }

  function renderReport() {
    var root = $("v-report");
    var r = state.report;
    rc(root, );
    var u = ui();
    var rep = h("div", { class: "report" });
    root.appendChild(h("div", { class: "wrap" }, rep));

    // header
    rep.appendChild(h("div", { class: "rep-head" },
      h("div", { class: "score-box", "aria-hidden": "true" },
        h("span", { class: "score-num", text: String(r.score.readiness) }), h("span", { class: "small muted", text: state.lang === "sw" ? "kati ya 100" : "out of 100" })),
      h("div", { class: "stack" },
        h("p", { class: "eyebrow", text: t("rep_eyebrow") }),
        h("h1", { tabindex: "-1", id: "rep-h", style: { fontSize: "clamp(1.6rem, 1.2rem + 1.8vw, 2.4rem)" }, text: t("score_line", { s: r.score.readiness, band: r.score.band.name }) }),
        h("div", { class: "row" },
          h("span", { class: "band-chip " + r.score.band.id }, bandIcon(r.score.band.id), r.score.band.name),
          r.score.stakes ? h("span", { class: "stakes", text: r.score.stakes }) : null),
        h("p", { class: "small muted", text: t("rep_for", { type: r.orgTypeLabel, country: r.ctx.countryName, date: r.date }) }),
        state.localOnly ? h("p", { class: "small", text: t("local_only_note") }) : null)));
    if (r.score.capReasons.length) rep.appendChild(h("p", { class: "cap", text: t("cap_note", { reason: r.score.capText.join("; ") }) }));
    rep.appendChild(h("p", { class: "diag", text: r.diagnosis }));
    rep.appendChild(h("p", { class: "muted", text: r.score.band.desc }));

    // pillars
    rep.appendChild(section(t("pillars_heading"), h("div", { class: "bars" }, r.score.pillars.map(function (p) {
      return h("div", { class: "bar-row" },
        h("span", { text: p.name }),
        h("div", { class: "bar", role: "img", "aria-label": p.name + ": " + p.value + " / 100" }, h("i", { style: { width: p.value + "%" } })),
        h("span", { class: "bar-val", text: String(p.value) }));
    }))));

    // strengths + unsure
    rep.appendChild(h("div", { class: "two" },
      section(t("strengths_title"), r.strengths.length ? h("ul", { class: "list-check" }, r.strengths.map(function (x) { return h("li", { text: x }); })) : h("p", { class: "muted", text: t("strengths_none") })),
      r.score.unsure ? section(t("unsure_title"), h("p", { text: t("unsure_body", { n: r.score.unsure }) })) : section(t("time_title"), timeBlock(r))));

    // fixes
    rep.appendChild(section(t("fixes_title"), h("div", { class: "fixes" }, r.fixes.map(function (f, i) {
      return h("article", { class: "fix" },
        h("h3", {}, h("span", { class: "n", text: String(i + 1).padStart(2, "0") }), h("span", { text: f.title })),
        h("p", { class: "muted", text: f.why }),
        h("p", { class: "do", text: f.fix }),
        h("div", { class: "chips" },
          h("span", { class: "chip", text: t("fix_owner") + ": " + f.owner }),
          h("span", { class: "chip", text: t("fix_cost") + ": " + f.costLabel }),
          f.points ? h("span", { class: "chip pts", text: t("fix_points", { n: f.points }) }) : null));
    }))));

    // agent
    var ag = r.agent;
    rep.appendChild(section(ag.foundations ? t("foundations_title") : t("agent_title"), [
      h("h3", { text: ag.name }),
      h("p", { text: ag.desc, style: { margin: "6px 0 10px" } }),
      h("p", { class: "eyebrow", text: t("guardrails") }),
      h("ul", { class: "list-check" }, ag.guardrails.map(function (x) { return h("li", { text: x }); })),
      ag.foundations && ag.next ? h("p", { class: "small muted", style: { marginTop: "10px" }, text: (state.lang === "sw" ? "Baada ya hapo: " : "After that: ") + ag.next.name }) : null,
      ag.blocked.map(function (b) { return h("p", { class: "small cap", style: { marginTop: "10px" }, text: b }); })
    ]));

    if (r.score.unsure) rep.appendChild(section(t("time_title"), timeBlock(r)));

    // plan
    rep.appendChild(section(t("plan_title"), [
      h("ol", { class: "plan" }, r.plan.map(function (p) { return h("li", {}, h("b", { text: t("week", { n: p.week }) }), h("span", { text: p.action })); })),
      r.planNote ? h("p", { class: "small cap", style: { marginTop: "12px" }, text: r.planNote }) : null]));

    // board and funder summary
    var reqPre = h("p", { class: "pre", id: "funder-req", text: r.board.request });
    rep.appendChild(section(t("board_title"), [
      h("div", { class: "two" },
        h("div", { class: "stack" }, h("h3", { text: t("board_decisions") }), h("ol", {}, r.board.decisions.map(function (d) { return h("li", { text: d }); }))),
        h("div", { class: "stack" }, h("h3", { text: t("board_questions") }), h("ol", {}, r.board.questions.map(function (d) { return h("li", { text: d }); })))),
      h("h3", { style: { marginTop: "16px" }, text: t("budget_line_title") }), reqPre,
      h("div", { class: "row", style: { marginTop: "8px" } }, h("button", { type: "button", class: "btn sm quiet", onclick: function (ev) { copyText(r.board.request, ev.currentTarget); B.event("copy", { detail: "funder_request" }); } }, t("copy")))]));

    // legal notes
    if (r.legal.length) rep.appendChild(section(t("legal_title"), [
      h("ul", {}, r.legal.map(function (n) { return h("li", { text: n }); })),
      h("p", { class: "small muted", style: { marginTop: "8px" }, text: t("legal_note") })]));

    // AI brief
    rep.appendChild(aiSection(r));

    // next steps and offers
    rep.appendChild(section(t("offers_title"), [
      h("div", { class: "offer", style: { marginBottom: "12px", borderColor: "var(--forest)" } },
        h("h3", { text: t("offer_walk") }), h("p", { class: "muted", text: t("offer_walk_body") }),
        h("div", { class: "row" }, walkthroughButton())),
      h("div", { class: "offers" }, r.offers.map(function (o) {
        return h("div", { class: "offer" }, h("h3", { text: o.name }), h("p", { class: "small muted", text: o.desc }), o.price ? h("span", { class: "price", text: o.price }) : null,
          h("button", { type: "button", class: "linkbtn", onclick: function () { B.event("cta_click", { detail: "offer_" + o.id }); var cc = $("contact-card"); if (cc) { cc.scrollIntoView({ behavior: "smooth" }); var f = cc.querySelector("input"); if (f) f.focus({ preventScroll: true }); } } },
            state.lang === "sw" ? "Ninavutiwa" : "I'm interested"));
      })),
      h("p", { class: "small muted", style: { marginTop: "8px" }, text: t("price_note") })]));

    rep.appendChild(contactCard(r, "report"));
    rep.appendChild(shareSection(r));
    rep.appendChild(feedbackSection());
    rep.appendChild(section(t("shared_after"), h("div", { class: "row" },
      h("button", { type: "button", class: "btn quiet", onclick: function () { clearDevice(); state.report = null; state.answers = {}; toast(t("cleared")); go("home"); } }, t("clear_now")),
      h("button", { type: "button", class: "linkbtn", onclick: function () { state.answers = {}; state.step = 0; go("check"); } }, t("retake")))));
    rep.appendChild(h("p", { class: "rep-foot", text: t("rep_footer", { date: r.date }) }));
    var hd = $("rep-h"); if (hd) hd.focus({ preventScroll: true });
  }

  function timeBlock(r) {
    if (!r.time.length) return h("p", { class: "muted", text: t("time_note") });
    return h("div", { class: "stack" }, r.time.map(function (x) { return h("p", { text: x }); }), h("p", { class: "small muted", text: t("time_note") }));
  }

  function walkthroughButton() {
    if (CFG.bookingUrl) return h("a", { class: "btn", href: CFG.bookingUrl, target: "_blank", rel: "noopener", onclick: function () { B.event("cta_click", { detail: "booking" }); } }, t("offer_walk"));
    if (CFG.whatsapp) return h("a", { class: "btn", href: "https://wa.me/" + CFG.whatsapp.replace(/\D/g, ""), target: "_blank", rel: "noopener", onclick: function () { B.event("cta_click", { detail: "whatsapp" }); } }, "WhatsApp");
    return h("button", { type: "button", class: "btn", onclick: function () { B.event("cta_click", { detail: "contact_form" }); var cc = $("contact-card"); if (cc) { cc.scrollIntoView({ behavior: "smooth" }); var f = cc.querySelector("input"); if (f) f.focus({ preventScroll: true }); } } }, t("contact_title"));
  }

  // ---------- AI brief section ----------
  function aiSection(r) {
    var sec = h("section", { class: "card", id: "ai-sec" });
    sec.appendChild(h("h2", { style: { fontSize: "1.35rem", marginBottom: "8px" }, text: t("ai_title") }));
    var status = h("p", { class: "status", id: "ai-status", "aria-live": "polite" });
    var out = h("div", { class: "ai-out", id: "ai-out" });
    if (state.localOnly || !B.ai) {
      ap(sec, h("p", { class: "muted", text: t("ai_unavail") }));
      return sec;
    }
    var p = E.prompt(r);
    var details = h("details", {}, h("summary", { text: t("ai_preview") }),
      h("pre", { class: "code", text: JSON.stringify(p.payload, null, 2) }));
    var ctl = null;
    var go_ = h("button", { type: "button", class: "btn", id: "ai-go" }, t("ai_go"));
    var stop = h("button", { type: "button", class: "btn quiet", hidden: true, onclick: function () { if (ctl) ctl.abort(); } }, t("ai_stop"));
    go_.addEventListener("click", function () {
      if (!navigator.onLine) { status.textContent = t("ai_offline"); return; }
      if (B.mode === "supabase" && !state.submitted) { status.textContent = t("ai_err"); flushOutbox(); return; }
      ctl = new AbortController();
      go_.disabled = true; stop.hidden = false; status.textContent = t("ai_wait"); rc(out, );
      B.event("brief_request");
      B.brief(state.report, state.assessmentId, ctl.signal).then(function (brief) {
        state.brief = brief; status.textContent = ""; renderBrief(out, brief); B.event("brief_shown");
      }, function (e) {
        var code = e && e.code;
        status.textContent = code === "cancelled" ? "" : code === "not_granted" || code === "sampling_disabled" ? t("ai_declined")
          : code === "rate_limited" ? t("ai_rate") : code === "disabled" ? t("ai_unavail") : t("ai_err");
        B.event("brief_failed", { detail: code || "error" });
      }).then(function () { go_.disabled = false; stop.hidden = true; });
    });
    ap(sec, h("p", { class: "muted", text: t("ai_desc") }), details, h("div", { class: "row", style: { margin: "10px 0" } }, go_, stop), status, out);
    if (state.brief) renderBrief(out, state.brief);
    return sec;
  }
  function renderBrief(out, b) {
    rc(out, 
      h("p", { class: "tag", text: "Claude" }),
      h("div", {}, h("h3", { text: t("ai_summary") }), h("p", { text: b.summary })),
      h("div", {}, h("h3", { text: t("ai_risks") }), h("ul", {}, b.risks.map(function (x) { return h("li", {}, h("strong", { text: x.title + ". " }), x.why + " " + x.fix); }))),
      h("div", {}, h("h3", { text: t("ai_agent") + ": " + b.agent.name }), h("p", { text: b.agent.what_it_does }),
        h("ul", {}, b.agent.guardrails.map(function (x) { return h("li", { text: x }); })),
        h("p", {}, h("strong", { text: t("ai_first_test") + ": " }), b.agent.first_test)),
      h("div", {}, h("h3", { text: t("ai_plan") }), h("ol", { class: "plan" }, b.plan.map(function (p) { return h("li", {}, h("b", { text: t("week", { n: p.week }) }), h("span", { text: p.action })); }))),
      h("div", {}, h("h3", { text: t("ai_compliance") }), h("ul", {}, b.compliance.map(function (x) { return h("li", { text: x }); }))),
      h("div", {}, h("h3", { text: t("ai_questions") }), h("ul", {}, b.questions.map(function (x) { return h("li", { text: x }); }))),
      h("p", { class: "small muted", text: t("ai_disclaimer") }));
  }

  // ---------- contact card (never autosaved; sent only with consent) ----------
  function contactCard(r, kind) {
    var card = h("section", { class: "card", id: "contact-card" });
    card.appendChild(h("h2", { style: { fontSize: "1.35rem", marginBottom: "8px" }, text: t("contact_title") }));
    card.appendChild(h("p", { class: "muted", text: t("contact_body") }));
    function field(id, label, type, extra) {
      var inp = h("input", Object.assign({ id: id, type: type || "text", autocomplete: "off", maxlength: "120" }, extra || {}));
      return { el: h("div", { class: "field" }, h("label", { for: id, text: label }), inp, extra && extra.hint ? h("span", { class: "small muted", id: id + "-hint", text: extra.hint }) : null), input: inp };
    }
    var fName = field("c-name", t("f_name"), "text", { autocomplete: "name" });
    var fRole = field("c-role", t("f_role"));
    var fOrg = field("c-org", t("f_org"), "text", { autocomplete: "organization" });
    var fEmail = field("c-email", t("f_email"), "email", { autocomplete: "email", inputmode: "email" });
    var fPhone = field("c-phone", t("f_phone"), "tel", { autocomplete: "tel", inputmode: "tel", hint: t("f_phone_hint"), "aria-describedby": "c-phone-hint" });
    var consent = h("input", { type: "checkbox", id: "c-consent" });
    var msg = h("p", { class: "status", "aria-live": "polite" });
    var out = h("div");
    var send = h("button", { type: "submit", class: "btn" }, t("contact_send"));
    var form = h("form", { novalidate: true, class: "stack", onsubmit: function (ev) {
      ev.preventDefault();
      var email = fEmail.input.value.trim(), phone = fPhone.input.value.replace(/[\s()-]/g, "");
      if (phone && /^0\d{8,10}$/.test(phone) && (state.answers.country || (r && r.ctx.country)) === "KE") phone = "+254" + phone.slice(1);
      if (!consent.checked) { msg.textContent = t("contact_consent_need"); consent.focus(); return; }
      if (!email && !phone) { msg.textContent = t("contact_need"); fEmail.input.focus(); return; }
      if (email && !/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s.]{2,24}$/.test(email)) { msg.textContent = t("contact_email_bad"); fEmail.input.focus(); return; }
      if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) { msg.textContent = t("contact_phone_bad"); fPhone.input.focus(); return; }
      var clean = function (v) { return E.cleanNote(v, 120).text.replace(/\[[A-Z]+_\d+\]/g, "").trim() || null; };
      var c = {
        assessment_id: state.assessmentId, name: fName.input.value.trim().slice(0, 80) || null, role: clean(fRole.input.value), org: fOrg.input.value.trim().slice(0, 120) || null,
        email: email || null, whatsapp: phone || null, consent_contact: true, consent_version: CFG.consentVersion + "-" + state.lang
      };
      if (kind === "funder" || !state.assessmentId || !B.canSendContact() || state.localOnly && B.mode !== "supabase") {
        // No assessment to attach to, or this view cannot send: show the details to send directly.
        if (kind === "funder" && B.mode === "supabase") {
          var fid = uuid();
          var rec = { id: fid, schema_version: C.schemaVersion, lang: state.lang, ref: state.ref, variant: state.variant, answers: E.clean(state.answers, ctx()), task_text: null, client_score: null, consent_report: false };
          send.disabled = true;
          sbInsert("assessments", rec).then(function () { c.assessment_id = fid; return B.submitContact(c); }).then(function () {
            msg.textContent = t("contact_ok"); form.querySelectorAll("input").forEach(function (i) { i.value = ""; i.checked = false; }); B.event("contact_submit", { detail: "funder" });
          }, function () { msg.textContent = t("contact_err"); }).then(function () { send.disabled = false; });
          return;
        }
        var summary = [c.name, c.role, c.org, c.email, c.whatsapp].filter(Boolean).join("\n") + (r ? "\n" + t("score_line", { s: r.score.readiness, band: r.score.band.name }) : "");
        rc(out, h("p", { class: "small", text: t("contact_offline") }), h("p", { class: "pre", text: summary }),
          CFG.contactEmail ? h("p", { class: "small" }, h("span", { text: CFG.contactEmail })) : null,
          h("button", { type: "button", class: "btn sm quiet", onclick: function (e2) { copyText(summary, e2.currentTarget); } }, t("copy")));
        return;
      }
      send.disabled = true; msg.textContent = "";
      B.submitContact(c).then(function () {
        msg.textContent = t("contact_ok");
        form.querySelectorAll("input").forEach(function (i) { i.value = ""; i.checked = false; });
        B.event("contact_submit", { detail: kind });
      }, function () { msg.textContent = t("contact_err"); }).then(function () { send.disabled = false; });
    } },
      h("div", { class: "form-grid" }, fName.el, fRole.el, fOrg.el, fEmail.el, fPhone.el),
      h("label", { class: "toggle", for: "c-consent" }, consent, h("span", {}, t("consent_contact"), h("br"), h("span", { class: "small muted", text: t("consent_helper") }))),
      h("div", { class: "row" }, send), msg, out);
    card.appendChild(form);
    return card;
  }

  // ---------- share ----------
  function shareUrl() {
    if (CFG.publicUrl) return CFG.publicUrl;
    if (B.isArtifact) return "";
    return location.origin + location.pathname;
  }
  function shareSection(r) {
    var link = shareUrl();
    var kids = [];
    if (link) {
      var wa = function (text, detail) {
        return h("a", { class: "btn quiet", href: "https://wa.me/?text=" + encodeURIComponent(text), target: "_blank", rel: "noopener", onclick: function () { B.event("share", { detail: detail }); } }, detail === "plan" ? t("share_plan") : t("share_full"));
      };
      var refLink = link + (link.indexOf("?") >= 0 ? "&" : "?") + "ref=wa-share";
      kids.push(wa(t("share_text_plan", { link: refLink }), "plan"), wa(t("share_text_full", { link: refLink, band: r.score.band.name }), "full"));
    }
    var canDownload = !B.isArtifact || !!B.cap.downloads;
    if (canDownload) kids.push(h("button", { type: "button", class: "btn quiet", onclick: function () {
      B.download("salama-readiness-report-" + r.date + ".md", E.reportText(r, state.brief)).then(function () { B.event("download"); }, function () { /* declined or unavailable */ });
    } }, t("download")));
    kids.push(h("button", { type: "button", class: "btn quiet", onclick: function (ev) { copyText(E.reportText(r, state.brief), ev.currentTarget); B.event("copy", { detail: "report" }); } }, t("copy_summary")));
    return section(t("share_title"), h("div", { class: "row" }, kids));
  }

  // ---------- feedback ----------
  function feedbackSection() {
    var rating = 0;
    var stars = h("div", { class: "stars", role: "radiogroup", "aria-label": t("fb_title") });
    [1, 2, 3, 4, 5].forEach(function (n) {
      var id = "fb-" + n;
      var inp = h("input", { type: "radio", name: "fb", id: id, value: String(n), "aria-label": t("star", { n: n }) });
      var lab = h("label", { for: id }, inp, String(n));
      inp.addEventListener("change", function () { rating = n; stars.querySelectorAll("label").forEach(function (l, i) { l.classList.toggle("on", i < n); }); });
      stars.appendChild(lab);
    });
    var ta = h("textarea", { id: "fb-text", maxlength: "500", placeholder: t("fb_ph"), "aria-label": t("fb_ph"), class: "", style: { width: "100%", minHeight: "80px", font: "inherit", padding: "10px", borderRadius: "10px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" } });
    var msg = h("p", { class: "status", "aria-live": "polite" });
    var btn = h("button", { type: "button", class: "btn sm", onclick: function () {
      if (!rating) { msg.textContent = t("err_required"); return; }
      btn.disabled = true;
      var comment = E.cleanNote(ta.value, 500).text || null;
      B.submitFeedback({ assessment_id: state.assessmentId, rating: rating, comment: comment }).then(function () {
        msg.textContent = t("fb_thanks"); B.event("feedback", { detail: "r" + rating });
      }, function () { msg.textContent = t("contact_err"); btn.disabled = false; });
    } }, t("fb_send"));
    return section(t("fb_title"), h("div", { class: "stack" }, stars, ta, h("div", { class: "row" }, btn), msg));
  }

  // =====================================================================
  // Documents: standard, case study, privacy
  // =====================================================================
  function renderStandard() {
    var root = $("v-standard");
    var S = ST.standard;
    var doc = h("article", { class: "doc" });
    rc(root, h("div", { class: "wrap" }, doc));
    ap(doc, 
      h("div", { class: "seal-row" }, seal(96), h("div", { class: "stack" }, h("p", { class: "eyebrow", text: S.status }), h("h1", { style: { fontSize: "clamp(1.8rem, 1.3rem + 2vw, 2.6rem)" }, text: S.title }))),
      h("div", { class: "meta" }, h("span", { text: "Version " + S.version }), h("span", { text: S.date }), h("span", { text: S.licence }), h("span", { text: S.publisher })),
      state.lang === "sw" ? h("p", { class: "note", text: "Kiwango hiki kinapatikana kwa Kiingereza kwa sasa. Toleo la Kiswahili litafuata baada ya kuhakikiwa na wazungumzaji asilia." }) : null,
      h("p", { class: "lead", text: S.summary }),
      h("p", {}, h("a", { href: "safe-a-v0.1.html", target: "_blank", rel: "noopener", text: "Printable version" }), " · ", h("a", { href: "safe-a-v0.1.pdf", target: "_blank", rel: "noopener", text: "PDF" })),
      h("h2", { text: "Principles" }), h("ul", {}, S.principles.map(function (p) { return h("li", { text: p }); })),
      h("h2", { text: "Scope" }), h("ul", {}, S.scope.map(function (p) { return h("li", { text: p }); })),
      h("h2", { text: "The 20 controls" }),
      S.pillars.map(function (p) {
        return h("section", { class: "stack" },
          h("h3", { style: { fontSize: "1.3rem" }, text: p.id + " · " + p.name }), h("p", { class: "muted", text: p.tagline }),
          h("div", { class: "tbl-wrap" }, h("table", { class: "ctrl-table" },
            h("thead", {}, h("tr", {}, h("th", { text: "ID" }), h("th", { text: "Control" }), h("th", { text: "Evidence" }), h("th", { text: "Level" }))),
            h("tbody", {}, p.controls.map(function (c) {
              return h("tr", {}, h("td", { class: "id", text: c[0] }), h("td", {}, h("strong", { text: c[1] + ". " }), c[3]), h("td", { text: c[4] }), h("td", {}, h("span", { class: "lvl", text: "L" + c[2] })));
            })))));
      }),
      h("h2", { text: "Levels" }), h("ul", {}, S.levels.map(function (l) { return h("li", {}, h("strong", { text: l[0] + ". " }), l[1]); })),
      h("h2", { text: "Evidence gates for child-facing use" }), h("p", { text: S.childGates.intro }), h("ol", {}, S.childGates.gates.map(function (x) { return h("li", { text: x }); })),
      h("h2", { text: "Definitions" }), h("dl", { class: "kv" }, S.definitions.map(function (d) { return [h("dt", { text: d[0] }), h("dd", { text: d[1] })]; })),
      h("h2", { text: "How the readiness check scores" }), h("p", { text: S.method.intro }), h("ul", {}, S.method.points.map(function (x) { return h("li", { text: x }); })),
      h("h2", { text: "Not law, not certification" }), h("p", { text: S.notLaw }),
      h("h2", { text: "Open standard" }), h("ul", {}, S.open.map(function (x) { return h("li", { text: x }); })),
      h("h2", { text: "Comment on this draft" }), h("p", { text: S.contribute }),
      CFG.repoUrl ? h("p", {}, h("a", { href: CFG.repoUrl, target: "_blank", rel: "noopener", text: t("open_source") })) : null,
      h("p", { class: "small muted", text: S.changelog.map(function (c) { return c[0] + " (" + c[1] + "): " + c[2]; }).join(" ") }));
  }

  function renderCase() {
    var root = $("v-case");
    var K = ST.caseStudy;
    var doc = h("article", { class: "doc" });
    rc(root, h("div", { class: "wrap" }, doc));
    ap(doc, 
      h("p", { class: "eyebrow", text: t("nav_case") + " · SAFE-A v0.1" }),
      h("h1", { style: { fontSize: "clamp(1.8rem, 1.3rem + 2vw, 2.6rem)" }, text: K.title }),
      h("p", { class: "note", text: K.status }),
      state.lang === "sw" ? h("p", { class: "small muted", text: "Mfano huu unapatikana kwa Kiingereza kwa sasa." }) : null,
      h("p", { class: "lead", text: K.about }),
      h("h2", { text: "What SELution plans" }), h("ul", {}, K.plans.map(function (x) { return h("li", { text: x }); })),
      h("h2", { text: "Why it matters" }), h("p", { text: K.why }),
      h("h2", { text: "What SAFE-A recommends" }),
      h("div", { class: "fixes" }, K.recommendations.map(function (rec) { return h("article", { class: "fix" }, h("h3", { text: rec[0] }), h("p", { text: rec[1] })); })),
      h("h2", { text: "What a pilot would measure" }), h("ul", {}, K.measure.map(function (x) { return h("li", { text: x }); })),
      h("h2", { text: "Lessons from the design stage" }), h("ol", {}, K.lessons.map(function (x) { return h("li", { text: x }); })),
      h("section", { class: "card stack" }, h("h2", { text: t("case_open_title") }), h("p", { class: "muted", text: t("case_open_body") }),
        h("dl", { class: "kv" }, ST.caseTemplate.map(function (row) { return [h("dt", { text: row[0] }), h("dd", { text: row[1] })]; }))),
      h("p", {}, h("a", { class: "btn", href: "#check", text: t("cta_check") })));
  }

  function renderPrivacy() {
    var root = $("v-privacy");
    var P = C.privacy;
    var vars = { legalEntity: CFG.legalEntity, privacyEmail: CFG.privacyEmail, odpcNumber: CFG.odpcNumber, euRep: CFG.euRep, region: CFG.region, hostName: CFG.hostName, aiTerms: CFG.aiTerms };
    var doc = h("article", { class: "doc" });
    rc(root, h("div", { class: "wrap" }, doc));
    ap(doc, h("h1", { style: { fontSize: "clamp(1.8rem, 1.3rem + 2vw, 2.6rem)" }, text: t("privacy_title") }),
      h("p", { class: "small muted", text: t("privacy_version", { v: P.version }) }),
      (P[state.lang] || P.en).map(function (row) { return h("section", { class: "stack" }, h("h2", { style: { fontSize: "1.2rem" }, text: row[0] }), h("p", { text: E.fill(row[1], vars) })); }));
  }

  // =====================================================================
  // Admin: the founder's pipeline
  // =====================================================================
  var adminState = { rows: null, sb: null, unsub: null, selected: null, filter: "all", insight: null };

  function normaliseRow(o) {
    var rep = E.build(o.answers || {}, "en", { extra: { ref: o.ref, brief: !!o.brief, rating: o.feedback && o.feedback.rating } });
    var contact = o.contact || null;
    return {
      id: o.id, created: o.created || "", source: o.source || "", lang: o.lang || "en", ref: o.ref || "", variant: o.variant || "",
      answers: rep.answers, task_text: o.task_text || "", report: rep, readiness: rep.score.readiness, band: rep.score.band.name, bandId: rep.score.band.id,
      exposure: rep.score.exposure, agent: rep.agent.name, lead: rep.lead.score,
      temp: E.temperature(rep.lead.score, !!(contact && (contact.email || contact.whatsapp)), o.status === "discovery" || o.status === "pilot" || o.status === "won"),
      status: o.status || "new", contact: contact, feedback: o.feedback || null, brief: o.brief || null, example: !!o.example
    };
  }

  function exampleRows() {
    var base = [
      { org_type: "ngo", country: "KE", staff: "s2", serve: ["kids_6_12"], tasks: ["reporting", "data_cleaning"], report_days: "d3", templates: "t3", ai_use: "personal", ai_data: ["names"], ai_rules: "none", registered: "unsure", consent: "general", access: "password", systems: ["forms", "whatsapp"], data_flow: "wa_photos", breach: "no", connectivity: "patchy", devices: ["laptops"], channels: ["whatsapp"], languages: ["en", "sw"], continuity: "no", timeline: "soon", triggers: ["report"], pay_path: "move", funder_asked: "asked", role: "recommend" },
      { org_type: "school_private", country: "UG", staff: "s2", serve: ["kids_6_12"], tasks: ["lessons", "assessment"], teacher_hours: "h3", ai_use: "personal", ai_data: ["internal"], ai_rules: "none", registered: "no", consent: "general", access: "shared", systems: ["paper", "school_mis"], data_entry: "outside", breach: "no", connectivity: "patchy", devices: ["own_phones"], channels: ["sms"], languages: ["en"], continuity: "partly", timeline: "later", pay_path: "none", funder_asked: "no", role: "approve" },
      { org_type: "ingo", country: "IN", staff: "s4", serve: ["adults", "pwd"], tasks: ["reporting", "proposals"], report_days: "d4", templates: "t4", ai_use: "approved", ai_data: ["internal"], ai_rules: "trained", dp_lead: "yes", access: "mfa", systems: ["crm"], data_flow: "forms", breach: "written", connectivity: "good", devices: ["laptops"], channels: ["whatsapp", "sms"], languages: ["en", "hi"], continuity: "yes", timeline: "now", triggers: ["diligence"], pay_path: "line", funder_asked: "conditions", role: "approve", budget: "b4" },
      { org_type: "cbo", country: "NG", staff: "s1", serve: ["survivors", "adults"], tasks: ["safeguarding", "messages"], ai_use: "personal", ai_data: ["cases"], ai_rules: "none", access: "shared", systems: ["paper", "whatsapp"], data_flow: "paper", breach: "unsure", connectivity: "offline", devices: ["own_phones"], channels: ["calls"], languages: ["ha", "en"], continuity: "no", timeline: "explore", pay_path: "funder", funder_asked: "unsure", role: "approve" },
      { org_type: "ngo", country: "BR", staff: "s3", serve: ["teens", "youth"], tasks: ["reporting", "attendance"], report_days: "d2", templates: "t2", ai_use: "approved", ai_data: ["internal"], ai_rules: "written", access: "mfa", systems: ["forms", "sheets"], data_flow: "forms", breach: "written", consent: "signed", connectivity: "good", devices: ["laptops", "programme"], channels: ["whatsapp"], languages: ["pt"], continuity: "partly", timeline: "soon", triggers: ["grant"], pay_path: "proposal", funder_asked: "no", role: "recommend" }
    ];
    return base.map(function (a, i) {
      return { id: "example-" + (i + 1), created: "2026-10-1" + i, source: "example", lang: "en", ref: i === 0 ? "fnd-example" : "", answers: a, task_text: "", status: ["new", "contacted", "discovery", "new", "new"][i],
        contact: i % 2 === 0 ? { name: "Example contact", email: "example@example.org", consent_contact: true } : null, feedback: i === 2 ? { rating: 5 } : null, example: true };
    });
  }

  function renderAdmin() {
    var root = $("v-admin");
    rc(root, );
    var wrap = h("div", { class: "wrap admin", id: "admin-wrap" });
    root.appendChild(wrap);
    if (!B.canAdmin) { wrap.appendChild(h("p", { text: "This page is for the Salama team." })); return; }
    if (B.mode === "supabase" && !adminState.session) { renderLogin(wrap); return; }
    loadAdminRows().then(function () { drawAdmin(); }, function (e) { wrap.appendChild(h("p", { class: "cap", text: "Could not load the pipeline: " + (e && e.message ? e.message : "unknown error") })); });
  }

  function loadAdminRows() {
    if (adminState.rows && B.mode !== "local") return Promise.resolve();
    if (B.mode === "artifact") {
      return new Promise(function (resolve) {
        if (adminState.unsub) { resolve(); return; }
        var first = true;
        adminState.unsub = B.cap.db.collection("assessments").orderBy("created", "desc").limit(1000).onSnapshot(function (snap) {
          adminState.rows = snap.docs.map(function (d) { var o = d.data(); o.id = d.id; return normaliseRow(o); });
          if (first) { first = false; resolve(); } else if (state.view === "admin") drawAdmin();
        }, function () { adminState.rows = adminState.rows || []; resolve(); });
      });
    }
    if (B.mode === "supabase") {
      var sb = adminState.sb;
      return Promise.all([
        sb.from("assessments").select("id,created_at,lang,ref,variant,answers,task_text,status,brief").order("created_at", { ascending: false }).limit(1000),
        sb.from("contacts").select("assessment_id,name,role,org,email,whatsapp,consent_contact,consent_version,created_at"),
        sb.from("feedback").select("assessment_id,rating,comment"),
        sb.from("events").select("name,step,ref,variant,created_at").gte("created_at", new Date(Date.now() - 90 * 864e5).toISOString()).limit(20000)
      ]).then(function (res) {
        res.forEach(function (r) { if (r.error) throw r.error; });
        var contacts = {}, fb = {};
        res[1].data.forEach(function (c) { contacts[c.assessment_id] = c; });
        res[2].data.forEach(function (f) { fb[f.assessment_id] = f; });
        adminState.events = res[3].data;
        adminState.rows = res[0].data.map(function (a) {
          return normaliseRow({ id: a.id, created: a.created_at, source: "web", lang: a.lang, ref: a.ref, variant: a.variant, answers: a.answers, task_text: a.task_text, status: a.status, brief: a.brief, contact: contacts[a.id] || null, feedback: fb[a.id] || null });
        });
      });
    }
    var list = LS.get("local_submissions", []);
    adminState.rows = list.map(function (x) { return normaliseRow(Object.assign({ created: x.created, source: "this device" }, x.rec)); });
    return Promise.resolve();
  }

  function setStatus(row, status) {
    if (row.example) { row.status = status; drawAdmin(); return; }
    var p = B.mode === "artifact" ? B.cap.db.doc("assessments/" + row.id).update({ status: status })
      : B.mode === "supabase" ? adminState.sb.from("assessments").update({ status: status }).eq("id", row.id).then(function (r) { if (r.error) throw r.error; })
      : Promise.resolve();
    p.then(function () { row.status = status; toast("Status: " + status); drawAdmin(); }, function () { toast("Could not update status"); });
  }
  function purgeNote(row) {
    var p = B.mode === "artifact" ? B.cap.db.doc("assessments/" + row.id).update({ task_text: null })
      : B.mode === "supabase" ? adminState.sb.from("assessments").update({ task_text: null }).eq("id", row.id).then(function (r) { if (r.error) throw r.error; })
      : Promise.resolve();
    p.then(function () { row.task_text = ""; toast("Note purged"); drawAdmin(); }, function () { toast("Could not purge the note"); });
  }
  function deleteContact(row) {
    var p = B.mode === "artifact" ? B.cap.db.doc("assessments/" + row.id).update({ contact: null })
      : B.mode === "supabase" ? adminState.sb.from("contacts").delete().eq("assessment_id", row.id).then(function (r) { if (r.error) throw r.error; })
      : Promise.resolve();
    p.then(function () { row.contact = null; toast("Contact deleted"); drawAdmin(); }, function () { toast("Could not delete the contact"); });
  }

  function countBy(rows, fn) {
    var m = {};
    rows.forEach(function (r) { [].concat(fn(r) || []).forEach(function (k) { if (k) m[k] = (m[k] || 0) + 1; }); });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function hbars(pairs, labelFn, total) {
    var max = pairs.length ? pairs[0][1] : 1;
    return h("div", { class: "hbars" }, pairs.slice(0, 8).map(function (p) {
      return h("div", { class: "hbar" }, h("span", { text: labelFn ? labelFn(p[0]) : p[0] }),
        h("div", { class: "bar" }, h("i", { style: { width: Math.round(100 * p[1] / max) + "%" } })), h("b", { text: String(p[1]) }));
    }));
  }
  function median(xs) { if (!xs.length) return 0; var s = xs.slice().sort(function (a, b) { return a - b; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); }
  var enCtx = E.context({}, "en");

  function aggregates(rows) {
    var n = rows.length;
    function sup(pairs) { return pairs.map(function (p) { return [p[0], p[1] < 5 ? "suppressed" : p[1]]; }); }
    var pillarAvg = {};
    C.pillars.forEach(function (p) { pillarAvg[p.id] = n ? Math.round(rows.reduce(function (s, r) { return s + r.report.score.pillars.filter(function (x) { return x.id === p.id; })[0].value; }, 0) / n) : 0; });
    return {
      assessments: n, median_score: median(rows.map(function (r) { return r.readiness; })), pillar_averages: pillarAvg,
      bands: sup(countBy(rows, function (r) { return r.band; })), exposure: sup(countBy(rows, function (r) { return r.exposure; })),
      top_tasks: sup(countBy(rows, function (r) { return r.answers.tasks; })), org_types: sup(countBy(rows, function (r) { return r.answers.org_type; })),
      countries: sup(countBy(rows, function (r) { return r.answers.country; })), temperatures: sup(countBy(rows, function (r) { return r.temp; })),
      statuses: sup(countBy(rows, function (r) { return r.status; }))
    };
  }

  function drawAdmin() {
    var wrap = $("admin-wrap");
    if (!wrap) return;
    rc(wrap, );
    var rows = (adminState.rows || []).slice();
    if (state.adminExample) rows = exampleRows().map(normaliseRow).concat(rows);
    var modeLabel = { artifact: "Live: artifact database (owner and editors only)", supabase: "Live: Supabase", local: "This device only (test mode)" }[B.mode] || B.mode;
    ap(wrap, h("div", { class: "row", style: { justifyContent: "space-between" } },
      h("div", { class: "stack" }, h("p", { class: "eyebrow", text: modeLabel }), h("h1", { style: { fontSize: "2rem" }, text: "Pipeline" })),
      h("div", { class: "row" },
        h("label", { class: "toggle", for: "ex-toggle" }, (function () { var cb = h("input", { type: "checkbox", id: "ex-toggle" }); cb.checked = state.adminExample; cb.addEventListener("change", function () { state.adminExample = cb.checked; drawAdmin(); }); return cb; })(), h("span", { text: "Show example rows" })),
        h("button", { type: "button", class: "btn sm quiet", onclick: function () { exportCsv(rows); } }, "Export CSV"),
        B.mode === "supabase" ? h("button", { type: "button", class: "btn sm quiet", onclick: function () { adminState.sb.auth.signOut(); adminState.session = null; adminState.rows = null; renderAdmin(); } }, "Sign out") : null)));
    if (state.adminExample) wrap.appendChild(h("p", { class: "example-flag", text: "Example rows are made up for layout only. They are not stored and never mix into exports of real data unless shown." }));
    if (!rows.length) {
      wrap.appendChild(h("div", { class: "card stack" }, h("h2", { text: "No completed checks yet" }),
        h("p", { class: "muted", text: "Completed readiness checks appear here with their score, exposure, top tasks and lead temperature. Take the check yourself to see the first row, or turn on example rows to preview the layout." }),
        h("a", { class: "btn", href: "#check", text: "Take the check" })));
      return;
    }
    var real = rows.filter(function (r) { return !r.example; });
    var contactable = rows.filter(function (r) { return r.contact; }).length;
    var high = rows.filter(function (r) { return r.exposure === "high"; }).length;
    wrap.appendChild(h("div", { class: "kpis" },
      kpi(rows.length, "completed checks"), kpi(median(rows.map(function (r) { return r.readiness; })), "median score"),
      kpi(high + " of " + rows.length, "high exposure"), kpi(rows.filter(function (r) { return r.temp === "hot"; }).length, "hot leads"),
      kpi(contactable + " of " + rows.length, "asked to be contacted")));

    if (B.mode === "supabase" && adminState.events) {
      var ev = adminState.events;
      var sess = function (fn) { var s0 = {}; ev.filter(fn).forEach(function (e) { s0[e.session_id || e.created_at] = 1; }); return Object.keys(s0).length; };
      var counts = [["check_start", "Started"], ["step_done", "Finished step 3", 3], ["report_view", "Saw report"], ["brief_shown", "Got AI brief"], ["contact_submit", "Left contact"]].map(function (x) {
        return [x[1], ev.filter(function (e) { return e.name === x[0] && (!x[2] || e.step === x[2]); }).length];
      });
      wrap.appendChild(h("div", { class: "card stack" }, h("h2", { style: { fontSize: "1.3rem" }, text: "Funnel, last 90 days (event counts)" }), hbars(counts)));
      void sess;
    }

    var pillarPairs = C.pillars.map(function (p) { return [p.name.en, Math.round(rows.reduce(function (s, r) { return s + r.report.score.pillars.filter(function (x) { return x.id === p.id; })[0].value; }, 0) / rows.length)]; }).sort(function (a, b) { return a[1] - b[1]; });
    wrap.appendChild(h("div", { class: "two" },
      h("div", { class: "card stack" }, h("h2", { style: { fontSize: "1.3rem" }, text: "Most requested tasks" }), hbars(countBy(rows, function (r) { return r.answers.tasks; }), function (k) { return E.label("tasks", k, enCtx); })),
      h("div", { class: "card stack" }, h("h2", { style: { fontSize: "1.3rem" }, text: "Average pillar score (weakest first)" }),
        h("div", { class: "hbars" }, pillarPairs.map(function (p) { return h("div", { class: "hbar" }, h("span", { text: p[0] }), h("div", { class: "bar" }, h("i", { style: { width: p[1] + "%" } })), h("b", { text: String(p[1]) })); })))));
    wrap.appendChild(h("div", { class: "two" },
      h("div", { class: "card stack" }, h("h2", { style: { fontSize: "1.3rem" }, text: "Organisation types" }), hbars(countBy(rows, function (r) { return r.answers.org_type; }), function (k) { return E.label("org_type", k, enCtx); })),
      h("div", { class: "card stack" }, h("h2", { style: { fontSize: "1.3rem" }, text: "Countries" }), hbars(countBy(rows, function (r) { return r.answers.country; }), function (k) { return C.countryNames[k] || k; }))));

    // AI pipeline insight
    var insightOut = h("div", { class: "stack" });
    var askBtn = h("button", { type: "button", class: "btn sm", onclick: function () { askPipeline(real.length ? real : rows, insightOut, askBtn); } }, "Ask Claude what the pipeline says");
    wrap.appendChild(h("div", { class: "card stack" }, h("h2", { style: { fontSize: "1.3rem" }, text: "Pipeline insight" }),
      h("p", { class: "small muted", text: "Sends counts and averages only. Groups under 5 are suppressed, and no lead rows, contacts or notes are sent." }),
      B.ai || B.mode === "supabase" ? askBtn : h("p", { class: "muted", text: "Not available in this mode." }), insightOut));
    if (adminState.insight) renderInsight(insightOut, adminState.insight);

    // leads table
    var filters = ["all", "hot", "warm", "cold"];
    var shown = rows.filter(function (r) { return adminState.filter === "all" || r.temp === adminState.filter; });
    wrap.appendChild(h("div", { class: "row" }, filters.map(function (f) {
      return h("button", { type: "button", class: "btn sm " + (adminState.filter === f ? "" : "quiet"), "aria-pressed": adminState.filter === f ? "true" : "false", onclick: function () { adminState.filter = f; drawAdmin(); } }, f);
    })));
    var table = h("table", { class: "leads" },
      h("thead", {}, h("tr", {}, ["Date", "Organisation", "Country", "Score", "Exposure", "First agent", "Lead", "Status", ""].map(function (x) { return h("th", { text: x }); }))),
      h("tbody", {}, shown.map(function (r) {
        var sel = h("select", { "aria-label": "Status", onchange: function (ev) { setStatus(r, ev.target.value); } });
        ["new", "contacted", "discovery", "pilot", "won", "lost"].forEach(function (s0) { var op = h("option", { value: s0, text: s0 }); if (r.status === s0) op.selected = true; sel.appendChild(op); });
        return h("tr", {},
          h("td", { text: String(r.created).slice(0, 10) }),
          h("td", { text: (r.contact && r.contact.org ? r.contact.org + " · " : "") + E.label("org_type", r.answers.org_type, enCtx) + (r.example ? " (example)" : "") }),
          h("td", { text: C.countryNames[r.answers.country] || r.answers.country || "" }),
          h("td", { text: r.readiness + " · " + r.band }),
          h("td", { text: r.exposure }),
          h("td", { text: r.agent }),
          h("td", {}, h("span", { class: "temp " + r.temp, text: r.temp + " " + r.lead })),
          h("td", {}, sel),
          h("td", {}, h("button", { type: "button", class: "linkbtn", onclick: function () { adminState.selected = r.id; drawAdmin(); var d = $("drawer"); if (d) d.scrollIntoView({ behavior: "smooth" }); } }, "Open")));
      })));
    wrap.appendChild(h("div", { class: "tbl-wrap card", style: { padding: "0" } }, table));

    var selRow = rows.filter(function (r) { return r.id === adminState.selected; })[0];
    if (selRow) wrap.appendChild(drawer(selRow));
  }
  function kpi(v, l) { return h("div", { class: "kpi" }, h("b", { text: String(v) }), h("span", { text: l })); }

  function drawer(r) {
    var rep = r.report;
    var kv = h("dl", { class: "kv" });
    function row(k, v) { ap(kv, h("dt", { text: k }), h("dd", { text: v == null || v === "" ? "-" : String(v) })); }
    row("Score", rep.score.readiness + " (" + rep.score.band.name + ")" + (rep.score.capReasons.length ? ", capped: " + rep.score.capText.join("; ") : ""));
    row("Lead score", r.lead + " (" + r.temp + ") " + JSON.stringify(rep.lead.parts));
    row("Referral", r.ref); row("Hero variant", r.variant); row("Language", r.lang);
    row("Top fixes", rep.fixes.map(function (f) { return f.title; }).join("; "));
    row("First agent", rep.agent.name);
    Object.keys(r.answers).forEach(function (k) {
      var v = r.answers[k];
      row(k, Array.isArray(v) ? E.labels(k, v, enCtx).join(", ") : E.label(k, v, enCtx));
    });
    row("Task note (redacted)", r.task_text);
    if (r.contact) {
      row("Contact", [r.contact.name, r.contact.role, r.contact.org].filter(Boolean).join(", "));
      row("Email", r.contact.email); row("WhatsApp", r.contact.whatsapp); row("Consent", r.contact.consent_version || (r.contact.consent_contact ? "yes" : "no"));
    }
    if (r.feedback) row("Feedback", r.feedback.rating + "/5 " + (r.feedback.comment || ""));
    return h("section", { class: "card drawer stack", id: "drawer" },
      h("div", { class: "row", style: { justifyContent: "space-between" } }, h("h2", { style: { fontSize: "1.3rem" }, text: "Lead detail" }),
        h("button", { type: "button", class: "linkbtn", onclick: function () { adminState.selected = null; drawAdmin(); } }, "Close")),
      kv,
      h("div", { class: "row" },
        r.task_text ? h("button", { type: "button", class: "btn sm quiet", onclick: function () { purgeNote(r); } }, "Purge task note") : null,
        r.contact ? h("button", { type: "button", class: "btn sm quiet", onclick: function () { deleteContact(r); } }, "Delete contact (erasure request)") : null,
        h("button", { type: "button", class: "btn sm quiet", onclick: function (ev) { copyText(E.reportText(rep, r.brief), ev.currentTarget); } }, "Copy their report")));
  }

  function csvCell(v) {
    var s0 = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s0)) s0 = "'" + s0;
    s0 = s0.replace(/[​-‏‪-‮⁠-⁩﻿]/g, "");
    return /[",\n]/.test(s0) ? "\"" + s0.replace(/"/g, "\"\"") + "\"" : s0;
  }
  function exportCsv(rows) {
    var head = ["created", "status", "example", "org_type", "country", "staff", "readiness", "band", "exposure", "first_agent", "lead_score", "temperature", "tasks", "timeline", "pay_path", "budget", "role", "ref", "name", "role_title", "org", "email", "whatsapp", "rating"];
    var lines = [head.join(",")].concat(rows.map(function (r) {
      var a = r.answers, c = r.contact || {};
      return [r.created, r.status, r.example ? "yes" : "", a.org_type, a.country, a.staff, r.readiness, r.band, r.exposure, r.agent, r.lead, r.temp, (a.tasks || []).join(" "), a.timeline, a.pay_path, a.budget, a.role, r.ref, c.name, c.role, c.org, c.email, c.whatsapp, r.feedback ? r.feedback.rating : ""].map(csvCell).join(",");
    }));
    var text = lines.join("\n");
    if (B.isArtifact) { if (B.cap.downloads) B.cap.downloads.save({ filename: "salama-pipeline.csv", data: text }).catch(function () { /* declined */ }); else copyText(text); return; }
    var url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    var a0 = h("a", { href: url, download: "salama-pipeline.csv" }); document.body.appendChild(a0); a0.click(); a0.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function pipelinePrompt(agg) {
    return [
      "You analyse de-identified aggregates for the founder of a small consultancy that sells secure AI agents to NGOs, schools and education programmes worldwide. Return one JSON object only.",
      "Use only AGGREGATES. Each finding cites one metric key and copies its value. No computed percentages; write \"X of Y\". \"suppressed\" means fewer than 5: never estimate it or identify anyone. With fewer than 30 assessments, confidence is \"low\". If data is missing, say so. Plain English, no markdown, no em dashes.",
      "Output: {\"answer\": \"what the pipeline says and which offer to lead with (500 chars)\", \"findings\": [up to 5 {\"claim\": \"(200)\", \"metric\": \"key\", \"value\": \"copied\"}], \"actions\": [up to 3 actions for the next two weeks], \"caveats\": [up to 3], \"confidence\": \"low|medium|high\"}",
      "AGGREGATES: " + JSON.stringify(agg)
    ].join("\n");
  }
  function askPipeline(rows, out, btn) {
    var agg = aggregates(rows);
    btn.disabled = true; rc(out, h("p", { class: "status", text: "Thinking..." }));
    var p;
    if (B.isArtifact) p = B.cap.sample.json(pipelinePrompt(agg), { modelTier: "default" });
    else if (B.mode === "supabase") p = adminState.sb.auth.getSession().then(function (s0) {
      return fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/functions/v1/brief", { method: "POST", headers: sbHeaders(s0.data.session.access_token), body: JSON.stringify({ kind: "pipeline", aggregates: agg }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j.insight; }); });
    });
    else p = Promise.reject({ code: "unavailable" });
    p.then(function (x) {
      var keys = JSON.stringify(agg);
      var findings = (Array.isArray(x.findings) ? x.findings : []).filter(function (f) { return f && f.metric && keys.indexOf(String(f.metric)) >= 0; }).slice(0, 5);
      adminState.insight = { answer: String(x.answer || "").slice(0, 600), findings: findings, actions: (x.actions || []).slice(0, 3).map(String), caveats: (x.caveats || []).slice(0, 3).map(String), confidence: String(x.confidence || "low") };
      renderInsight(out, adminState.insight);
    }, function () { rc(out, h("p", { class: "status", text: "The insight could not be generated just now." })); }).then(function () { btn.disabled = false; });
  }
  function renderInsight(out, x) {
    rc(out, h("p", { class: "tag", text: "Claude · confidence " + x.confidence }), h("p", { text: x.answer }),
      x.findings.length ? h("ul", {}, x.findings.map(function (f) { return h("li", { text: String(f.claim) + " (" + f.metric + ": " + f.value + ")" }); })) : null,
      x.actions.length ? h("div", {}, h("h3", { text: "Next two weeks" }), h("ol", {}, x.actions.map(function (a) { return h("li", { text: a }); }))) : null,
      x.caveats.length ? h("p", { class: "small muted", text: "Caveats: " + x.caveats.join(" ") }) : null);
  }

  // ---- Supabase admin login: 6-digit email code, then an authenticator app (aal2) ----
  function loadScript(src) {
    return new Promise(function (res, rej) { var el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); });
  }
  function renderLogin(wrap) {
    var msg = h("p", { class: "status", "aria-live": "polite" });
    var email = h("input", { id: "adm-email", type: "email", autocomplete: "email" });
    var code = h("input", { id: "adm-code", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "10" });
    var stage = "email";
    var box = h("form", { class: "card stack", style: { maxWidth: "460px" }, novalidate: true, onsubmit: function (ev) { ev.preventDefault(); stepLogin(); } },
      h("h1", { style: { fontSize: "1.8rem" }, text: "Team sign-in" }),
      h("p", { class: "muted", text: "Sign in with a 6-digit code sent to your email, then a code from your authenticator app." }),
      h("div", { class: "field" }, h("label", { for: "adm-email", text: "Email" }), email),
      h("div", { class: "field", id: "code-field", hidden: true }, h("label", { for: "adm-code", id: "code-label", text: "Code" }), code),
      h("div", { id: "qr" }), h("button", { type: "submit", class: "btn" }, "Continue"), msg);
    wrap.appendChild(box);
    var sb;
    function client() {
      if (sb) return Promise.resolve(sb);
      return (window.supabase ? Promise.resolve() : loadScript("vendor/supabase.js")).then(function () {
        sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
        adminState.sb = sb; return sb;
      });
    }
    var factorId = null;
    function done() { adminState.session = true; renderAdmin(); }
    function mfaStep() {
      return sb.auth.mfa.getAuthenticatorAssuranceLevel().then(function (r) {
        if (r.data && r.data.currentLevel === "aal2") { done(); return; }
        return sb.auth.mfa.listFactors().then(function (f) {
          var totp = (f.data && f.data.totp || []).filter(function (x) { return x.status === "verified"; })[0];
          code.value = ""; $("code-label").textContent = "Authenticator code";
          if (totp) { factorId = totp.id; stage = "mfa"; msg.textContent = "Enter the code from your authenticator app."; code.focus(); return; }
          return sb.auth.mfa.enroll({ factorType: "totp" }).then(function (en) {
            if (en.error) throw en.error;
            factorId = en.data.id; stage = "mfa";
            rc($("qr"), h("p", { class: "small", text: "Scan this in your authenticator app, then enter the 6-digit code it shows." }),
              h("img", { src: en.data.totp.qr_code, alt: "Authenticator setup QR code", width: "180", height: "180" }),
              h("p", { class: "small muted", text: "Setup key: " + en.data.totp.secret }));
            code.focus();
          });
        });
      });
    }
    function stepLogin() {
      msg.textContent = "";
      client().then(function () {
        if (stage === "email") {
          var e = email.value.trim();
          if (!e) { msg.textContent = "Enter your email."; return; }
          return sb.auth.signInWithOtp({ email: e, options: { shouldCreateUser: false } }).then(function (r) {
            if (r.error) throw r.error;
            stage = "otp"; $("code-field").hidden = false; $("code-label").textContent = "6-digit code from your email"; msg.textContent = "Check your email for a 6-digit code."; code.focus();
          });
        }
        if (stage === "otp") {
          return sb.auth.verifyOtp({ email: email.value.trim(), token: code.value.trim(), type: "email" }).then(function (r) { if (r.error) throw r.error; return mfaStep(); });
        }
        if (stage === "mfa") {
          return sb.auth.mfa.challengeAndVerify({ factorId: factorId, code: code.value.trim() }).then(function (r) { if (r.error) throw r.error; done(); });
        }
      }).catch(function (e) { msg.textContent = (e && e.message) ? e.message : "Sign-in failed."; });
    }
  }

  // =====================================================================
  // Boot
  // =====================================================================
  (function restore() {
    var res = LS.get("result", null);
    if (res && res.answers) {
      state.report = E.build(res.answers, state.lang, { date: res.date, extra: { ref: state.ref } });
      state.assessmentId = res.id; state.localOnly = !!res.localOnly; state.submitted = true;
    }
  })();
  render();
  B.init().then(function () { render(); flushOutbox(); }, function () { render(); });
})();
