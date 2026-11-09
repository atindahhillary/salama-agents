# Council: NGO Operations and MEAL Director

## MUST
1. Autosave on a shared phone exposes the previous person's answers. Ask "Is this a shared phone or computer?" first. If yes, turn autosave off. Put "Clear my answers" on every step.
2. Replace the USD budget band with the money-path questions below, in local currency.
3. Add the turnover, data-collector and partner-data questions below. Without them, the Africa-fit pillar cannot see these risks.
4. Rename "Exposed" to "Foundations needed" in anything shareable. No ED forwards a funder a document that calls their organisation exposed.
5. Report footer: "Based on self-reported answers on [date]. Not an audit or legal opinion."
6. On S2 and S4: "Your organisation's name is never stored with these answers. Honest answers give a better plan."

## SHOULD
1. A one-page "Board and funder summary":
   - three board decisions: adopt an AI and data policy, name a data protection lead, approve a pilot
   - staff days returned to programme work, calculated from their own answers
   - a costed first step
   - how the plan survives staff turnover

   Funders respond to a named accountable person, a policy the board has adopted, staff time moved back to beneficiaries, fit with their own safeguarding and data clauses, and small pilots with measurable results.
2. Regulator names that change with the country. The PDF should fit A4, read well in black and white, and be small enough to send on WhatsApp.

## COULD
A funder portfolio view through ?ref= links, showing aggregates only and only above a minimum number of organisations.

## Question rewording

**S1 Organisation**
- "How many paid staff? How many volunteers, community health promoters, teachers or partner staff collect data for you?"
- Add the options: faith-based organisation, caregivers, GBV survivors.

**S2 AI today**
- "Staff often paste work into ChatGPT, Gemini or Copilot to save time. Which of these have ever gone in?"
- Replace "don't know" with "Staff use personal accounts, so we cannot tell."

**S3 Needs**
- "Last reporting period, how many staff days went into donor reports?" Under 3 / 3 to 10 / 10 to 20 / Over 20 / Not sure.
- Add: "How many donors use different templates?" 1 / 2 to 3 / 4 to 6 / 7+.

**S4 Data and protection**
- ODPC: "Is your organisation registered with the Office of the Data Protection Commissioner?" Yes, certificate current / Applied or renewing / No / Not sure who handles this. Never tell them whether registration is mandatory for them.
- Consent: "When you collect information about children, how is consent recorded?" Signed paper forms / Question in the digital form / Verbal, not recorded / School or partner collects it / Not sure. Then ask: "Does the consent wording cover sharing with software providers?"
- Access: "How do staff log in to email, KoBo and Drive?" Own login plus phone code / Own login, password only / Some team logins shared (e.g. one KoBo account for enumerators) / Not sure.

**New in S5**
- "If your M&E officer left tomorrow, could someone produce the next report?" Yes / Partly / No.
- "Are data collection phones shared?"
- "How do partners send you data?" Shared KoBo / Excel by email / WhatsApp photos of registers / Paper / None.

## Buying process

**Where the money sits.** Budgets for M&E, capacity building, ICT, consultancy, indirect cost recovery, and unrestricted or core grants. An audit fits under consultancy or capacity building. A pilot needs M&E plus ICT, or a top-up from the funder.

**How a purchase gets approved:**
- Finance confirms which budget line pays.
- The procurement policy sets how many quotes are needed (commonly three above an internal threshold).
- The ED or Country Director signs. The board signs only large contracts.
- INGO country offices often need HQ IT or data protection approval for any new AI tool.
- Moving funds beyond the grant's variance limit needs the funder's approval.

**How long it takes:**
- weeks, if an existing budget line covers it
- one to three months, if money has to be moved
- the next funding cycle, if it goes into a new proposal

Unspent money near the end of a grant opens buying windows.

**Documents to have ready:** KRA PIN, tax compliance certificate, eTIMS invoicing, a data processing agreement, and a fixed-price quote.

### Revised S6
1. "Anything in the next three months?" Donor report due / Proposal deadline / Funder due diligence / New grant / Board meeting / Grant or financial year ending / Nothing specific.
2. "If useful, how could this be paid for?" Existing budget line / Need to move funds or ask our funder / Upcoming proposal / Funder might pay directly / No budget now.
3. "Which line?" M&E / Capacity building / ICT / Consultancy / Core / Not sure.
4. "Has a funder asked about AI, data protection or digital safeguarding?" In grant conditions / They have asked / No / Not sure.
5. "Your role?" I approve spending / I recommend, ED approves / Gathering information / HQ or funder decides.
6. Optional budget: Under KES 100,000 / 100,000 to 500,000 / 500,000 to 1.5 million / Above / Prefer not to say.

### Three lead signals
1. **Heavy reporting with a deadline:** three or more donor templates, and a report or proposal due within 90 days.
2. **A way to pay:** a named budget line, or a funder asking about AI or data protection.
3. **An owner:** dedicated M&E staff, digital data collection (KoBo, ODK, DHIS2), and an ED who approves or sponsors the work.

Exposure to risk does not, on its own, predict that an organisation will pay.

## MEAL agent spec

**The real pain**
- KoBo or ODK exports split across form versions.
- Cleaning in Excel: duplicates and enumerator errors.
- Partner sheets that arrive late and in different layouts.
- Matching data to each donor's own indicator definitions.
- Breaking figures down by sex, age, disability (Washington Group questions) and location.
- Unique versus cumulative counts.
- Explaining gaps against targets.
- Writing case stories.

This runs quarterly and annually. Data quality reviews then trace reported figures back to registers.

**What it takes to be trusted**
- Code calculates every number from versioned indicator reference sheets; the model never does.
- The model only writes narrative from the calculated tables, and each figure links to its source cell.
- A cleaning log records who approved each change. The raw export stays untouched, and every run gives the same result when repeated.
- Missing breakdowns show as "not recorded" and are never guessed (never infer sex from names).
- Very small groups are hidden.
- Unique-beneficiary rules stop the same person being counted twice across activities and partners.
- Output goes into the donor's own templates.
- The agent works offline on saved exports.
- Only totals or redacted text reach the model.
- The M&E officer approves, the programme manager reviews, and a person submits.

**What gets it rejected**
- A number that cannot be traced to its source.
- Any invented quote or case story; auditors treat that as fraud.
- A narrative that glosses over shortfalls.
- Beneficiary data reaching an overseas model in breach of grant clauses or consent wording.
- Indicator definitions that change between reporting periods.
