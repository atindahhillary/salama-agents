# Council brief: Salama Agents launch system (MVP)

Working brand: **Salama Agents** (salama = safe, in Kiswahili). Founder: a Nairobi-based builder with live NGO and education deployments and a security background. Goal: own the niche "secure AI agents for education and NGOs".

## The framework the business is built on: SAFE-A
- **Scope**: each agent has a written job card; tool allowlist; action tiers (read = autonomous, draft = queued, send/change = 1 human approves, money/child-data export/delete = 2 humans or never); named owner.
- **Anonymise**: redact PII to tokens before any model; children's data never to third-party model without documented consent and legal basis; residency decision record; minimum data.
- **Fence**: inbound content (email, WhatsApp, PDFs) informs but never instructs; reader agents (no tools) separated from actor agents; secrets in a vault; 2-step login.
- **Evidence**: action logs; monthly evals (accuracy, refusals, injection, local language); kill switch + breach plan (72-hour ODPC notice in Kenya); DPIA per agent.
- **Africa-fit**: offline/degraded mode; WhatsApp/SMS/USSD/low-end Android; local-language testing; survives staff turnover.

Offer ladder: AI Risk and Readiness Audit (fixed fee) -> Secure Agent Build (4-8 weeks) -> Agent Ops retainer -> Training/certification -> Funder portfolio partnerships. Wedge: MEAL and donor-reporting agents for mid-sized Kenyan NGOs.

## What we are building now (the "first launch system")
A mobile-first web app whose job is to **capture market needs, give instant value, and convert to pilots**, publishable today for testing.

### Views
1. **Home**: hero "AI agents safe enough for children's data"; a live, in-browser **redaction demo** (paste a field note, see names/phones/IDs/ages/schools/places replaced by tokens like [PERSON_1] - nothing sent anywhere); SAFE-A pillars; agent catalogue with risk tiers; 3-step path (Check -> Brief -> Supervised pilot); "we practise what we sell" privacy promise; CTA.
2. **Readiness check** (7 steps, ~7 minutes, no sign-up, autosaved draft on device, EN/Kiswahili toggle):
   - S1 Organisation: type (local NGO, INGO, CBO, school/network, county/government, funder, social enterprise), country, staff size, who you serve (children, youth, adults, PWD, patients, refugees, teachers), programme areas.
   - S2 AI today: current use (none / staff use free tools ad hoc / approved tools / built tools), what data goes into AI tools (nothing sensitive, internal docs, beneficiary names, children's records/photos, health info, donor data, finance, don't know), AI policy (yes/draft/no), staff trained.
   - S3 Needs: top 3 tasks (donor/M&E reporting, proposals, lesson plans, field data cleaning, safeguarding intake, comms stories, translation, WhatsApp/SMS helpdesk, finance paperwork, finding things in own docs), free-text "task that takes the most time" (redacted before storage), hours per month.
   - S4 Data & protection: registered with data protection authority (ODPC), parental consent for children's data, systems (paper, Excel/Sheets, KoBo/ODK, CRM, DHIS2, WhatsApp groups, LMS), account access (2-step / individual / shared passwords), record of what data you hold, breach plan, safeguarding policy covering digital.
   - S5 Field realities: connectivity, devices, channels with communities, languages.
   - S6 Readiness to act: timeline, budget band (USD), funder interest, decision role.
   - S7 Contact (optional): name, role, org, email, WhatsApp; consent to be contacted; consent to include anonymised answers in an annual "Africa NGO AI Readiness" report. Contact stored separately; never sent to AI.
3. **Report** (instant, no gate): readiness score 0-100 (weighted pillars SC 20%, AN 25%, FE 20%, EV 20%, AF 15%), band (Exposed <40 / Foundational / Pilot-ready / Scale-ready 80+), exposure level (from who they serve + data in AI + shared passwords), 5 pillar bars, top 3 risks with fixes (rule-based), recommended first agent with guardrails (rule-based from tasks; high-risk safeguarding agent blocked below 70 readiness; below 40 recommends a "Foundations Sprint" first), deterministic 30-day plan. Then an **AI-tailored brief** on click: shows exactly what JSON will be sent (anonymised profile only), then Claude returns JSON {summary, 3 risks, agent + guardrails + first test, 4-week plan, compliance notes, discovery questions}. Download brief, copy summary, share on WhatsApp, 1-5 usefulness rating + comment.
4. **SAFE-A standard** page: 20 controls (SC-1..4, AN-1..4, FE-1..4, EV-1..4, AF-1..4).
5. **Privacy** page (EN/SW).
6. **Admin pipeline** (owner only): KPIs, funnel, demand signals (most requested tasks, weakest pillar, by org type/country), leads table with lead temperature (budget, timeline, funder, role, size, hours), status pipeline (new/contacted/discovery/pilot/won/lost), detail drawer, CSV export, "ask AI what the pipeline says" over anonymised aggregates.

### Architecture (one codebase, three backends)
- **Artifact mode** (hosted on claude.ai today): storage via the artifact's own db (only the owner/editors can write, so this is for founder-facilitated sessions and demos); AI via the viewer's own Claude account. Outside viewers get local-only mode.
- **Production mode**: static site on GitHub Pages + **Supabase** (Postgres with RLS: anon insert-only on `assessments`, `contacts` (separate table), `feedback`, `events`; admins select/update via `is_admin()` from an `admins` table; magic-link login) + a **Supabase Edge Function** `brief` that reads the stored anonymised profile server-side, calls the Claude API (key as a secret), rate-limits per IP-hash/day plus a global daily cap and max 3 briefs per assessment, and writes the brief back. Referral codes via `?ref=` (for funder portfolio channels). First-party funnel events, no third-party trackers.
- **Local mode** (no backend): everything on the device, rule-based report only.

### Constraints
- Founder is solo-ish; must be cheap to run and maintain. Users are often on phones, patchy data, shared devices. English + Kiswahili at launch.
- Never invent statistics. Legal statements must be careful (Kenya Data Protection Act 2019 and its 2021 registration regulations, Nigeria NDPA 2023, South Africa POPIA, Uganda DPPA 2019, Rwanda 2021 law).
- House style: no em dashes anywhere.
