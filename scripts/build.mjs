// Builds everything that ships:
//   docs/                 the standalone site for GitHub Pages or Cloudflare Pages (strict CSP)
//   docs/safe-a-v0.1.html the printable SAFE-A standard + case study, and safe-a-v0.1.pdf
//   supabase/functions/_shared/  the same content, redactor and engine the browser uses
//   supabase/generated/answers_schema.sql  pg_jsonschema check generated from content.js
//
// src/index.html is written for the claude.ai artifact host, which supplies the document
// skeleton; this script adds the skeleton, a Content Security Policy and config.js.
//
// Usage: node scripts/build.mjs                       (local mode, no backend)
//        SALAMA_CONFIG=config.json node scripts/build.mjs
//        SKIP_PDF=1 node scripts/build.mjs            (no headless browser available)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const out = path.join(root, "docs");
const require = createRequire(import.meta.url);

// ---------- config ----------
const cfgPath = process.env.SALAMA_CONFIG ? path.resolve(root, process.env.SALAMA_CONFIG) : null;
const config = cfgPath && fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, "utf8")) : {};
for (const k of Object.keys(config)) if (k.startsWith("_")) delete config[k];
let supabaseOrigin = "";
if (config.supabaseUrl) {
  const u = new URL(config.supabaseUrl);
  if (u.protocol !== "https:") throw new Error("supabaseUrl must be https");
  supabaseOrigin = u.origin;
}

// ---------- strict CSP (council/02-security.md). frame-ancestors needs a real header. ----------
const csp = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? " " + supabaseOrigin : ""}`,
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests"
].join("; ");

const body = fs.readFileSync(path.join(src, "index.html"), "utf8")
  .replace('<script src="content.js"></script>', '<script src="config.js"></script>\n<script src="content.js"></script>');

const html = `<!doctype html>
<html lang="en">
<head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="description" content="A six-minute AI safety readiness check for NGOs, schools and education programmes, built on the open SAFE-A standard.">
<meta name="color-scheme" content="light dark">
</head>
<body>
${body}
</body>
</html>
`;

// SKIP_PDF keeps the last PDF instead of deleting it with the rest of docs/.
const pdfPath = path.join(out, "safe-a-v0.1.pdf");
const keptPdf = process.env.SKIP_PDF && fs.existsSync(pdfPath) ? fs.readFileSync(pdfPath) : null;
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "vendor"), { recursive: true });
if (keptPdf) fs.writeFileSync(pdfPath, keptPdf);
fs.mkdirSync(path.join(out, ".well-known"), { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), html);
for (const f of ["content.js", "redact.js", "engine.js", "standard.js", "app.js", "app.css", "print.css"]) fs.copyFileSync(path.join(src, f), path.join(out, f));
fs.copyFileSync(path.join(root, "vendor", "supabase.js"), path.join(out, "vendor", "supabase.js"));
fs.copyFileSync(path.join(root, "vendor", "supabase-LICENSE.txt"), path.join(out, "vendor", "supabase-LICENSE.txt"));
fs.writeFileSync(path.join(out, "config.js"), `window.SALAMA_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
fs.writeFileSync(path.join(out, ".nojekyll"), "");
fs.writeFileSync(path.join(out, ".well-known", "security.txt"),
  `Contact: mailto:${config.securityEmail || config.privacyEmail || "security@example.org"}\nExpires: ${new Date(Date.now() + 365 * 864e5).toISOString()}\nPreferred-Languages: en, sw\nPolicy: ${(config.publicUrl || "").replace(/\/$/, "")}/#privacy\n`);
// Real security headers for hosts that read a _headers file (Cloudflare Pages, Netlify).
fs.writeFileSync(path.join(out, "_headers"), `/*
  Content-Security-Policy: ${csp}; frame-ancestors 'none'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cross-Origin-Opener-Policy: same-origin
`);

// Same headers for Vercel (project root directory = docs).
fs.writeFileSync(path.join(out, "vercel.json"), JSON.stringify({
  headers: [{ source: "/(.*)", headers: [
    { key: "Content-Security-Policy", value: csp + "; frame-ancestors 'none'" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
  ] }]
}, null, 2));

// ---------- load the shared modules in Node ----------
for (const f of ["content.js", "redact.js", "engine.js", "standard.js"]) require(path.join(src, f));
const C = globalThis.SALAMA_CONTENT, E = globalThis.SalamaEngine, ST = globalThis.SALAMA_STANDARD;

// ---------- printable standard ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const S = ST.standard, K = ST.caseStudy;
const li = (xs) => xs.map((x) => `<li>${esc(x)}</li>`).join("");
const printable = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<title>SAFE-A v${esc(S.version)}</title><link rel="stylesheet" href="print.css"></head><body>
<p class="eyebrow">${esc(S.publisher)} · ${esc(S.status)}</p>
<h1><span class="mark">SAFE-A</span> ${esc(S.title.replace(/^SAFE-A: /, ""))}</h1>
<div class="meta"><span>Version ${esc(S.version)}</span><span>${esc(S.date)}</span><span>Licence: ${esc(S.licence)}</span></div>
<p class="summary">${esc(S.summary)}</p>
<h2>Principles</h2><ul>${li(S.principles)}</ul>
<h2>Scope</h2><ul>${li(S.scope)}</ul>
<h2>The 20 controls</h2>
${S.pillars.map((p) => `<h3>${esc(p.id)} · ${esc(p.name)}</h3><p class="tagline">${esc(p.tagline)}</p>
<div class="tblwrap"><table><thead><tr><th>ID</th><th>Control</th><th>Evidence</th><th>Level</th></tr></thead><tbody>
${p.controls.map((c) => `<tr><td class="id">${esc(c[0])}</td><td><strong>${esc(c[1])}.</strong> ${esc(c[3])}</td><td>${esc(c[4])}</td><td><span class="lvl">L${c[2]}</span></td></tr>`).join("")}
</tbody></table></div>`).join("\n")}
<h2>Levels</h2><ul>${S.levels.map((l) => `<li><strong>${esc(l[0])}.</strong> ${esc(l[1])}</li>`).join("")}</ul>
<h2>Evidence gates for child-facing use</h2><p>${esc(S.childGates.intro)}</p><ol>${li(S.childGates.gates)}</ol>
<h2>Definitions</h2><dl>${S.definitions.map((d) => `<dt>${esc(d[0])}</dt><dd>${esc(d[1])}</dd>`).join("")}</dl>
<h2>How the readiness check scores</h2><p>${esc(S.method.intro)}</p><ul>${li(S.method.points)}</ul>
<h2>Not law, not certification</h2><p>${esc(S.notLaw)}</p>
<h2>Open standard</h2><ul>${li(S.open)}</ul>
<h2>Comment on this draft</h2><p>${esc(S.contribute)}</p>
<section class="case">
<p class="eyebrow">Case study</p>
<h1>${esc(K.title)}</h1>
<p class="note">${esc(K.status)}</p>
<p>${esc(K.about)}</p>
<h2>What SELution plans</h2><ul>${li(K.plans)}</ul>
<h2>Why it matters</h2><p>${esc(K.why)}</p>
<h2>What SAFE-A recommends</h2>${K.recommendations.map((r) => `<h3>${esc(r[0])}</h3><p>${esc(r[1])}</p>`).join("")}
<h2>What a pilot would measure</h2><ul>${li(K.measure)}</ul>
<h2>Lessons from the design stage</h2><ol>${li(K.lessons)}</ol>
<h2>Publish your own case study</h2><p>Case studies are open too. Remove anything that could identify a person, get written permission from every organisation you name, and share under CC BY 4.0.</p>
<dl>${ST.caseTemplate.map((r) => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>
</section>
<p class="foot">SAFE-A v${esc(S.version)} · ${esc(S.date)} · ${esc(S.licence)} · ${esc(S.changelog.map((c) => c[0] + ": " + c[2]).join(" "))}</p>
</body></html>
`;
fs.writeFileSync(path.join(out, "safe-a-v0.1.html"), printable);

if (!process.env.SKIP_PDF) {
  const browsers = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/chromium", "/usr/bin/google-chrome"];
  const bin = browsers.find((b) => fs.existsSync(b));
  if (bin) {
    const pdf = path.join(out, "safe-a-v0.1.pdf");
    execFileSync(bin, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdf}`, pathToFileURL(path.join(out, "safe-a-v0.1.html")).href], { stdio: "ignore" });
    console.log(`PDF: ${(fs.statSync(pdf).size / 1024).toFixed(0)} KB`);
  } else console.log("No headless browser found; skipped PDF");
}

// ---------- starter kit gets the same redactor the app uses ----------
fs.copyFileSync(path.join(src, "redact.js"), path.join(root, "starter-kit", "code", "redact.js"));

// ---------- server copies of the shared modules ----------
const shared = path.join(root, "supabase", "functions", "brief", "_shared");
fs.mkdirSync(shared, { recursive: true });
for (const f of ["content.js", "redact.js", "engine.js"]) fs.copyFileSync(path.join(src, f), path.join(shared, f));

// ---------- generated SQL: answers must match content.js exactly ----------
const schema = JSON.stringify(E.answersJsonSchema());
const gen = path.join(root, "supabase", "generated");
fs.mkdirSync(gen, { recursive: true });
fs.writeFileSync(path.join(gen, "answers_schema.sql"), `-- GENERATED by scripts/build.mjs from src/content.js (schema ${C.schemaVersion}, content ${C.version}). Do not edit.
-- Apply after the init migration, and again whenever questions or options change.
alter table public.assessments drop constraint if exists assessments_answers_shape;
alter table public.assessments add constraint assessments_answers_shape check (
  extensions.jsonb_matches_schema('${schema.replace(/'/g, "''")}'::json, answers)
);
alter table public.events drop constraint if exists events_name_allowed;
alter table public.events add constraint events_name_allowed check (name in (${E.EVENTS.map((e) => `'${e}'`).join(", ")}));
`);
console.log(`Built docs/ (${supabaseOrigin ? "Supabase: " + supabaseOrigin : "local mode, no backend"}), shared engine and answers schema`);
