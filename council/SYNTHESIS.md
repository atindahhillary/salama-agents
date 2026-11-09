# Council synthesis: decisions for Salama Agents v0.1

Eight experts reviewed BRIEF.md: product, security, data protection law, education, NGO operations and MEAL, AI engineering, UX and accessibility, and growth. Their full reports are in this folder. This page records what we decided, especially where they disagreed. Two founder instructions override everything here: **no client or partner is used as a case study without its consent**, and **global, not Africa-only, and open**.

## Positioning
- **Global.** The fifth pillar was renamed from "Africa-fit" to **Adapt** (built for real field conditions). SAFE-A now stands for Scope, Anonymise, Fence, Evidence, Adapt.
- **Hero lines (A/B tested).**
  - A, the growth lead's line: "Use AI on your reports and lesson plans. Keep the people you serve out of it."
  - B: "AI agents built to protect children's data." We use "built to protect" because the lawyer ruled out the absolute "safe enough".
- **Name.** Salama Agents stays, but the trademark and domain checks must be done before launch (growth).
- **Words.** "De-identified" or "without your name or contact details", never "anonymised" (lawyer and security). We never say "certified", "compliant", "guaranteed" or "100% anonymous".

## Flow
| Question | Product | UX | Decision |
|---|---|---|---|
| Length | 4 screens, under 4 minutes | 6 steps | **6 short steps**, about 25 taps, claimed as "about 6 minutes". The UX test protocol measures the real time. |
| Contact | On the report | On the report | **Optional card on the report.** The report is never gated. |
| Score mid-way | | No | **Progress only.** |
| "Not sure" | | On every data question | **Yes.** It is scored as a gap and listed as "Worth checking". |
| Funders and government | Separate track | | **Funders get a short funder route.** Government education offices take the check, but with low lead weight. |
| Order | | About, Work, AI, Data, Field, Plans | **UX order.** |

## Questions
- Ask about behaviour, not policy: "In the last 3 months, has anyone put any of these into an AI tool?" (UX, NGO)
- Learner data counts as children's data (education). Options cover learner marks, photos and health or special-needs notes.
- Consent appears only when children are served.
- The registration question appears only where the authority runs a registration scheme. Elsewhere we ask "named data protection lead" (lawyer). We never tell people whether registration is mandatory for them (NGO).
- Logins get their own question, with "some team logins are shared" as an option (NGO, UX).
- The new Adapt questions cover turnover, partner data flow, shared collection phones and cyber cafes (NGO).
- There is a school branch: levels, teacher hours, and who enters learner data into national systems (education).
- Lead questions follow how NGOs actually pay: triggers in the next three months, how it could be paid for, whether a funder has asked, role, and an optional budget in KES or USD (NGO, growth, product).
- Free text: capped at 280 characters, redacted on the device, stored only redacted, and **never sent to Claude** (the lawyer's MUST, which overrides the AI engineer's fenced TASK_NOTE). The fencing code stays in place for a possible later opt-in.

## Scoring
- Five pillars, weighted SC 20, AN 25, FE 20, EV 20, AD 15.
- **Critical cap at 39** for shared logins, or for children's, health or case data put into AI tools (product).
- Bands:
  - Foundations first: 0 to 39 (UX, NGO)
  - Building: 40 to 64
  - Pilot-ready: 65 to 79
  - Scale-ready: 80 and above
- The **safeguarding agent is blocked below 65, or unless consent is signed and purpose-specific** (product). The AI engineer's 70 came from the old brief.
- The **server recomputes the score**, and the client score is display-only (security).
- The lead score uses the product formula (fit, intent, authority, urgency, behaviour, plus 10 for a funder referral) with the NGO lead's three signals. Hot is 65+ and contactable. Recalibrate at day 30.

## Report
- No shaming. It opens with "What you already do well". Each fix carries an owner, a cost and the points it adds.
- Exposure is stated as a separate, factual "higher stakes" line, shown in amber, never red (UX).
- It quotes the organisation's own reporting time, and never invents a saving (product).
- It includes a board and funder summary: 3 decisions, 3 board questions, and a request letter the funder can approve (product, NGO).
- Offers are priced by segment and labelled as indicative. Offer C, "ask your funder", tests where demand sits (product, growth).
- The footer reads: "Based on self-reported answers on [date]. Not an audit or legal opinion." (NGO)
- Legal notes come from a vetted library, and the AI may only name the law and regulator we pass it (lawyer, AI).

## AI brief
- `claude-opus-5-5` with adaptive thinking, effort low, json_schema output, `fallbacks: "default"` and max_tokens 4000 (AI, claude-api skill).
- The rules fix the score, band, risks, agent and plan, and the AI only tailors them. The validator locks the ids and rejects invented numbers and legal citations, and failed fields are patched from the rule report.
- Caps: 3 briefs per assessment and 20 per IP-HMAC per day, a global daily cap, a kill switch, and a console spend limit. When a cap is hit, the user falls back to the rule report (security, AI).

## Data protection
- The answers rest on legitimate interests, with a short notice before step 1 and an objection option: "Keep my answers on this device only" (lawyer).
- Two consents, unticked and optional:
  - The contact box sits on the report card. Contact details are sent only when it is ticked.
  - The research box sits at the end of "Your plans" and is stored with the answers.
- Consent records carry the wording version and the language (lawyer, security).
- Supabase runs in **EU Frankfurt**, with Edge Functions in the same region (lawyer).
- Retention:
  - IP counters: 2 days
  - Free text: 90 days
  - AI briefs: 180 days
  - Events: 12 months
  - Contacts: 24 months after last contact, or 12 months if a lead never responds
  - Answers: 36 months
- Shared devices:
  - A "shared device" toggle turns autosave off.
  - Contact fields are never autosaved.
  - Drafts expire after 72 hours.
  - The report has a "Clear my answers from this device" button.

## Security
- Column grants, a private schema, jsonschema-checked answers generated from `content.js`, a server-owned status, `is_admin()` requiring aal2 through a uid allowlist, and audit triggers.
- The admin signs in with a 6-digit email code plus a TOTP authenticator.
- A strict CSP: self-hosted supabase-js, no inline scripts or styles, textContent only.
- Hosting on a custom domain, preferably on Cloudflare Pages for real headers.
- Funnel events use an id held in memory for each tab, and store no IP or user agent.

## Deferred (v1.1)
- Colleague invite token (growth).
- Offline app shell through a service worker. It is not allowed in artifact mode; standalone only (UX).
- ALTCHA proof-of-work (security).
- Kiswahili review by native speakers, one Kenyan and one Tanzanian. **This blocks the public SW launch**; the label stays "beta" until it is done.
- Annual readiness report, once there are 100+ consented organisations, with figures from groups of fewer than 10 suppressed.
- A partner portfolio view with aggregates only, for groups of 5 or more (growth: 5; lawyer: 10; we use **10**).

## Founder actions before public launch
1. Register with the ODPC as a data controller, even if exempt (lawyer).
2. Run the trademark (KIPI) and domain checks for "Salama Agents", then buy the domain (growth, security).
3. Create the Supabase project in eu-central-1, set up custom SMTP with SPF, DKIM and DMARC, and turn on passkeys on every account (security).
4. Create an Anthropic workspace and key with a monthly spend limit (security).
5. Fill in the placeholders in the privacy notice (legal entity, privacy email, WhatsApp).
6. Appoint Art. 27 representatives before any EU/UK marketing (lawyer).
7. Recruit 8 usability participants with the UX protocol (UX).
