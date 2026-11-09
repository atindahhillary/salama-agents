# Salama Agents

Secure AI agents for education and NGOs, anywhere. This repository holds the launch system:

- **The readiness check**: a six-step, mobile-first self-assessment (English and Kiswahili beta) that gives an organisation an instant SAFE-A score, its top three fixes with owner, cost and points, a first agent, a 30-day plan, a board and funder summary, and an optional AI-tailored brief written from de-identified answers only.
- **SAFE-A v0.1**: an open field standard with 20 controls across Scope, Anonymise, Fence, Evidence and Adapt, plus evidence gates for child-facing use. Web page, printable page and PDF.
- **A design-stage case study** (SELution) and an open template for anyone to publish their own.
- **The SAFE-A starter kit**: policy and job-card templates, a redactor, a prompt-injection fence, an approval-queue schema with an action log and a kill switch, and a monthly evaluation suite.
- **The founder's pipeline**: completed checks, demand signals, lead temperature, status tracking, CSV export and an aggregate-only AI insight.

Open by design: code under **Apache-2.0** (`LICENSE`), standard and content under **CC BY 4.0** (`LICENSE-STANDARD.md`). There is no SAFE-A certification and no one may claim one.

## How it was designed
Eight expert reviews (product, security, data protection law, education, NGO operations and MEAL, AI engineering, UX and accessibility, growth) are in `council/`, with every decision and disagreement resolved in `council/SYNTHESIS.md`.

## Layout
```
src/            the app (one codebase for the claude.ai artifact and the standalone site)
  content.js    every question, option, risk, fix and string, English + Kiswahili, plus the regulator table
  redact.js     on-device redactor (names, phones, IDs, ages, schools, places)
  engine.js     scoring, critical cap, risks, recommendation, lead score, AI prompt and brief validator
  standard.js   SAFE-A v0.1 and the case study
  app.js        router, check, report, documents, pipeline, three backends (artifact, Supabase, local)
supabase/       migration, generated answer schema, `brief` edge function (shares engine.js)
starter-kit/    templates, code and evals for organisations adopting SAFE-A
scripts/        build.mjs (docs/, PDF, shared server copies, generated SQL), serve.mjs
tests/          redactor and engine tests
docs/           built site, ready for GitHub Pages or Cloudflare Pages
council/        the expert reviews and the synthesis
```

## Run it locally
```bash
node tests/redact.test.mjs
```
```bash
node tests/engine.test.mjs
```
```bash
node scripts/build.mjs
```
```bash
node scripts/serve.mjs 4173
```
Then open http://localhost:4173. With no `config.json` the site runs in **local mode**: everything stays on the device, the AI brief is off, and `#admin` shows this device's test submissions.

## Three ways it runs
| Mode | Storage | AI brief | Who it is for |
|---|---|---|---|
| claude.ai artifact | Artifact database, readable only by the owner and editors | Claude, on the viewer's own account | Founder-facilitated sessions and demos |
| Standalone + Supabase | Postgres with insert-only RLS, contacts in a separate table | `brief` edge function calling `claude-opus-5-5` | The public launch |
| Local | This device only | Off | Testing, offline workshops |

## Deploy the production version
1. **Supabase.** Create a project in **eu-central-1 (Frankfurt)**. Turn sign-ups off, set up custom SMTP (SPF, DKIM, DMARC), and switch the email template to a 6-digit code.
2. Run `supabase/migrations/20261019000100_init.sql`, then `supabase/generated/answers_schema.sql`.
3. Create your own auth user by hand, then:
   `insert into private.admins (user_id, label) values ('<your user id>', 'founder');`
   You enrol an authenticator app at first sign-in. `is_admin()` requires it.
4. **Anthropic.** Create a dedicated workspace and key with a monthly spend limit.
5. **Edge function.**
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=... IP_HMAC_KEY=$(openssl rand -hex 32) ALLOWED_ORIGINS=https://your-domain
   ```
   ```bash
   supabase functions deploy brief --no-verify-jwt
   ```
   Pin the function region to Frankfurt. Before launch, send a spoofed `X-Forwarded-For` with curl and confirm which address the function sees.
6. **Site.** Copy `config.example.json` to `config.json`, fill it in, then:
   ```bash
   SALAMA_CONFIG=config.json node scripts/build.mjs
   ```
   Publish `docs/` on a **custom domain** with HTTPS. Cloudflare Pages reads `docs/_headers` and sends real security headers. GitHub Pages works too, but only with the meta CSP.
7. **Kill switch.**
   ```sql
   update private.settings set value = 'false' where key = 'briefs_enabled';
   ```

## Before public launch
See `LAUNCH.md`: ODPC registration, the trademark and domain checks, privacy-notice placeholders, native Kiswahili review, the eight-person usability test, and the AI evaluation gates.
