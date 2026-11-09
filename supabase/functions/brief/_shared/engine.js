/* Salama engine: the rule-based brain shared by the browser and the Supabase edge
 * function. It scores answers against SAFE-A, picks risks, fixes and the first
 * agent, builds the AI prompt from de-identified data only, and validates the
 * model's brief before anything is stored or shown. No DOM, no network.
 * Requires globalThis.SALAMA_CONTENT (content.js) and globalThis.SalamaRedact (redact.js). */
(function (g) {
  "use strict";
  var C = g.SALAMA_CONTENT;
  var E = {};
  var PROMPT_VERSION = "brief-v2";

  // ---------- small utils ----------
  function has(a, k, v) { return Array.isArray(a[k]) && a[k].indexOf(v) >= 0; }
  function arr(a, k) { return Array.isArray(a[k]) ? a[k] : []; }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
  function pick(map, v, d) { return Object.prototype.hasOwnProperty.call(map, v) ? map[v] : (d === undefined ? 0 : d); }
  function tr(obj, lang) { return obj ? (obj[lang] || obj.en || "") : ""; }
  function fill(str, vars) {
    return String(str || "").replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : m; });
  }
  function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lower1(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function joinList(items, lang) {
    var and = lang === "sw" ? " na " : " and ";
    if (items.length <= 1) return items.join("");
    return items.slice(0, -1).join(", ") + and + items[items.length - 1];
  }
  function firstSentence(s) { var m = String(s).match(/^[^.!?]+[.!?]/); return m ? m[0].trim() : String(s); }
  E.fill = fill; E.tr = tr;

  var QUESTIONS = {};
  C.steps.forEach(function (st) { st.questions.forEach(function (q) { QUESTIONS[q.id] = q; }); });
  E.questions = QUESTIONS;

  // ---------- context: country-specific names and helpers ----------
  E.context = function (a, lang) {
    lang = lang || "en";
    var country = a.country || "XX";
    var reg = C.regulators[country] || null;
    var ui = C.ui[lang] || C.ui.en;
    var isKE = country === "KE";
    var currency = isKE ? "KES" : "USD";
    var bands = C.budgetBands[currency];
    var regulatorShort = (reg && reg.short) || ui.generic_regulator;
    var ctx = {
      lang: lang, country: country, countryName: C.countryNames[country] || country, reg: reg,
      isSchool: C.helpers.isSchool(a), servesChildren: C.helpers.servesChildren(a), currency: currency,
      vars: {
        regulator: regulatorShort,
        regulatorOr: regulatorShort,
        learnerSystem: isKE ? (lang === "sw" ? "NEMIS/KEMIS au mtandao wa KNEC" : "NEMIS/KEMIS or the KNEC portal")
          : (lang === "sw" ? "mfumo wa kitaifa wa rekodi za wanafunzi" : "the national learner records system"),
        curriculum: isKE ? (lang === "sw" ? "mtaala wa CBE (CBC) wa KICD" : "the KICD CBE (CBC) curriculum")
          : (lang === "sw" ? "mtaala wa kitaifa wa nchi yenu" : "your national curriculum"),
        b1: bands.b1, b2: bands.b2, b3: bands.b3
      }
    };
    return ctx;
  };

  // ---------- visibility, labels, validation ----------
  E.isVisible = function (q, a, ctx) { return typeof q.when !== "function" || !!q.when(a, ctx); };
  E.visibleQuestions = function (step, a, ctx) {
    return step.questions.filter(function (q) { return E.isVisible(q, a, ctx); });
  };
  E.stepsFor = function (a) {
    // Funders take the funder route after "About you".
    return a.org_type === "funder" ? C.steps.slice(0, 1) : C.steps;
  };
  E.label = function (qid, v, ctx) {
    var q = QUESTIONS[qid];
    if (!q) return String(v);
    if (qid === "country") return C.countryNames[v] || v;
    var o = (q.options || []).filter(function (x) { return x.v === v; })[0];
    return o ? fill(tr(o, ctx.lang), ctx.vars) : String(v);
  };
  E.labels = function (qid, values, ctx) { return (values || []).map(function (v) { return E.label(qid, v, ctx); }); };
  E.missing = function (step, a, ctx) {
    return E.visibleQuestions(step, a, ctx).filter(function (q) {
      if (q.optional) return false;
      var v = a[q.id];
      if (q.type === "multi") return !Array.isArray(v) || v.length === 0;
      return v == null || v === "";
    }).map(function (q) { return q.id; });
  };

  // Keep only visible questions and allowed values: what we score, store and send.
  E.clean = function (a, ctx) {
    var out = {};
    E.stepsFor(a).forEach(function (st) {
      E.visibleQuestions(st, a, ctx).forEach(function (q) {
        var v = a[q.id];
        if (v == null || v === "") return;
        if (q.type === "select") { if (/^[A-Z]{2}$/.test(v) && C.countryNames[v]) out[q.id] = v; return; }
        if (q.type === "textarea" || q.type === "checkbox") return; // stored separately
        var allowed = (q.options || []).map(function (o) { return o.v; });
        if (q.type === "multi") {
          var list = (Array.isArray(v) ? v : []).filter(function (x, i, s) { return allowed.indexOf(x) >= 0 && s.indexOf(x) === i; });
          if (q.max) list = list.slice(0, q.max);
          if (list.length) out[q.id] = list;
        } else if (allowed.indexOf(v) >= 0) out[q.id] = v;
      });
    });
    return out;
  };

  // Free text: redacted, stripped of control/markup characters, capped. Used before storage.
  E.cleanNote = function (text, max) {
    max = max || 280;
    var s = String(text || "").normalize("NFKC");
    s = s.replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g, " ")
      .replace(/[\u{E0000}-\u{E007F}]/gu, "")
      .replace(/[<>{}`]/g, "")
      .replace(/https?:\/\/\S+|www\.\S+/gi, "[LINK]")
      .replace(/\s+/g, " ").trim();
    var r = g.SalamaRedact.redact(s);
    s = r.text;
    if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, "");
    return { text: s, hidden: r.count };
  };

  // ---------- scoring ----------
  var SENSITIVE = ["learner", "photos", "health", "cases"];
  function aiUsed(a) { return !!a.ai_use && a.ai_use !== "none"; }
  function sensitiveInAI(a, ctx) {
    if (!aiUsed(a)) return [];
    return arr(a, "ai_data").filter(function (v) { return SENSITIVE.indexOf(v) >= 0 || v === "names" || v === "finance"; });
  }

  function pillarScores(a, ctx) {
    var SC = pick({ trained: 55, written: 35, none: 0, unsure: 10 }, a.ai_rules) +
      pick({ none: 25, personal: 0, approved: 45, built: 40, unsure: 5 }, a.ai_use);

    var an = 45;
    if (aiUsed(a)) {
      var d = { names: 15, learner: 20, photos: 20, health: 20, cases: 25, finance: 5, cannot_tell: 15 };
      arr(a, "ai_data").forEach(function (v) { an -= d[v] || 0; });
      an = Math.max(0, an);
    }
    an += a.consent ? pick({ signed: 25, digital: 15, general: 10, partner: 8, verbal: 0, unsure: 3 }, a.consent) : 25;
    if (a.registered) an += pick({ yes: 30, applied: 18, no: 0, unsure: 5 }, a.registered);
    else if (a.dp_lead) an += pick({ yes: 30, informal: 15, no: 0, unsure: 5 }, a.dp_lead);
    else an += 15;

    var structured = ["forms", "crm", "gov", "school_mis"].some(function (v) { return has(a, "systems", v); });
    var sys = structured ? 25 : has(a, "systems", "sheets") ? 15 : has(a, "systems", "paper") ? 12 : 5;
    if (has(a, "systems", "whatsapp")) sys -= 10;
    var FE = pick({ mfa: 50, password: 25, shared: 0, unsure: 5 }, a.access) + Math.max(0, sys) +
      pick({ none: 25, personal: 0, approved: 25, built: 25, unsure: 10 }, a.ai_use);

    var flow = a.data_flow ? pick({ forms: 25, email: 12, paper: 12, wa_photos: 0, none: 25 }, a.data_flow)
      : a.data_entry ? pick({ head: 25, ict: 25, clerk: 18, outside: 0, unsure: 5 }, a.data_entry) : 15;
    var EV = pick({ practised: 45, written: 28, no: 0, unsure: 5 }, a.breach) + flow +
      ((a.ai_rules === "written" || a.ai_rules === "trained") ? 15 : 0) +
      ((a.registered === "yes" || a.dp_lead === "yes") ? 15 : 0);

    var dev = (has(a, "devices", "laptops") || has(a, "devices", "programme")) ? 25 : has(a, "devices", "own_phones") ? 18
      : has(a, "devices", "shared_pc") ? 10 : has(a, "devices", "cafe") ? 3 : 10;
    if (has(a, "devices", "cafe")) dev -= 8;
    if (has(a, "devices", "shared_collect")) dev -= 5;
    var ch = arr(a, "channels");
    var chs = (ch.indexOf("whatsapp") >= 0 || ch.indexOf("sms") >= 0 || ch.indexOf("ussd") >= 0) ? 20 : ch.length ? 12 : 8;
    var AD = pick({ good: 30, patchy: 22, offline: 12 }, a.connectivity) + Math.max(0, dev) + chs +
      pick({ yes: 25, partly: 12, no: 0 }, a.continuity);

    return { SC: clamp(SC), AN: clamp(an), FE: clamp(FE), EV: clamp(EV), AD: clamp(AD) };
  }

  function capReasons(a, ctx) {
    var r = [];
    if (a.access === "shared") r.push("shared_logins");
    var crit = arr(a, "ai_data").filter(function (v) { return SENSITIVE.indexOf(v) >= 0 || (v === "names" && ctx.servesChildren); });
    if ((a.ai_use === "personal" || a.ai_use === "unsure") && crit.length) r.push("sensitive_ai");
    if (a.data_entry === "outside") r.push("outside_entry");
    return r;
  }
  var CAP_TEXT = {
    shared_logins: { en: "team logins are shared", sw: "akaunti za timu zinatumiwa kwa pamoja" },
    sensitive_ai: { en: "children's, health or case data has gone into free AI tools", sw: "data za watoto, za afya au za kesi zimeingizwa kwenye zana za AI za bure" },
    outside_entry: { en: "learner records are handled outside the school", sw: "rekodi za wanafunzi zinashughulikiwa nje ya shule" }
  };

  function exposure(a, ctx) {
    var p = 0;
    if (ctx.servesChildren) p += 3;
    if (has(a, "serve", "patients")) p += 2;
    if (has(a, "serve", "refugees")) p += 2;
    if (has(a, "serve", "survivors")) p += 3;
    if (has(a, "serve", "pwd")) p += 1;
    var w = { learner: 3, photos: 3, health: 3, cases: 4, names: 2, cannot_tell: 2 };
    if (aiUsed(a)) arr(a, "ai_data").forEach(function (v) { p += w[v] || 0; });
    if (a.ai_use === "personal") p += 2;
    if (a.access === "shared") p += 2;
    if (a.consent === "verbal" || a.consent === "unsure") p += 2;
    var groups = ["kids_u6", "kids_6_12", "teens", "patients", "refugees", "survivors", "pwd"].filter(function (v) { return has(a, "serve", v); });
    if (ctx.isSchool && !groups.some(function (v) { return /^kids|teens/.test(v); })) groups.unshift("kids_6_12");
    return { level: p >= 9 ? "high" : p >= 5 ? "elevated" : "standard", points: p, groups: groups };
  }

  E.score = function (a, ctx) {
    var pillars = pillarScores(a, ctx);
    var raw = 0;
    C.pillars.forEach(function (p) { raw += pillars[p.id] * p.weight; });
    raw = Math.round(raw);
    var reasons = capReasons(a, ctx);
    var readiness = reasons.length ? Math.min(raw, 39) : raw;
    var band = C.bands.slice().reverse().filter(function (b) { return readiness >= b.min; })[0];
    var unsure = Object.keys(a).filter(function (k) { return a[k] === "unsure"; }).length +
      (has(a, "ai_data", "cannot_tell") ? 1 : 0);
    return { pillars: pillars, raw: raw, readiness: readiness, capped: reasons.length > 0 && raw > 39, capReasons: reasons,
      band: band, exposure: exposure(a, ctx), unsure: unsure };
  };

  // ---------- risks ----------
  function riskList(a, ctx) {
    var out = [];
    function add(id, sev, vars) { out.push({ id: id, sev: sev, vars: vars || {} }); }
    var lang = ctx.lang;
    var sens = sensitiveInAI(a, ctx);
    if (sens.length) add("ai_sensitive", (a.ai_use === "approved" || a.ai_use === "built") ? 8 : 10,
      { items: joinList(sens.map(function (v) { return tr(C.aiDataShort[v], lang); }), lang) });
    if (a.access === "shared") add("shared_logins", 9);
    if (a.data_entry === "outside") add("outside_entry", 8);
    if (a.consent && ["verbal", "unsure"].indexOf(a.consent) >= 0) add("consent_gap", 8, { consent: lower1(E.label("consent", a.consent, ctx)) });
    else if (a.consent && ["general", "partner"].indexOf(a.consent) >= 0) add("consent_gap", 6, { consent: lower1(E.label("consent", a.consent, ctx)) });
    if ((has(a, "tasks", "assessment") || has(a, "tasks", "parent_reports")) && aiUsed(a) &&
        ["learner", "photos", "health"].some(function (v) { return has(a, "ai_data", v); })) add("auto_judgement", 7);
    if (has(a, "ai_data", "cannot_tell")) add("ai_unknown", 7); else if (a.ai_use === "unsure") add("ai_unknown", 6);
    if (a.registered === "no" || a.registered === "unsure") add("not_registered", 6, { registered: lower1(E.label("registered", a.registered, ctx)) });
    else if (a.registered === "applied") add("not_registered", 3, { registered: lower1(E.label("registered", a.registered, ctx)) });
    if (a.dp_lead === "no" || a.dp_lead === "unsure") add("no_dp_lead", 5); else if (a.dp_lead === "informal") add("no_dp_lead", 3);
    if (a.breach === "no" || a.breach === "unsure") add("no_breach", 6);
    if (a.data_flow === "wa_photos") add("partner_whatsapp", 6);
    if (a.access === "password") add("password_only", 5);
    if (a.continuity === "no") add("continuity", 5); else if (a.continuity === "partly") add("continuity", 3);
    if (a.ai_rules === "none" || a.ai_rules === "unsure") add("no_rules", aiUsed(a) ? 5 : 3);
    if (has(a, "devices", "cafe")) add("cafe_devices", 5);
    if (has(a, "systems", "whatsapp")) add("whatsapp_groups", 4);
    if (has(a, "tasks", "assessment") && (a.ai_rules === "none" || a.ai_rules === "unsure")) add("assessment_rules", 4);
    if (has(a, "devices", "shared_collect")) add("shared_collect", 3);
    var langs = arr(a, "languages").filter(function (v) { return v !== "en"; });
    if (langs.length) add("languages", 2, { langs: joinList(E.labels("languages", langs, ctx), lang) });
    if (a.connectivity === "offline") add("offline", 2);
    add("eval_none", 1);
    // stable sort by severity
    return out.map(function (r, i) { r.i = i; return r; }).sort(function (x, y) { return y.sev - x.sev || x.i - y.i; });
  }

  // What changes in the answers if a fix is done (for "+n points").
  var FIX_EFFECT = {
    ai_sensitive: function (a) { var k = arr(a, "ai_data").filter(function (v) { return v === "internal" || v === "nothing"; }); a.ai_data = k.length ? k : ["nothing"]; },
    shared_logins: function (a) { a.access = "mfa"; },
    password_only: function (a) { a.access = "mfa"; },
    outside_entry: function (a) { a.data_entry = "ict"; },
    consent_gap: function (a) { a.consent = "signed"; },
    auto_judgement: function (a) { var k = arr(a, "ai_data").filter(function (v) { return ["learner", "photos", "health"].indexOf(v) < 0; }); a.ai_data = k.length ? k : ["nothing"]; },
    ai_unknown: function (a) { a.ai_use = "approved"; var k = arr(a, "ai_data").filter(function (v) { return v !== "cannot_tell"; }); a.ai_data = k.length ? k : ["nothing"]; },
    not_registered: function (a) { a.registered = "yes"; },
    no_dp_lead: function (a) { a.dp_lead = "yes"; },
    no_breach: function (a) { a.breach = "written"; },
    partner_whatsapp: function (a) { a.data_flow = "forms"; },
    continuity: function (a) { a.continuity = "yes"; },
    no_rules: function (a) { a.ai_rules = "written"; },
    cafe_devices: function (a) { a.devices = arr(a, "devices").filter(function (v) { return v !== "cafe"; }).concat(has(a, "devices", "programme") ? [] : ["programme"]); },
    whatsapp_groups: function (a) { a.systems = arr(a, "systems").filter(function (v) { return v !== "whatsapp"; }); },
    shared_collect: function (a) { a.devices = arr(a, "devices").filter(function (v) { return v !== "shared_collect"; }); }
  };
  function pointsFor(id, a, ctx, base) {
    var f = FIX_EFFECT[id];
    if (!f) return 0;
    var b = JSON.parse(JSON.stringify(a));
    f(b);
    return Math.max(0, E.score(b, ctx).readiness - base);
  }

  function strengths(a, ctx) {
    var s = [];
    if (a.access === "mfa") s.push("mfa");
    if (a.ai_rules === "trained") s.push("rules_trained"); else if (a.ai_rules === "written") s.push("rules_written");
    if (a.breach === "practised") s.push("breach_practised"); else if (a.breach === "written") s.push("breach_written");
    if (a.consent === "signed") s.push("consent_signed");
    if (a.registered === "yes") s.push("registered");
    if (a.dp_lead === "yes") s.push("dp_lead");
    if (a.data_flow === "forms") s.push("forms");
    if (a.data_entry === "head" || a.data_entry === "ict") s.push("school_entry");
    if (a.continuity === "yes") s.push("continuity");
    if (a.ai_use === "none") s.push("ai_none"); else if (a.ai_use === "approved" || a.ai_use === "built") s.push("ai_approved");
    if (aiUsed(a) && arr(a, "ai_data").length && arr(a, "ai_data").every(function (v) { return v === "nothing" || v === "internal"; })) s.push("no_sensitive");
    if (a.connectivity === "good") s.push("connectivity");
    return s.slice(0, 4);
  }

  // ---------- recommendation ----------
  E.recommend = function (a, ctx, sc) {
    var tasks = arr(a, "tasks");
    var safeguardOk = sc.readiness >= 65 && (!ctx.servesChildren || a.consent === "signed");
    var blocked = [];
    var best = null, bestS = 0;
    C.agents.forEach(function (ag) {
      var s = 0;
      ag.tasks.forEach(function (t) { var i = tasks.indexOf(t); if (i >= 0) s += 3 + (3 - i) * 0.5; });
      if (ag.id === "safeguard" && s > 0 && !safeguardOk) { blocked.push(ag.id); return; }
      if (ag.id === "meal" && ctx.isSchool) s -= 1;
      if (ag.id === "teacher" && !ctx.isSchool && !has(a, "serve", "teachers")) s -= 0.5;
      if (s > bestS) { bestS = s; best = ag; }
    });
    if (!best) best = C.agents.filter(function (x) { return x.id === "knowledge"; })[0];
    return { foundations: sc.readiness < 40, agent: best, blocked: blocked };
  };

  // ---------- lead score (council/01-product.md) ----------
  E.lead = function (a, ctx, sc, extra) {
    extra = extra || {};
    var fit = pick({ s1: 3, s2: 10, s3: 12, s4: 6 }, a.staff) +
      (["ngo", "ingo"].indexOf(a.org_type) >= 0 ? 8 : C.govTypes.indexOf(a.org_type) >= 0 ? 1 : 4) +
      ((ctx.servesChildren || has(a, "serve", "patients")) ? 5 : 0);
    var budgetPts = pick({ b4: 12, b3: 12, b2: 8, b1: 5, b0: 0, funder: 6 }, a.budget, -1);
    var payPts = pick({ line: 10, move: 7, funder: 7, proposal: 5, none: 0, unsure: 2 }, a.pay_path);
    var intent = pick({ now: 15, soon: 15, later: 8, explore: 2 }, a.timeline) + Math.min(12, Math.max(budgetPts, payPts)) +
      pick({ conditions: 8, asked: 6, unsure: 2 }, a.funder_asked);
    var authority = pick({ approve: 15, recommend: 8, board: 6, info: 3 }, a.role);
    var urgency = (["report", "proposal", "diligence", "yearend"].some(function (v) { return has(a, "triggers", v); }) ? 6 : 0) +
      ((a.templates === "t3" || a.templates === "t4" || a.report_days === "d3" || a.report_days === "d4") ? 3 : 0) +
      (sc.exposure.level === "high" ? 6 : 0);
    var behaviour = (extra.brief ? 4 : 0) + (extra.shared ? 3 : 0) + (extra.rating >= 4 ? 3 : 0);
    var ref = /^fnd-/.test(extra.ref || "") ? 10 : 0;
    var total = Math.min(100, fit + intent + authority + urgency + behaviour + ref);
    return { score: total, parts: { fit: fit, intent: intent, authority: authority, urgency: urgency, behaviour: behaviour, ref: ref } };
  };
  E.temperature = function (lead, contactable, booked) {
    if (booked || (lead >= 65 && contactable)) return "hot";
    if (lead >= 40) return "warm";
    return "cold";
  };

  // ---------- pricing ----------
  E.segment = function (a) {
    if (a.staff === "s4" || a.org_type === "ingo") return "large";
    if (a.staff === "s1" || ["cbo", "fbo", "school_public"].indexOf(a.org_type) >= 0) return "small";
    return "mid";
  };
  E.money = function (n, currency) {
    var s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return currency === "KES" ? "KES " + s : "US$" + s;
  };

  // ---------- the full rule-based report ----------
  E.build = function (rawAnswers, lang, opts) {
    opts = opts || {};
    lang = lang || "en";
    var ctx0 = E.context(rawAnswers, lang);
    var a = E.clean(rawAnswers, ctx0);
    var ctx = E.context(a, lang);
    var ui = C.ui[lang] || C.ui.en;
    var sc = E.score(a, ctx);
    var rec = E.recommend(a, ctx, sc);
    var risks = riskList(a, ctx);
    var top = risks.slice(0, 3);
    function riskText(r) {
      var d = C.risks[r.id];
      var vars = Object.assign({}, ctx.vars, r.vars);
      return {
        id: r.id, sev: r.sev,
        title: fill(tr(d.title, lang), vars), why: fill(tr(d.why, lang), vars), fix: fill(tr(d.fix, lang), vars),
        short: fill(tr(d.short, lang), vars), owner: tr(d.owner, lang), cost: d.cost,
        costLabel: ui["cost_" + d.cost], points: pointsFor(r.id, a, ctx, sc.readiness)
      };
    }
    var fixes = top.map(riskText);
    var more = risks.slice(3).filter(function (r) { return r.sev >= 3; }).map(riskText);

    var diagnosis;
    var serious = fixes.filter(function (f) { return f.sev >= 4; });
    if (!serious.length) diagnosis = ui.diag_none;
    else {
      var s1 = serious[0].short, s2 = serious[1] ? serious[1].short : "";
      diagnosis = cap1(s1) + (s2 ? (lang === "sw" ? ", na " : ", and ") + s2 : "") +
        (lang === "sw" ? ". Hapo ndipo hatari yenu kubwa ilipo kwa sasa." : ". That is your biggest exposure right now.");
    }

    var agentName = tr(rec.agent.name, lang);
    var agentBlock = rec.foundations ? {
      foundations: true, id: "foundations", name: tr(C.foundations.name, lang),
      desc: tr(C.foundations.desc, lang), guardrails: (C.foundations.guardrails[lang] || C.foundations.guardrails.en).slice(),
      next: { id: rec.agent.id, name: agentName }
    } : {
      foundations: false, id: rec.agent.id, name: agentName, tier: rec.agent.tier,
      desc: fill(tr(rec.agent.desc, lang), ctx.vars), guardrails: (rec.agent.guardrails[lang] || rec.agent.guardrails.en).slice()
    };
    agentBlock.blocked = rec.blocked.map(function (id) {
      var ag = C.agents.filter(function (x) { return x.id === id; })[0];
      return fill(ui.agent_blocked, { agent: tr(ag.name, lang) });
    });

    var time = [];
    if (a.report_days && ["d1", "d2", "d3", "d4"].indexOf(a.report_days) >= 0) {
      var days = lower1(E.label("report_days", a.report_days, ctx));
      time.push(a.templates ? fill(ui.time_report, { days: days, templates: E.label("templates", a.templates, ctx) }) : fill(ui.time_report_nt, { days: days }));
    }
    if (a.teacher_hours && a.teacher_hours !== "unsure") time.push(fill(ui.time_teacher, { hours: lower1(E.label("teacher_hours", a.teacher_hours, ctx)) }));

    var firstTask = arr(a, "tasks")[0];
    var taskLabel = firstTask ? lower1(E.label("tasks", firstTask, ctx)).replace(/ \((higher risk|hatari kubwa)\)$/, "") : (lang === "sw" ? "ripoti" : "reporting");
    var plan = [
      { week: 1, action: fill(tr(C.plan.w1, lang), { risk: fixes[0] ? fixes[0].short : "" }) },
      { week: 2, action: fill(tr(C.plan.w2, lang), { task: taskLabel }) },
      { week: 3, action: rec.foundations ? tr(C.plan.w3_found, lang) : fill(tr(C.plan.w3_agent, lang), { agent: agentName }) },
      { week: 4, action: tr(C.plan.w4, lang) }
    ];
    var planNote = ctx.isSchool ? tr(ctx.country === "KE" ? C.plan.school_ke : C.plan.school, lang) : "";

    var seg = E.segment(a);
    var prices = C.offers.segments[seg][ctx.currency];
    var offerIds = rec.foundations ? ["sprint", "audit", "funder"] : sc.readiness >= 80 ? ["pilot", "audit", "funder"] : ["audit", "pilot", "funder"];
    var offers = offerIds.map(function (id) {
      var it = C.offers.items[id];
      return { id: id, name: tr(it.name, lang), desc: tr(it.desc, lang), price: prices[id] ? fill(ui.from, { price: E.money(prices[id], ctx.currency) }) : "" };
    });

    var board = {
      decisions: [tr(C.board.decisions.policy, lang), tr(C.board.decisions.lead, lang),
        rec.foundations ? tr(C.board.decisions.sprint, lang) : fill(tr(C.board.decisions.pilot, lang), { agent: agentName })],
      questions: C.board.questions.map(function (q) { return fill(tr(q, lang), ctx.vars); }),
      request: fill(tr(C.board.request, lang), {
        task: taskLabel, band: tr(sc.band.name, lang), score: sc.readiness,
        fix1: fixes[0] ? firstSentence(fixes[0].fix) : "", fix2: fixes[1] ? firstSentence(fixes[1].fix) : "", fix3: fixes[2] ? firstSentence(fixes[2].fix) : "",
        price: E.money(prices[rec.foundations ? "sprint" : "audit"], ctx.currency),
        line: tr(C.board.lines[{ line: "line", move: "move", proposal: "proposal", funder: "funder" }[a.pay_path] || "other"], lang)
      })
    };

    var legal = C.legalNotes.filter(function (n) { return n.when(a, ctx); }).slice(0, 3).map(function (n) { return tr(n, lang); });

    var strengthsText = strengths(a, ctx).map(function (id) { return fill(tr(C.strengths[id], lang), ctx.vars); });

    var stakes = (sc.exposure.level !== "standard" && sc.exposure.groups.length)
      ? fill(ui.stakes_line, { groups: joinList(E.labels("serve", sc.exposure.groups, ctx).map(lower1), lang) }) : "";

    return {
      version: C.version, schemaVersion: C.schemaVersion, lang: lang,
      date: opts.date || new Date().toISOString().slice(0, 10),
      answers: a, ctx: { country: ctx.country, countryName: ctx.countryName, isSchool: ctx.isSchool, currency: ctx.currency, servesChildren: ctx.servesChildren },
      orgTypeLabel: a.org_type ? E.label("org_type", a.org_type, ctx) : "",
      score: {
        readiness: sc.readiness, raw: sc.raw, capped: sc.capped, capReasons: sc.capReasons,
        capText: sc.capReasons.map(function (r) { return tr(CAP_TEXT[r], lang); }),
        band: { id: sc.band.id, name: tr(sc.band.name, lang), desc: tr(sc.band.desc, lang) },
        pillars: C.pillars.map(function (p) { return { id: p.id, name: tr(p.name, lang), desc: tr(p.desc, lang), value: sc.pillars[p.id] }; }),
        exposure: sc.exposure.level, stakes: stakes, unsure: sc.unsure
      },
      diagnosis: diagnosis, strengths: strengthsText, fixes: fixes, more: more, agent: agentBlock,
      time: time, board: board, plan: plan, planNote: planNote, legal: legal, offers: offers, segment: seg,
      lead: E.lead(a, ctx, sc, opts.extra)
    };
  };

  // ---------- AI brief: de-identified profile, prompt, schema, validation ----------
  var PROFILE_KEYS = [
    ["org_type", "organisation_type"], ["country", "country"], ["staff", "paid_staff"], ["collectors", "data_collectors"],
    ["serve", "serves"], ["levels", "school_levels"], ["tasks", "top_tasks"], ["report_days", "staff_days_on_donor_reports"],
    ["templates", "donor_templates"], ["teacher_hours", "teacher_hours_per_week_on_planning"], ["ai_use", "ai_use"],
    ["ai_data", "put_into_ai_in_last_3_months"], ["ai_rules", "written_ai_rules"], ["registered", "registered_with_authority"],
    ["dp_lead", "data_protection_lead"], ["consent", "child_consent_recording"], ["access", "staff_logins"],
    ["systems", "where_personal_data_lives"], ["data_flow", "how_partner_data_arrives"], ["data_entry", "who_enters_learner_data"],
    ["breach", "breach_plan"], ["connectivity", "connectivity"], ["devices", "devices"], ["channels", "channels"],
    ["languages", "languages"], ["continuity", "continuity_if_data_lead_left"]
  ];
  // Commercial answers (timeline, budget, role, triggers, funder) and free text are never sent.
  E.aiPayload = function (report) {
    var a = report.answers;
    var ctx = E.context(a, "en");
    var profile = {};
    PROFILE_KEYS.forEach(function (k) {
      var v = a[k[0]];
      if (v == null) return;
      profile[k[1]] = Array.isArray(v) ? E.labels(k[0], v, ctx) : E.label(k[0], v, ctx);
    });
    // rules result is rebuilt in the target language
    var r = report;
    var rules = {
      score: r.score.readiness, band: r.score.band.name,
      critical: { flag: r.score.capReasons.length > 0, reason: r.score.capText.join("; ") || null },
      exposure: r.score.exposure,
      pillars: r.score.pillars.reduce(function (o, p) { o[p.id] = p.value; return o; }, {}),
      risks: r.fixes.map(function (f) { return { id: f.id, title: f.title, why: f.why, fix: f.fix }; }),
      agent: { id: r.agent.id, name: r.agent.name, job: r.agent.desc, base_guardrails: r.agent.guardrails.slice(0, 3) },
      plan: r.plan.map(function (p) { return p.action; })
    };
    var reg = C.regulators[a.country] || null;
    var law = { country: C.countryNames[a.country] || a.country, law_name: reg ? reg.law : null, regulator_name: reg ? reg.authority : null };
    return { profile: profile, rules: rules, law: law };
  };

  E.prompt = function (report) {
    var lang = report.lang;
    var ui = C.ui[lang] || C.ui.en;
    var p = E.aiPayload(report);
    var langName = lang === "sw" ? "standard Kiswahili (Kiswahili sanifu, not Sheng)" : "English";
    var system = [
      "You write a short AI readiness brief for a busy programme manager at an NGO, school or education programme, in any country. Assume nothing about region. A program parses your reply: return exactly one JSON object, no other text, no code fences.",
      "",
      "RULES",
      "1. Use only facts in PROFILE, RULES_RESULT and LAW. Never assume. Treat \"Not sure\" answers as gaps worth checking.",
      "2. Never write a number, percentage or statistic that is not in the input, except week numbers 1 to 4.",
      "3. Score, band, critical failure, exposure, the 3 risks and the agent were set by fixed SAFE-A rules. Explain and tailor them; never change, re-rank, soften or contradict them. Use the band label exactly as given. Copy ids exactly.",
      "4. If RULES_RESULT.critical.flag is true, open the summary with critical.reason and say it caps the score until fixed.",
      "5. Law: name only LAW.law_name and LAW.regulator_name. If law_name is null, write \"" + ui.generic_law + "\". Never name another law or regulator, cite sections, articles, fines, deadlines or penalties, or say the organisation is or is not compliant. End every compliance note with \"" + ui.adviser_phrase + "\"",
      "6. Never ask for, guess or write names, contact details, ID numbers, exact places or details of any individual. Questions must be answerable without personal data.",
      "7. Write every value in " + langName + "; keep keys, ids and law names unchanged. Short plain sentences; no jargon, markdown, HTML, links, emojis, em dashes or en dashes.",
      "8. If RULES_RESULT.agent.id is \"foundations\", present the Foundations Sprint as the first step, not an AI agent.",
      "",
      "OUTPUT: exactly these keys; max characters in brackets",
      "{\"summary\": \"2-3 sentences: band label and the single most important next step (400)\",",
      " \"risks\": [3, same order and ids as RULES_RESULT.risks: {\"id\": \"\", \"title\": \"(60)\", \"why\": \"tied to their answers (220)\", \"fix\": \"one concrete action (220)\"}],",
      " \"agent\": {\"id\": \"\", \"name\": \"\", \"what_it_does\": \"applied to their top tasks (240)\", \"guardrails\": [3, adapted from base_guardrails (140 each)], \"first_test\": \"one small supervised test on dummy or de-identified data (240)\"},",
      " \"plan\": [4: {\"week\": 1, \"action\": \"adapts RULES_RESULT.plan for that week (160)\"}],",
      " \"compliance\": [2-3 notes (250 each, adviser phrase included)],",
      " \"questions\": [2 discovery questions about gaps in their answers (160 each)]}"
    ].join("\n");
    var user = "PROFILE: " + JSON.stringify(p.profile) + "\nRULES_RESULT: " + JSON.stringify(p.rules) + "\nLAW: " + JSON.stringify(p.law);
    return { version: PROMPT_VERSION, system: system, user: user, payload: p, combined: system + "\n\nINPUT\n" + user };
  };

  var AGENT_IDS = ["meal", "grant", "teacher", "dq", "parent", "knowledge", "safeguard", "foundations"];
  E.BRIEF_SCHEMA = {
    type: "object", additionalProperties: false, required: ["summary", "risks", "agent", "plan", "compliance", "questions"],
    properties: {
      summary: { type: "string", minLength: 40, maxLength: 400 },
      risks: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: false, required: ["id", "title", "why", "fix"],
        properties: { id: { type: "string" }, title: { type: "string", maxLength: 60 }, why: { type: "string", maxLength: 220 }, fix: { type: "string", maxLength: 220 } } } },
      agent: { type: "object", additionalProperties: false, required: ["id", "name", "what_it_does", "guardrails", "first_test"],
        properties: { id: { type: "string", enum: AGENT_IDS }, name: { type: "string", maxLength: 60 }, what_it_does: { type: "string", maxLength: 240 },
          guardrails: { type: "array", minItems: 3, maxItems: 3, items: { type: "string", maxLength: 140 } }, first_test: { type: "string", maxLength: 240 } } },
      plan: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", additionalProperties: false, required: ["week", "action"],
        properties: { week: { type: "integer", minimum: 1, maximum: 4 }, action: { type: "string", maxLength: 160 } } } },
      compliance: { type: "array", minItems: 2, maxItems: 3, items: { type: "string", maxLength: 250 } },
      questions: { type: "array", minItems: 2, maxItems: 2, items: { type: "string", maxLength: 160 } }
    }
  };
  // The copy sent to the API: length/count/range keywords removed (the validator enforces them).
  E.wireSchema = function () {
    var drop = ["minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum", "pattern"];
    return JSON.parse(JSON.stringify(E.BRIEF_SCHEMA), function (k, v) { return drop.indexOf(k) >= 0 ? undefined : v; });
  };

  function cleanStr(s, max) {
    s = String(s == null ? "" : s).normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g, " ")
      .replace(/[\u{E0000}-\u{E007F}]/gu, "")
      .replace(/[*#<>`]/g, "")
      .replace(/(\d)\s*[‒-―]\s*(\d)/g, "$1-$2")
      .replace(/\s*[‒-―]\s*/g, ", ")
      .replace(/\s+/g, " ").trim();
    if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, "").replace(/[,;:]$/, "") + ".";
    return s;
  }
  var ACRONYM_OK = ["AI", "NGO", "NGOs", "CBO", "INGO", "MEAL", "SMS", "USSD", "SAFE", "ICT", "TEHAMA", "KPSEA", "KJSEA", "KCSE", "CBE", "CBC", "KICD", "KNEC", "NEMIS", "KEMIS", "ODPC", "NACOSTI", "STOP"];
  function fieldProblems(s, inputText, lang, bandName) {
    if (!s) return "empty";
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(s)) return "email";
    if (/https?:\/\/|www\./i.test(s)) return "url";
    if (/\d{7,}/.test(s)) return "digits";
    if (/\[[A-Z]+_\d+\]/.test(s)) return "token";
    var nums = s.match(/\d+/g) || [];
    for (var i = 0; i < nums.length; i++) {
      if (["1", "2", "3", "4"].indexOf(nums[i]) < 0 && inputText.indexOf(nums[i]) < 0) return "number";
    }
    if (/%|\bpercent\b|\basilimia\b/i.test(s) && !/%|percent|asilimia/i.test(inputText)) return "percent";
    var ac = s.match(/\b[A-Z]{3,}s?\b/g) || [];
    for (var j = 0; j < ac.length; j++) {
      if (ACRONYM_OK.indexOf(ac[j]) < 0 && inputText.indexOf(ac[j]) < 0) return "acronym";
    }
    var others = [];
    C.bands.forEach(function (b) { ["en", "sw"].forEach(function (l) { var n = b.name[l]; if (n !== bandName && n !== "Building" && n !== "Mnajenga") others.push(n); }); });
    for (var k = 0; k < others.length; k++) if (s.indexOf(others[k]) >= 0) return "band";
    return null;
  }
  var COMPLIANCE_BAD = /\b(sections?|articles?|fines?|faini|penalt\w*|adhabu|deadlines?|kifungu|ibara)\b|\bs\.\s?\d|regulation \d/i;

  E.validateBrief = function (raw, report) {
    var lang = report.lang, ui = C.ui[lang] || C.ui.en;
    var p = E.aiPayload(report);
    var rules = p.rules;
    var inputText = JSON.stringify(p) + " " + JSON.stringify(report.fixes) + " " + report.score.readiness;
    var patched = [];
    var obj = raw;
    if (typeof raw === "string") {
      var t = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "");
      var i0 = t.indexOf("{"), i1 = t.lastIndexOf("}");
      try { obj = JSON.parse(t.slice(i0, i1 + 1)); } catch (e) { return { ok: false, reason: "parse" }; }
    }
    if (!obj || typeof obj !== "object") return { ok: false, reason: "parse" };

    function field(val, max, fallback, name) {
      var s = cleanStr(val, max);
      var prob = fieldProblems(s, inputText, lang, rules.band);
      if (prob) { patched.push(name + ":" + prob); return fallback; }
      return s;
    }
    var out = {};
    // summary
    var sum = cleanStr(obj.summary, 400);
    if (!sum || sum.length < 40 || fieldProblems(sum, inputText, lang, rules.band)) return { ok: false, reason: "summary" };
    out.summary = sum;
    // risks: locked ids and order
    var rIn = Array.isArray(obj.risks) ? obj.risks : [];
    out.risks = report.fixes.map(function (f, i) {
      var r = rIn[i] && typeof rIn[i] === "object" ? rIn[i] : {};
      if (r.id !== f.id) { patched.push("risks[" + i + "]:id"); return { id: f.id, title: f.title, why: f.why, fix: f.fix }; }
      return { id: f.id, title: field(r.title, 60, f.title, "risks[" + i + "].title"), why: field(r.why, 220, f.why, "risks[" + i + "].why"), fix: field(r.fix, 220, f.fix, "risks[" + i + "].fix") };
    });
    // agent: id and name locked
    var ag = obj.agent && typeof obj.agent === "object" ? obj.agent : {};
    var base = report.agent;
    var guards = Array.isArray(ag.guardrails) && ag.guardrails.length === 3 ? ag.guardrails.map(function (gr, i) { return field(gr, 140, base.guardrails[i] || base.guardrails[0], "agent.guardrails[" + i + "]"); }) : (patched.push("agent.guardrails"), base.guardrails.slice(0, 3));
    out.agent = {
      id: base.id, name: base.name,
      what_it_does: field(ag.what_it_does, 240, base.desc, "agent.what_it_does"),
      guardrails: guards,
      first_test: field(ag.first_test, 240, lang === "sw" ? "Jaribuni kwa mifano 20 isiyo na utambulisho, mtu akiidhinisha kila matokeo." : "Run it on 20 de-identified examples, with a person approving every output.", "agent.first_test")
    };
    // plan: weeks locked
    var pl = Array.isArray(obj.plan) ? obj.plan : [];
    out.plan = report.plan.map(function (w, i) {
      var x = pl[i] && typeof pl[i] === "object" ? pl[i] : {};
      return { week: i + 1, action: field(x.action, 160, w.action, "plan[" + i + "]") };
    });
    // compliance: strict filters, adviser phrase appended
    var law = p.law;
    var comp = (Array.isArray(obj.compliance) ? obj.compliance : []).map(function (c) { return cleanStr(c, 250); }).filter(function (c) {
      if (!c || fieldProblems(c, inputText, lang, rules.band)) return false;
      if (COMPLIANCE_BAD.test(c)) return false;
      var rest = c;
      [law.law_name, law.regulator_name, ui.generic_law].forEach(function (n) { if (n) rest = rest.split(n).join(""); });
      if (/\b(Act|GDPR|Regulations?|Directive|Ordinance)\b|sheria ya/.test(rest)) return false;
      return true;
    }).map(function (c) { return c.indexOf(ui.adviser_phrase) >= 0 ? c : c.replace(/[.\s]*$/, ".") + " " + ui.adviser_phrase; }).slice(0, 3);
    if (comp.length < 2) { patched.push("compliance"); comp = report.legal.slice(0, 3).map(function (n) { return n + " " + ui.adviser_phrase; }); }
    out.compliance = comp;
    // questions
    var qs = (Array.isArray(obj.questions) ? obj.questions : []).slice(0, 2);
    out.questions = [0, 1].map(function (i) { return field(qs[i], 160, report.board.questions[i], "questions[" + i + "]"); });

    // language check on summary + risks
    var text = (out.summary + " " + out.risks.map(function (r) { return r.title + " " + r.why + " " + r.fix; }).join(" ")).toLowerCase();
    function count(words) { return words.reduce(function (n, w) { var m = text.match(new RegExp("\\b" + w + "\\b", "g")); return n + (m ? m.length : 0); }, 0); }
    var en = count(["the", "and", "of", "your", "to", "is"]), sw = count(["na", "ya", "wa", "kwa", "ni", "la"]);
    if ((lang === "sw" && sw <= en) || (lang !== "sw" && en <= sw)) return { ok: false, reason: "language" };
    if (patched.length >= 4) return { ok: false, reason: "patched", patched: patched };
    return { ok: true, brief: out, patched: patched, promptVersion: PROMPT_VERSION };
  };

  // ---------- JSON Schema for stored answers (fed to pg_jsonschema by scripts/gen-sql.mjs) ----------
  E.answersJsonSchema = function () {
    var props = {};
    C.steps.forEach(function (st) {
      st.questions.forEach(function (q) {
        if (q.type === "textarea" || q.type === "checkbox") return;
        if (q.type === "select") { props[q.id] = { type: "string", pattern: "^[A-Z]{2}$" }; return; }
        var vals = (q.options || []).map(function (o) { return o.v; });
        props[q.id] = q.type === "multi"
          ? { type: "array", uniqueItems: true, maxItems: q.max || vals.length, items: { enum: vals } }
          : { enum: vals };
      });
    });
    return { type: "object", additionalProperties: false, required: ["org_type", "country"], properties: props };
  };

  E.EVENTS = ["page_view", "demo_used", "check_start", "step_done", "report_view", "brief_request", "brief_shown",
    "brief_failed", "download", "share", "copy", "contact_submit", "feedback", "lang_toggle", "cta_click", "funder_route", "clear_device"];

  // ---------- plain-text export (download and copy) ----------
  E.reportText = function (r, brief) {
    var ui = C.ui[r.lang] || C.ui.en;
    var L = [];
    L.push("# " + ui.rep_eyebrow);
    L.push(fill(ui.rep_for, { type: r.orgTypeLabel, country: r.ctx.countryName, date: r.date }));
    L.push("");
    L.push(fill(ui.score_line, { s: r.score.readiness, band: r.score.band.name }));
    if (r.score.capReasons.length) L.push(fill(ui.cap_note, { reason: r.score.capText.join("; ") }));
    if (r.score.stakes) L.push(r.score.stakes);
    L.push(r.diagnosis);
    L.push("");
    L.push("## " + ui.pillars_heading);
    r.score.pillars.forEach(function (p) { L.push("- " + p.name + ": " + p.value + "/100"); });
    if (r.strengths.length) { L.push(""); L.push("## " + ui.strengths_title); r.strengths.forEach(function (s) { L.push("- " + s); }); }
    L.push(""); L.push("## " + ui.fixes_title);
    r.fixes.forEach(function (f, i) {
      L.push((i + 1) + ". " + f.title);
      L.push("   " + f.why);
      L.push("   " + f.fix);
      L.push("   " + ui.fix_owner + ": " + f.owner + ". " + ui.fix_cost + ": " + f.costLabel + "." + (f.points ? " " + fill(ui.fix_points, { n: f.points }) : ""));
    });
    L.push(""); L.push("## " + (r.agent.foundations ? ui.foundations_title : ui.agent_title));
    L.push(r.agent.name + ": " + r.agent.desc);
    r.agent.guardrails.forEach(function (gr) { L.push("- " + gr); });
    if (r.time.length) { L.push(""); L.push("## " + ui.time_title); r.time.forEach(function (t) { L.push(t); }); L.push(ui.time_note); }
    L.push(""); L.push("## " + ui.board_title);
    L.push(ui.board_decisions + ":"); r.board.decisions.forEach(function (d, i) { L.push((i + 1) + ". " + d); });
    L.push(ui.board_questions + ":"); r.board.questions.forEach(function (q, i) { L.push((i + 1) + ". " + q); });
    L.push(""); L.push("## " + ui.plan_title);
    r.plan.forEach(function (p) { L.push(fill(ui.week, { n: p.week }) + ": " + p.action); });
    if (r.planNote) L.push(r.planNote);
    if (r.legal.length) { L.push(""); L.push("## " + ui.legal_title); r.legal.forEach(function (n) { L.push("- " + n); }); L.push(ui.legal_note); }
    if (brief) {
      L.push(""); L.push("## " + ui.ai_title);
      L.push(brief.summary);
      brief.risks.forEach(function (x) { L.push("- " + x.title + ": " + x.why + " " + x.fix); });
      L.push(ui.ai_first_test + ": " + brief.agent.first_test);
      brief.plan.forEach(function (p) { L.push(fill(ui.week, { n: p.week }) + ": " + p.action); });
      brief.compliance.forEach(function (c) { L.push("- " + c); });
      L.push(ui.ai_disclaimer);
    }
    L.push(""); L.push("## " + ui.budget_line_title); L.push(r.board.request);
    L.push(""); L.push(fill(ui.rep_footer, { date: r.date }));
    L.push("Salama Agents · SAFE-A v0.1");
    return L.join("\n");
  };

  E.PROMPT_VERSION = PROMPT_VERSION;
  g.SalamaEngine = E;
})(globalThis);
