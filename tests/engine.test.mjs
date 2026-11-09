// node tests/engine.test.mjs  — rule engine and brief validator checks (council/06-ai-engineer.md eval profiles)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("../src/content.js"); require("../src/redact.js"); require("../src/engine.js");
const E = globalThis.SalamaEngine;

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log("  FAIL " + msg); } else console.log("  ok   " + msg); };

const P = {
  kenyaCapped: { org_type: "ngo", country: "KE", staff: "s2", collectors: "c2", serve: ["kids_6_12", "adults"], tasks: ["reporting", "data_cleaning"],
    report_days: "d3", templates: "t3", ai_use: "personal", ai_data: ["names", "learner"], ai_rules: "none", registered: "unsure",
    consent: "general", access: "shared", systems: ["forms", "sheets", "whatsapp"], data_flow: "wa_photos", breach: "no",
    connectivity: "patchy", devices: ["laptops", "own_phones"], channels: ["whatsapp"], languages: ["en", "sw"], continuity: "no",
    timeline: "soon", triggers: ["report"], pay_path: "move", funder_asked: "asked", role: "recommend" },
  tzSchool: { org_type: "school_network", country: "TZ", staff: "s2", collectors: "c1", serve: ["kids_6_12", "teens"], levels: ["upper", "junior"],
    tasks: ["lessons", "assessment"], teacher_hours: "h3", ai_use: "personal", ai_data: ["internal"], ai_rules: "none", registered: "no",
    consent: "signed", access: "password", systems: ["paper", "gov"], data_entry: "clerk", breach: "no", connectivity: "offline",
    devices: ["own_phones", "shared_pc"], channels: ["sms", "meetings"], languages: ["sw"], continuity: "partly",
    timeline: "later", pay_path: "none", funder_asked: "no", role: "approve" },
  ukIngo: { org_type: "ingo", country: "GB", staff: "s4", collectors: "c3", serve: ["adults", "refugees"], tasks: ["safeguarding", "reporting"],
    report_days: "d4", templates: "t4", ai_use: "approved", ai_data: ["internal"], ai_rules: "trained", registered: "yes",
    access: "mfa", systems: ["crm", "forms"], data_flow: "forms", breach: "practised", connectivity: "good",
    devices: ["laptops", "programme"], channels: ["whatsapp", "sms"], languages: ["en", "ar"], continuity: "yes",
    timeline: "now", triggers: ["diligence"], pay_path: "line", funder_asked: "conditions", role: "approve", budget: "b4" },
  phBlocked: { org_type: "social", country: "PH", staff: "s2", serve: ["kids_6_12"], tasks: ["safeguarding"], report_days: "d2", templates: "t1",
    ai_use: "approved", ai_data: ["internal"], ai_rules: "written", consent: "digital", access: "mfa", systems: ["crm"], data_flow: "forms",
    breach: "written", connectivity: "good", devices: ["laptops"], channels: ["app"], languages: ["en", "tl"], continuity: "yes",
    timeline: "soon", pay_path: "line", funder_asked: "no", role: "approve" },
  peruCbo: { org_type: "cbo", country: "PE", staff: "s1", serve: ["refugees", "adults"], tasks: ["proposals"], report_days: "unsure",
    ai_use: "unsure", ai_data: ["cannot_tell"], ai_rules: "unsure", access: "unsure", systems: ["unsure"], data_flow: "paper",
    breach: "unsure", connectivity: "offline", devices: ["own_phones"], channels: ["calls"], languages: ["es", "local"], continuity: "no",
    timeline: "explore", pay_path: "unsure", funder_asked: "unsure", role: "info" },
  missingLaw: { org_type: "ngo", country: "XX", staff: "s2", serve: ["adults"], tasks: ["knowledge"], report_days: "unsure",
    ai_use: "none", ai_rules: "none", access: "unsure", systems: ["unsure"], data_flow: "none", breach: "unsure",
    connectivity: "patchy", devices: ["laptops"], channels: ["meetings"], languages: ["en"], continuity: "partly",
    timeline: "explore", pay_path: "none", funder_asked: "no", role: "info", hidden_extra: "<script>x</script>", tasks_bogus: ["x"] }
};

console.log("1. Kenya NGO, children's data in free AI + shared logins");
let r = E.build(P.kenyaCapped, "en", { date: "2026-10-19" });
ok(r.score.readiness <= 39, "capped at 39 (got " + r.score.readiness + ", raw " + r.score.raw + ")");
ok(r.score.capReasons.includes("shared_logins") && r.score.capReasons.includes("sensitive_ai"), "both cap reasons present");
ok(r.score.band.id === "foundations", "band Foundations first");
ok(r.fixes[0].id === "ai_sensitive" && r.fixes[1].id === "shared_logins", "top risks ordered: " + r.fixes.map(f => f.id).join(","));
ok(r.agent.foundations && r.agent.next.id === "meal", "Foundations Sprint, then MEAL agent");
ok(r.score.exposure === "high" && r.score.stakes.length > 0, "high exposure with stakes line: " + r.score.stakes);
ok(r.legal.some(n => /ODPC/.test(n)), "Kenya legal notes present");
ok(r.offers[0].price.startsWith("From KES"), "KES pricing for Kenya: " + r.offers[0].price);
ok(r.fixes.some(f => f.points > 0), "fix points computed: " + r.fixes.map(f => f.points).join(","));
console.log("   diagnosis:", r.diagnosis);
console.log("   lead:", r.lead.score, JSON.stringify(r.lead.parts));

console.log("2. Same profile in Kiswahili");
let rs = E.build(P.kenyaCapped, "sw", { date: "2026-10-19" });
ok(rs.score.band.name === "Misingi kwanza", "SW band label");
ok(/zana za AI/.test(rs.fixes[0].title), "SW risk title: " + rs.fixes[0].title);
ok(!/\{\w+\}/.test(E.reportText(rs)), "no unfilled placeholders in SW report text");

console.log("3. Tanzanian school network, offline, Kiswahili");
let t = E.build(P.tzSchool, "sw");
ok(t.ctx.isSchool && t.agent.id !== "meal", "school does not get MEAL agent (got " + t.agent.id + ")");
ok(t.planNote.length > 0, "school plan note present");
ok(t.fixes.map(f => f.id).includes("not_registered") || t.more.map(f => f.id).includes("not_registered"), "TZ registration risk (PDPC)");
console.log("   score", t.score.readiness, t.score.band.name, "agent", t.agent.id, "fixes", t.fixes.map(f => f.id).join(","));

console.log("4. UK INGO, strong controls, wants safeguarding");
let u = E.build(P.ukIngo, "en");
ok(u.score.readiness >= 80, "scale-ready score (got " + u.score.readiness + ")");
ok(u.agent.id === "safeguard", "safeguarding allowed at 80+ with no children served (got " + u.agent.id + ")");
ok(u.offers[0].id === "pilot" && u.offers[0].price.startsWith("From US$"), "pilot offer first in USD");
ok(E.temperature(u.lead.score, true) === "hot", "hot lead (" + u.lead.score + ")");

console.log("5. Philippines, wants safeguarding, digital consent");
let ph = E.build(P.phBlocked, "en");
ok(ph.agent.id !== "safeguard", "safeguarding blocked (score " + ph.score.readiness + ", consent digital) -> " + ph.agent.id);
ok(ph.agent.blocked.length === 1, "blocked notice shown");

console.log("6. Peru CBO, mostly not sure");
let pe = E.build(P.peruCbo, "en");
ok(pe.score.unsure >= 5, "unsure counted: " + pe.score.unsure);
ok(pe.score.band.id === "foundations", "foundations band (" + pe.score.readiness + ")");
ok(pe.legal.every(n => !/ODPC/.test(n)), "no Kenya-only notes outside Kenya");

console.log("8. Country missing from law table, junk keys");
let m = E.build(P.missingLaw, "en");
ok(!("hidden_extra" in m.answers) && !("tasks_bogus" in m.answers), "unknown keys dropped by clean()");
const pr = E.prompt(m);
ok(pr.payload.law.law_name === null && /your country's data protection law/.test(pr.system), "generic law phrase used");
ok(!/budget|timeline|role|pay_path/.test(JSON.stringify(pr.payload.profile)), "no commercial answers in AI payload");

console.log("Validator");
const r1 = E.build(P.kenyaCapped, "en", { date: "2026-10-19" });
const good = {
  summary: "You are in the Foundations first band because team logins are shared and children's data has gone into free AI tools. Fix those two things first.",
  risks: r1.fixes.map(f => ({ id: f.id, title: f.title, why: f.why, fix: f.fix })),
  agent: { id: "foundations", name: "x", what_it_does: "Puts AI rules, phone codes and a breach plan in place before any agent is used.", guardrails: ["One-page AI rules", "Phone codes on email", "A breach plan"], first_test: "Check 20 de-identified report drafts with a person approving each one." },
  plan: [1, 2, 3, 4].map(w => ({ week: w, action: "Do the week " + w + " step from your plan." })),
  compliance: ["Check your registration with the Office of the Data Protection Commissioner (ODPC) under the Data Protection Act 2019.", "Write down where each AI tool sends data."],
  questions: ["Which systems hold names of the people you serve?", "Who could produce the next report if your data lead left?"]
};
let v = E.validateBrief(JSON.stringify(good), r1);
ok(v.ok, "clean brief passes (patched: " + (v.patched || []).join(",") + ")");
ok(v.ok && v.brief.compliance.every(c => c.endsWith("Confirm with a qualified adviser.")), "adviser phrase appended");
const evil = JSON.parse(JSON.stringify(good));
evil.risks[0].id = "safeguard";
evil.risks[1].why = "87% of NGOs leak data, see https://evil.example";
evil.agent.id = "safeguard";
evil.compliance = ["Under GDPR Article 33 you face fines.", "Section 43 requires notice.", "Call 0712345678."];
evil.questions[0] = "What is the child's name, [PERSON_1]?";
let ve = E.validateBrief(evil, r1);
ok(!ve.ok || (ve.brief.agent.id === "foundations" && ve.brief.risks[0].id === r1.fixes[0].id && !/87|https/.test(JSON.stringify(ve.brief))), "injected brief neutralised or rejected (" + (ve.ok ? "patched " + ve.patched.join(",") : "rejected: " + ve.reason) + ")");
const french = JSON.parse(JSON.stringify(good)); french.summary = "Vous êtes dans la catégorie des fondations. Corrigez les accès partagés et les données des enfants dans les outils.";
french.risks = french.risks.map(x => ({ ...x, title: "Risque", why: "Les données des enfants sont dans les outils.", fix: "Corrigez les accès." }));
ok(!E.validateBrief(french, r1).ok, "wrong language rejected");
ok(!E.validateBrief("not json at all", r1).ok, "unparseable rejected");

console.log("Schema");
const s = E.answersJsonSchema();
ok(s.additionalProperties === false && s.properties.tasks.maxItems === 3 && !s.properties.pain_text, "answers schema: enums, max 3 tasks, no free text");
ok(!JSON.stringify(E.wireSchema()).includes("maxLength"), "wire schema has no length keywords");

console.log("Report text");
const txt = E.reportText(r1);
ok(!/\{\w+\}/.test(txt) && !/—/.test(txt), "no placeholders or em dashes in report text");

console.log(fail ? `\n${fail} failing` : "\nAll engine checks passed");
process.exit(fail ? 1 : 0);
