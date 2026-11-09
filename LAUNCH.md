# Launch playbook

## What "launched" means
The check is live on its own domain, people outside the founder's network complete it, their answers reach the pipeline, and some of them book a walk-through.

## Blocking before public launch (from the council)
| # | Action | Who | Source |
|---|---|---|---|
| 1 | Register with the ODPC as a data controller, even if possibly exempt | Founder | Legal |
| 2 | Trademark (KIPI) and domain checks for "Salama Agents", then buy the domain | Founder | Growth, security |
| 3 | Supabase in Frankfurt; custom SMTP; passkeys on GitHub, Supabase, Anthropic, registrar and mailbox; registrar lock | Founder | Security |
| 4 | Anthropic workspace with a monthly spend limit; global brief cap set | Founder | Security, AI |
| 5 | Fill the privacy-notice placeholders (`config.json`: legalEntity, privacyEmail, odpcNumber, region, hostName, aiTerms) | Founder | Legal |
| 6 | Kiswahili reviewed by one Kenyan and one Tanzanian native speaker; keep the "beta" label until then | Reviewers | UX, education |
| 7 | AI eval gates passed on the 8 profiles in `council/06-ai-engineer.md` (100% valid after cleaning, ids locked, no invented numbers or law) | Founder | AI |
| 8 | Spoofed X-Forwarded-For test, 4th-brief test, 20 concurrent calls, oversized body, injection in several languages | Founder | Security |
| 9 | Eight-person usability test (`council/07-ux.md`) and fixes for every critical finding | Founder | UX |
| 10 | Appoint GDPR Art. 27 representatives before any EU or UK marketing | Founder | Legal |

## First 30 days (growth lead; organisation names marked "verify" need checking)
- **Days 1 to 5.** Run founder-led sessions with 10 to 15 warm organisations, using the artifact version in facilitated mode. Fix whatever trips people up and collect three quotable reactions.
- **Days 6 to 12.** Launch on LinkedIn with a 30-second screen recording of the redaction demo. Share with the Nairobi AI community and MEAL networks (Evaluation Society of Kenya: verify).
- **Days 13 to 20.** Sign one referral partner with a `fnd-` or `net-` ref code. Run a 30-minute online session, "AI for donor reports without leaking beneficiary data", with the check as homework.
- **Days 21 to 30.** Contact county and education forums, and INGO country-office networks (NetHope Africa membership: verify). Follow up to book calls.

Planning targets, not benchmarks: 800 visits, 160 starts, 80 completions, 30 opt-ins, 10 discovery calls, 2 paid audits.

## Metrics and decisions (product lead)
| Metric | Target | If below |
|---|---|---|
| Completion, start to report (day 14) | 55% | Under 35%: cut questions |
| Target-segment completions (day 14) | 150 | Under 50: a distribution problem, not a verdict on the niche |
| Personal data in AI tools, share of completions (day 14) | 30% | Under 15%: lead with time saved, not safety |
| Donor or M&E reporting in the top 3 tasks (day 30) | 40% | Another task leads by 10+ points: switch the wedge |
| Usefulness 4.0+, 20%+ share or download (day 30) | yes | Under 3.5: rework the report |
| Discovery calls (day 30) | 15 | Under 6: change the message or segment |
| Paid or funder-sponsored engagements (day 60) | 3 | Zero after 10+ calls: lead with the pilot or the funder letter, not the audit |

Recalibrate the lead-score weights at day 30 against the leads that actually converted.

## Follow-up sequence (only where contact consent was given)
- **Day 0:** report link, one line on the weakest pillar, and a booking link.
- **Day 2:** a one-page fix for the top risk.
- **Day 7:** a fixed-price review and the funder concept note, plus "Reply STOP to opt out". Then stop.

## Deferred to v1.1
- Colleague invite on the data step.
- An offline app shell.
- ALTCHA proof-of-work.
- A partner portfolio view (aggregates only, groups of 10+).
- The annual readiness report, at 100+ consenting organisations, with groups under 10 suppressed.
