# Council: Growth and Go-to-Market Lead

## MUST
1. Capture `?ref=` on first landing (localStorage, pattern `[a-z0-9-]{3,24}`, unknown codes saved as `other`). Attach it to every assessment and event.
2. The WhatsApp share carries only the band and a random `share_code`. Never the risks, score detail, organisation name or assessment ID.
3. Events go to a first-party `events` table through a validating Postgres function: an allowlist of names, required keys, a size cap and a per-session rate limit. Queue events offline and send them on reconnect. Store no IP address or user agent in events.
4. A call to action on the report matched to the band, and a day 0/2/7 follow-up only where `consent_contact` is true.
5. An optional budget question with "no budget yet" and "a funder would pay" options.
6. Partners see aggregates only, and only for cells of 5 or more organisations.

## SHOULD
7. A colleague invite for S4.
8. An indicative price on the call to action, logged as `price_seen`.
9. A native speaker reviews all Kiswahili before launch.

## COULD
10. An annual report, published only once the consented count is meaningful (aim for 100+), with the sample size and method printed.
11. A price A/B test after about 400 completions.

## Loops, ranked for a solo founder with no ad budget
1. **Funder and network referral codes.** One partner emailing 40 grantees beats a month of posting, and it seeds the funder portfolio offer.
2. **WhatsApp result sharing.** NGO and school teams coordinate in WhatsApp groups, so a share to the staff group reaches the decision maker.
3. **Colleague invite.** Lower volume, but it reaches more than one person per organisation and gives a sales hook: "your M&E lead rated Anonymise lower than you did."
4. **Annual report.** Strong later and weak in month one, because it needs responses first. Use it now as the reason partners join.

### Referral mechanics
- One code per partner: `fnd-<slug>`, `net-<slug>`, `evt-<slug>`.
- The landing page shows "Shared by [Partner]".
- The partner gets an anonymised portfolio readout and can sponsor audits.
- A separate checkbox, off by default: "Share my individual report with [Partner]".
- Partner email: "We are helping our partners use AI safely. This free 7-minute check gives you an instant readiness report. [Partner] sees only anonymised totals across all partners, never your answers. [link]"

### WhatsApp share
Uses `wa.me/?text=`; the link carries `?ref=wa-<share_code>`.
- EN: "I just checked how ready our organisation is to use AI without putting beneficiary data at risk. Free, 7 minutes, no sign-up. Our band: Foundational. Check yours: [link]"
- SW: "Nimepima jinsi shirika letu lilivyo tayari kutumia AI bila kuhatarisha data ya wanufaika. Ni bure, dakika 7, bila kujisajili. Kiwango chetu: Msingi. Pima lako hapa: [link]"

### Colleague invite
- A "Not sure? Ask a colleague" button on S4 creates a random single-use token that expires in 7 days.
- The link opens S4 only and shows none of the inviter's answers.
- It stores a linked row the founder can see in admin.
- EN: "Could you answer 7 quick questions on how we store and protect our data? It is for an AI safety check. 3 minutes, no sign-up: [link]"
- SW: "Tafadhali nisaidie kujibu maswali 7 mafupi kuhusu jinsi tunavyohifadhi na kulinda data yetu. Ni kwa ukaguzi wa usalama wa AI. Dakika 3, bila kujisajili: [link]"

## Events and funnel
Every event carries `ts`, `session_id` (random, rotates daily), `lang`, `mode`, `ref` and `device_class` (viewport bucket). There is no persistent user ID.

| Event | Properties |
|---|---|
| `page_viewed` | view |
| `redaction_demo_run` | entity_count (never the text) |
| `check_started` | entry: hero, nav, share, invite or partner |
| `check_step_completed` | step, seconds_bucket |
| `check_completed` | assessment_id, band, org_type, country, size_band |
| `brief_requested` | |
| `brief_returned` | ok, latency_ms |
| `result_shared` | channel: whatsapp, copy or download |
| `colleague_invited` | |
| `colleague_completed` | |
| `contact_submitted` | consent_contact, consent_report |
| `cta_clicked` | cta: book_call, whatsapp, sprint, audit or concept_note; price_seen |
| `feedback_submitted` | rating |
| `language_toggled` | to |

Sales stages come from the admin status field, not from events.

**Funnel:** visit, started, completed, opted in, call booked, call held, audit paid.

**Weekly numbers** (always show counts next to percentages):
1. Visits and completions by ref.
2. Start and completion rates, and the step with the biggest drop-off.
3. Opt-in rate.
4. Calls booked and held, audits paid, revenue.
5. Shares per completion, and completions from `wa-` codes.
6. Claude spend per completion.
7. Average usefulness rating, with the number of ratings.

## Conversion step
**Call to action:** "Book a free 30-minute walk-through of your report", with a Cal.com link and a "Prefer WhatsApp?" button.

**Offer by band:**
- Exposed: the Foundations Sprint.
- Foundational and Pilot-ready: the Audit.
- Scale-ready: pilot scoping.
- Every band also sees "No budget? Get a one-page concept note your funder can fund."

**Follow-up sequence** (stop as soon as they reply):
- Day 0: the report link, one line on their weakest pillar, and the booking link.
- Day 2: a one-page fix for their top risk, for example moving from shared passwords to 2-step login in an afternoon.
- Day 7: a fixed-price Audit plus the concept note, "Reply AUDIT for a quote." Then stop.

## 30-day plan
Items marked "verify" need to be checked before outreach.
- **Days 1-5:** 10-15 warm organisations (existing NGO, CBO, school and health clients) in founder-run sessions. Fix whatever trips people up and collect 3 quotable reactions.
- **Days 6-12:**
  - A LinkedIn launch with a 30-second screen recording of the redaction demo.
  - The Nairobi AI community.
  - The Evaluation Society of Kenya (verify active) and the MEAL WhatsApp groups the founder belongs to.
- **Days 13-20:**
  - Sign one referral partner: RELI (verify), Elimu Yetu Coalition (verify), KCDF (verify), or a funder of an existing client.
  - Run a 30-minute online session, "AI for donor reports without leaking beneficiary data", with the check as homework.
- **Days 21-30:**
  - County Education Board or county forum contacts (verify which counties hold open forums).
  - NetHope (verify Africa membership) for INGO country offices.
  - Follow up to book calls.
- **Targets:** 800 visits, 160 starts, 80 completions, 30 opt-ins, 10 discovery calls, 2 paid audits. These are planning targets, not benchmarks.

## Pricing
Ask about budget, but make it optional and place it after the value questions: "Roughly what could you put toward this in the next 12 months? It helps us suggest something you can actually afford. We never share it."
- **Options:** No budget yet / Under $500 / $500-2,000 / $2,000-10,000 / Over $10,000 / A funder would need to pay / Not my decision.
- Show KES next to USD for Kenya.

**Indicative ladder.** These are hypotheses to test, converted at about KES 129 per USD and rounded.

| Segment | Audit | Pilot | Retainer |
|---|---|---|---|
| Small CBO | $200-400 (KES 25k-50k) | $1,500-3,000 (KES 195k-390k) | $75-150/mo (KES 10k-20k) |
| Mid-sized NGO | $1,000-2,000 (KES 130k-260k) | $5,000-12,000 (KES 645k-1.55M) | $400-900/mo (KES 50k-115k) |
| INGO country office | $3,000-6,000 (KES 390k-775k) | $15,000-35,000 (KES 1.9M-4.5M) | $1,500-3,500/mo (KES 195k-450k) |

Credit the Audit fee against a Pilot signed within 60 days.

**Testing willingness to pay.** With about 80 completions, a price A/B test cannot give an answer. Detecting a 10% vs 20% click rate at 80% power and alpha 0.05 needs about 200 per arm; this is a calculation, not a benchmark. In month one, show one price per segment, log `price_seen`, and ask on every call: "At this price: yes, no, or only with a funder?"

## Naming
"Salama Agents" is memorable, easy to say across the region, and warm in meaning ("niko salama").
- **Risks:** "Salama" is a common brand word in East Africa and the Gulf; check the KIPI trademark register and the .com, .africa and .co.ke domains. In Kenya, "agents" also makes people think of M-Pesa and insurance agents.
- **Alternatives:** "Kinga AI" (kinga means protection; check for conflicts) and "Salama Labs".
- **Recommendation:** ship Salama Agents if those checks come back clean.

**Hero line.** "AI agents safe enough for children's data" is vivid, but it reads as a guarantee and narrows the audience to organisations that serve children, while the wedge is MEAL reporting.
- **Alternatives:** "Use AI on your donor reports. Keep beneficiaries' names out of it." and "Put AI to work without putting the people you serve at risk."
- **Recommendation:** ship the first alternative, with the redaction demo directly below it as proof. The privacy page should say redaction is best effort and should be reviewed by a person.
