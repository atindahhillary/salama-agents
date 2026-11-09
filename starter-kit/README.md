# SAFE-A starter kit

Everything an organisation needs to put the SAFE-A Level 1 controls in place in two to three weeks, plus the code to build agents that meet Level 2. It is free and open: templates under CC BY 4.0, code under Apache-2.0.

| File | What it is | SAFE-A controls |
|---|---|---|
| `templates/ai-use-policy.md` | One-page AI use rules a board or management team can adopt | SC-3, AN-2, FE-3 |
| `templates/job-card.md` | The one-page description every agent needs before it goes live | SC-1, SC-2, SC-3, SC-4 |
| `templates/privacy-risk-check.md` | A short privacy risk check (a DPIA where the law requires one) | AN-2, EV-4 |
| `templates/residency-record.md` | Where each tool processes and stores data, and under which agreement | AN-3 |
| `templates/consent-wording.md` | Purpose-specific consent lines for registration and enrolment forms | AN-2 |
| `templates/breach-plan.md` | A one-page plan for when personal data leaks | EV-3 |
| `templates/handover-pack.md` | What must survive staff turnover | AD-4 |
| `templates/case-study.md` | The open outline for publishing your own case study | All |
| `code/redact.js` | The redactor the readiness check uses: names, phones, IDs, ages, schools, places become `[PERSON_1]` style tokens | AN-1 |
| `code/fence.js` | Wraps outside content (emails, WhatsApp messages, PDFs) so a model treats it as data, never instructions | FE-1 |
| `code/approval-queue.sql` | Postgres tables and functions for action tiers, two-person approval, an action log and a kill switch | SC-3, EV-1, EV-3 |
| `evals/cases.json` | Monthly evaluation cases: accuracy, refusals, injection in several languages, Kiswahili quality | EV-2, AD-3 |
| `evals/run.mjs` and `evals/grade.mjs` | Run the cases against your agent's prompt and grade the answers | EV-2 |

## Two-to-three-week Foundations Sprint
1. **Week 1.** Adopt the AI use policy. Turn on 2-step login for email and data tools. Stop sharing logins.
2. **Week 2.** Fill in the residency record for every AI tool staff use. Update consent wording on forms. Write the breach plan and name who decides.
3. **Week 3.** Write a job card and a privacy risk check for the first agent. Add redaction and the fence to its workflow. Run the evaluation cases once to set a baseline.

## Honest limits
- The redactor is rule-based and tested in English and Kiswahili. It misses names that are also ordinary words (Grace, Hope, Baraka), lowercase or nickname forms, non-Latin scripts and informal place descriptions. Treat its output as reduced risk, never as anonymous, and keep a person reviewing.
- The fence lowers the risk of prompt injection; it does not remove it. Agents that read outside content must still have no tools that act (FE-2).
- None of these templates is legal advice. Confirm legal points with a qualified adviser in each country you work in.
