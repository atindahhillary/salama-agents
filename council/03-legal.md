# Council: Data Protection Lawyer (global, Kenya home jurisdiction)

Advisory only, not formal legal advice. [CONFIRM] means check with Kenyan counsel; [EU] means check with EU/UK counsel.

## Kenya (home jurisdiction)
1. **Registration.** Salama is a data controller under s.18.
   - The Registration Regulations exempt organisations with turnover under KES 5M and fewer than 10 staff, unless they are in a listed sector (for example a business that is mainly direct marketing, education or health).
   - Salama is probably exempt today. [CONFIRM that lead capture is not "mainly direct marketing".]
   - **Register anyway before launch** (about KES 4,000, valid 24 months [CONFIRM]). The app tells NGOs to register, and school or health builds will make Salama their processor.
2. **Lawful basis for the answers: legitimate interests (s.30).**
   - Give a short notice before step 1 (s.29).
   - Never use "by continuing you consent".
   - Use two separate consent boxes, unticked and optional. The report never depends on either box.
   - Contacting someone about a pilot is commercial use, so it needs express consent (s.37) and an opt-out in every message.
   - If the contact box is unticked, the contact fields never leave the device.
   - Log every consent and withdrawal with the wording version and language (s.32).
3. **Transfers (ss.48-50).**
   - Keep:
     - the Supabase DPA
     - Anthropic's commercial terms and DPA
     - a transfer log
     - a transfer assessment
     - a processing record
   - s.50 and reg 26 may require a serving copy in Kenya for listed processing, including basic education and primary health care [CONFIRM]. This does not affect this app but matters for school builds.
4. **Region.** Supabase in EU Frankfurt, with the Edge Function pinned to the same region. Record the remaining risk that both providers are US companies.

## EU/UK
5. GDPR and UK GDPR apply once Salama actively targets EU/UK organisations.
   - Appoint Art. 27 representatives before any EU/UK marketing [EU].
6. Use legitimate interests (Art. 6(1)(f)) for the answers, with a written balancing test.
   - Offer an easy objection: "Keep my answers on this device".
   - Use consent only for contact and for the annual report.
7. Draft autosave is strictly necessary, so no cookie banner is needed.
   - Usage events carry no persistent identifiers.
   - Transfers to Anthropic rely on the SCCs in its DPA [verify DPF status].

## US
FERPA and COPPA are not triggered: Salama collects no student records and the audience is adults. Both apply once Salama builds for US schools.

## Beneficiary PII in the free text
If it arrives, Salama becomes controller of data with no basis or notice.
- **MUST:**
  - Redact in the browser before any network call.
  - Store only the redacted text.
  - **Keep free text out of the Claude payload.**
  - Show a warning at the field.
  - Cap the field at 280 characters.
  - Give the admin a "flag and purge" action with a content-free log.
  - Tell the submitter.
- **SHOULD:**
  - Block high-risk patterns at submit.
  - Test redaction on local names.

## SHOULD
- A DPIA for the AI brief.
- A daily salt on the IP hash, deleted after 48 hours.
- Drafts expire after 7 days.
- Lawyer-checked translations.
- Publish only groups of 10 or more organisations.
- Answer rights requests within 7 days [CONFIRM].

## Consent wording (both boxes unticked; helper text: "Optional. Your report is the same either way.")
(a) Yes, [Legal entity] (Salama Agents) may contact me by email, phone or WhatsApp about this check and a possible pilot. These are my own contact details. I can stop at any time by replying STOP or emailing [privacy email].

(b) Yes, my organisation's answers, without names or contact details, may be included in the annual "AI Readiness" report. Only combined results from many organisations will be published. My organisation will not be named and my written answers will not be quoted. I can withdraw at any time for reports not yet published.

## Privacy notice
Implemented in `src/content.js` (PRIVACY). Placeholders appear in [brackets].

## Regulator table
Implemented in `src/content.js` (REGULATORS), with "verify" flags kept.

## Claims table
| Claim | Verdict | Safe wording |
|---|---|---|
| "Register with ODPC" | Too broad | "Most Kenyan organisations handling personal data must register with the ODPC. Very small ones may be exempt, but not schools, health providers or other listed sectors." |
| 72-hour breach notice (Kenya) | Correct but incomplete (s.43) | "Where a breach poses a real risk of harm, tell the ODPC within 72 hours of becoming aware, and tell affected people in writing. Processors tell controllers within 48 hours." |
| Breach notice (global) | Deadlines vary | "Many laws require fast notice of serious breaches: 72 hours in Kenya, Nigeria, the EU and UK; 48 in Rwanda; as soon as reasonably possible in South Africa. Check each country involved." |
| Parental consent, s.33 (Kenya) | Correct but incomplete | "In Kenya, a child's (under 18) data needs parent or guardian consent, must serve the child's best interests, and needs age verification (s.33)." |
| Children's consent (global) | Ages vary | "The age for parental consent varies: under 18 in Kenya, Nigeria and India; 16 in Rwanda; 13 to 16 for EU and UK online services; 13 for US online services. Follow the child's country; if unsure, use the strictest." |
| SAFE-A rules shown as law | Policy, not law | Label them "SAFE-A rule". |
| "Safe enough for children's data" | Absolute claim that cannot be proven | "Built to protect children's data." |
| "Nothing sent anywhere" (demo) | True only if verified | Keep only after checking network requests. |
| "Anonymised" | Overclaim | "Without your name or contact details" / "de-identified". |
| "Data must stay in Kenya" | Wrong as a general rule | "Most data may leave Kenya with safeguards; some education and health processing needs a copy kept in Kenya." |
| AI compliance notes, the score | The model may invent law; the score is not a legal finding | Pick notes from a vetted library. Label them "General information, not legal advice" and "Not a compliance assessment". |
| Never say | | "ODPC-approved", "certified", "GDPR/FERPA/COPPA compliant", "guaranteed", "100% anonymous". |
