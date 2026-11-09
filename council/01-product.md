# Council: Product Strategist

## MUST (blocking for launch)
1. Launch in production mode (Pages + Supabase + events). In artifact mode, outside viewers only get local storage, so it captures no market data. Keep artifact mode for demos.
2. Cut the check to 4 screens, about 18 taps, under 4 minutes on a phone.
   - **Your organisation:** type, country, staff size, who you serve. Cut programme areas; the tasks question covers them. Send funders and county/government to a short "talk to us" form, because they are different buyers.
   - **AI and data today:**
     - current use
     - data put into AI (keep "don't know")
     - policy and training merged into one question: "Written AI rules: none / written, staff not trained / written and trained"
     - from S4, keep account access, ODPC registration (named per country) and breach plan
     - parental consent only when "children" is picked
     - leave "record of data held" and "safeguarding covers digital" for the discovery call
   - **Your work:** top 3 tasks; hours a month in bands (0-10 / 11-40 / 41-80 / 80+); systems; one connectivity question, which replaces all of S5; optional redacted free text.
   - **Next step:** timeline, budget (KES and USD), funder, role, plus one new question: "When is your next donor report due? Under 1 month / 1-3 months / 3+ months / not sure". For MEAL work, the reporting deadline is what triggers a purchase.
3. Move the S7 contact step onto the report as "Book a free 20-minute review of this report" (WhatsApp or email). The booking is the conversion event.
4. Critical cap: shared passwords, or children's or health data in free AI tools, caps the score at 39. Without the cap, the weighted average hides the one failure that matters.
5. Bands: Exposed 0-39, Foundational 40-64, Pilot-ready 65-79, Scale-ready 80+. Block the safeguarding agent below 65, or whenever parental consent is not "yes".
6. Put priced next steps on the report (see Biggest risk).
7. Events: visit, start, screen_1..4, report_view, cta_click, booking, share, download, rating. Tag every event with ref.

## SHOULD
- Add the Claude brief in week 2, behind the caps already planned. Keep the "exactly what we send" panel; it is the best trust demo.
- Alternate the hero line weekly between "AI agents safe enough for children's data" and "Cut donor-reporting hours without putting beneficiary data at risk". Compare start rates.

## COULD
- Pipeline AI. Under 200 rows, reading the CSV is enough.
- A peer benchmark once a segment has 30+ completions.

## The report's "aha"
Page 1 must stand alone as a forwarded PDF under 300 KB:
- The score and band, with one sentence quoting the respondent's own answers. Example: "Staff paste beneficiary names into free AI tools and share passwords. That is your biggest exposure."
- 3 risks, each with a fix, an owner role and a cost (free / staff time / budget).
- "Your team spends X hours a month on donor reporting." Use their number. Never invent a saving.
- "3 questions your board should ask" and a paste-ready "Budget line to request from your funder".
- Legal notes that cite the Act and then say "confirm with counsel".

A programme manager forwards a report that makes them look prepared and helps them get money. Add a "Forward to my director" WhatsApp button.

## Biggest risk
Safety is a vitamin; reporting time is the painkiller. NGOs may like a free safety report and never pay for an audit, and the person filling in the check rarely holds the budget.

Test this on the report with three real offers side by side (prices are placeholders):
- **A:** "AI Risk and Readiness Audit, 2 weeks, from USD 1,200"
- **B:** "Supervised donor-reporting pilot, 4 weeks, audit included, from USD 3,500"
- **C:** "Ask your funder to cover this" (generates a letter)

How clicks and bookings split across A, B and C shows which offer to lead with.

## Metrics
Metrics 1-3 are read at day 14, 4-6 at day 30, and 7 at day 60.

| # | Metric | Target | If below |
|---|---|---|---|
| 1 | Completion (start to report) | 55%+ | Below 35%: cut more questions |
| 2 | Target-segment completions (Kenyan NGO/CBO/school network, 10-200 staff) | 150 | Below 50: a distribution problem, not a verdict on the niche |
| 3 | Exposure: share putting names, children's records, health data or "don't know" into AI | 30%+ | Below 15%: lead with time saved, not safety |
| 4 | Donor/M&E reporting picked in top 3 | 40%+ | Another task leads by 10+ points: switch the wedge |
| 5 | Usefulness | Average rating 4.0+, and 20%+ share or download | Below 3.5: rework the report |
| 6 | Discovery calls booked | 15 (10% of completers) | Below 6: change the message or segment |
| 7 | Paid or funder-sponsored engagements | 3 | Zero after 10+ calls kills audit-first; lead with B or C instead |

## Lead score (0-100)
**Problems with the current inputs:**
- Budget and timeline answers tend to be optimistic.
- Hours a month is noisy, so it gets a low weight.
- "Funder interest" is vague. Ask "Is there a named funder?" instead.
- Size shows fit, not intent.
- Missing: the trigger date, exposure and behaviour.

**Weights:**

| Component | Points |
|---|---|
| **Fit (25)** | |
| Staff | 10-49 = 10, 50-200 = 12, 200+ = 6, under 10 = 3 |
| Organisation type | Local NGO or INGO country office = 8, CBO or school = 4, government = 1 |
| Serves children or patients | 5 |
| **Intent (35)** | |
| Timeline | Under 3 months = 15, 3-6 months = 8, later = 2 |
| Budget | USD 1,000+ = 12, under 1,000 = 5, none = 0 |
| Named funder | Yes = 8, maybe = 4 |
| **Authority (15)** | Decides = 15, recommends = 8, uses = 3 |
| **Urgency (15)** | |
| Donor report due | Under 1 month = 6, 1-3 months = 4 |
| Exposure High | 6 |
| Hours 41+ | 3 |
| **Behaviour (10)** | Brief or download = 4, share = 3, rating 4+ = 3 |
| **Funder ?ref=** | +10 (total capped at 100) |

**Temperature:**
- Hot: 65+ and contactable, or any booking.
- Warm: 40-64, or 65+ without contact details.
- Cold: under 40.

Recalibrate the weights at day 30 against the leads who actually converted.

## Disagreements with the brief
1. 7 steps in 7 minutes is too long on a phone. S4 alone has 7 questions.
2. Contact is asked before the respondent has seen any value.
3. The AI brief should not block launch, since it largely repeats the rule-based report.
4. An uncapped weighted average hides critical failures, and the safeguarding gate at 70 sits inside a band the brief never defines.
5. Funders and government should not take the NGO check.
