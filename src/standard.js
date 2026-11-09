/* SAFE-A v0.1: the public standard and the SELution design-stage case study.
 * One source for the in-app pages, the printable page and the PDF (scripts/build.mjs).
 * English only in v0.1; a Kiswahili edition follows native review. */
(function (g) {
  "use strict";

  var STANDARD = {
    name: "SAFE-A",
    title: "SAFE-A: a field standard for secure AI agents in education and NGOs",
    version: "0.1",
    status: "Public draft for comment",
    date: "19 October 2026",
    licence: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    publisher: "Salama Agents",
    summary: "SAFE-A sets out 20 controls that an organisation should have in place before an AI agent reads, drafts or acts on information about the people it serves. It is written for NGOs, schools, education programmes and the people who fund and build for them, in any country, and it is designed for real field conditions: patchy connectivity, shared phones, many languages and frequent staff turnover.",
    principles: [
      "People first. The people an organisation serves, especially children, carry the risk of AI mistakes, so the controls protect them before they speed anyone up.",
      "Least power. An agent gets the smallest set of data and tools its job needs, and anything that leaves the organisation passes a person.",
      "Data, not orders. Content from outside the organisation can inform an agent but can never instruct it.",
      "Prove it. Every control has evidence a manager, funder or auditor can check in an afternoon.",
      "Built for the field. A control that only works with fast internet, new laptops and stable staff is not a control."
    ],
    scope: [
      "Any AI system an organisation uses that can read, draft, decide or act on information about the people it serves (participants, learners, patients, survivors, families) or on the organisation's own systems.",
      "This includes agents that use tools, assistants built into everyday software, and general chat tools used for work.",
      "It applies whoever built the system: the organisation itself, a vendor, a volunteer or a funder."
    ],
    definitions: [
      ["Agent", "An AI system that can use tools or take actions, such as sending a message, changing a record or calling another system."],
      ["Personal data", "Any information about an identifiable person, including names, phone numbers, ID numbers, photos, locations and records."],
      ["Sensitive data", "Children's data, and health, disability, case, survivor, financial and biometric information."],
      ["De-identified", "Data with direct identifiers replaced by tokens or removed. It may still identify someone when combined with other facts, so it is handled with care."],
      ["Job card", "A one-page description of an agent's purpose, data, permitted and forbidden actions, and owner."],
      ["Person in the loop", "A named, trained person who approves an agent's action before it takes effect."],
      ["Residency record", "A written record of where each tool processes and stores data, under which agreement."]
    ],
    pillars: [
      { id: "SC", name: "Scope", tagline: "Every agent has a job card, and nothing it does leaves the building without a person.",
        controls: [
          ["SC-1", "Job card", 1, "Every agent has a one-page job card stating its purpose, the data it may read, the actions it may take, the actions it may never take, and its named owner.", "A signed job card for each agent."],
          ["SC-2", "Least tools", 1, "An agent gets only the tools and data its job needs. Open web access, shell access, sending email or messages, and payments are off unless the job card names them.", "The configured tool list matches the job card."],
          ["SC-3", "Action tiers", 1, "Every action is classified. Tier 0, read and summarise: may run on its own. Tier 1, draft: held for review. Tier 2, send, publish or change records: a person approves each one. Tier 3, money, exports of children's or sensitive data, and deletion: two people approve, or the action is not allowed.", "An approval log showing Tier 2 and Tier 3 approvals."],
          ["SC-4", "Owner and deputy", 2, "Each agent has a named staff owner and a trained deputy. The owner reviews the job card at least every six months and after any incident.", "An owner register with review dates."]
        ] },
      { id: "AN", name: "Anonymise", tagline: "Names, numbers and children's records become labels before any model sees them.",
        controls: [
          ["AN-1", "De-identify before the model", 1, "Personal identifiers are replaced with tokens on the organisation's side before any call to a third-party model. The map from tokens back to people stays in the organisation's own system.", "The redaction step in the workflow, with test results on the organisation's own languages and name patterns."],
          ["AN-2", "Children's and sensitive data", 1, "Children's data and other sensitive data never reach a third-party model without a documented lawful basis, consent that names the purpose where the law requires it, and a privacy risk check.", "Consent wording, the lawful basis note and the privacy risk check."],
          ["AN-3", "Residency record", 2, "A written record states where each tool processes and stores data, in which country, under which agreement, and why that is acceptable under the laws that apply.", "The residency record, reviewed in the last 12 months."],
          ["AN-4", "Minimum data", 2, "Agents receive only the fields the task needs. Outputs are checked for re-identification before they leave the organisation, and figures about groups smaller than an agreed minimum are suppressed.", "A field list per job card and the suppression rule."]
        ] },
      { id: "FE", name: "Fence", tagline: "Outside content informs an agent. It never gives orders.",
        controls: [
          ["FE-1", "Outside content is data, not instructions", 1, "Emails, messages, forms, documents and web pages can inform an agent but never instruct it. Prompts mark outside content as untrusted, in every language the agent reads.", "Prompt design notes and the latest injection test results."],
          ["FE-2", "Reader and actor split", 2, "An agent that reads outside content has no tools that act. An agent that acts never sees raw outside content, only structured, checked summaries.", "An architecture diagram showing the split."],
          ["FE-3", "Secrets out of reach", 1, "Keys and passwords live in a secrets store. They never appear in prompts, workflows, spreadsheets or chat messages.", "A secrets inventory and a scan of workflows."],
          ["FE-4", "Strong login", 1, "Every person who can approve agent actions or reach personal data uses their own login with a second factor. No shared logins.", "The account list with second-factor status."]
        ] },
      { id: "EV", name: "Evidence", tagline: "Every action is logged, tested monthly, and covered by a plan for when things go wrong.",
        controls: [
          ["EV-1", "Action log", 1, "Every agent action records when it happened, who or what triggered it, what it read (by reference), what it did and who approved it. Logs avoid raw personal data and are kept for an agreed period.", "A sample of the log."],
          ["EV-2", "Monthly evaluation", 2, "Each agent is tested every month on a fixed set of real, de-identified examples for accuracy, correct refusals, resistance to injected instructions, and quality in each language it uses. Results go to the owner.", "The latest evaluation report."],
          ["EV-3", "Stop and recover", 1, "There is a tested way to stop any agent within minutes, and a written breach plan that names who decides, who tells regulators and the people affected, and the deadlines that apply in each country.", "A record of the last stop test, and the breach plan."],
          ["EV-4", "Privacy risk check", 2, "Each agent that handles personal data has a privacy risk check (a data protection impact assessment where the law requires one) before it goes live and after any major change.", "The completed check."]
        ] },
      { id: "AD", name: "Adapt", tagline: "It works offline, on the phones people have, in the languages they speak, and it survives staff turnover.",
        controls: [
          ["AD-1", "Degraded mode", 2, "Work continues when connectivity or the model service fails. The agent saves work locally, and the manual process stays documented.", "A test of the failure mode."],
          ["AD-2", "Real channels and devices", 2, "The agent reaches people through channels and devices they already use, such as WhatsApp, SMS, USSD or low-cost Android phones, and its data costs are known and paid by the organisation, not by staff or communities.", "A channel and cost plan."],
          ["AD-3", "Language testing", 2, "Fluent speakers test the agent in every language it will be used in before rollout, and again after major changes.", "Language test results."],
          ["AD-4", "Survives turnover", 1, "Documentation, access and ownership survive staff changes. No single-person passwords, and a handover pack exists for each agent.", "The handover pack."]
        ] }
    ],
    levels: [
      ["Level 1: Foundations", "All 11 Level 1 controls are in place. An organisation at Level 1 may use AI for drafting on de-identified data, with a person reviewing every output."],
      ["Level 2: Pilot", "All 20 controls are in place. An organisation at Level 2 may run a supervised pilot of one agent that handles personal data."],
      ["Level 3: Scale", "All 20 controls have held through at least two monthly evaluations, and an independent reviewer has checked the evidence. An organisation at Level 3 may run several agents."]
    ],
    childGates: {
      intro: "No agent may talk directly with children, or show AI-generated content to a class, until every gate below is passed. Time alone proves nothing, so these are evidence gates.",
      gates: [
        "At least two school terms or six months of staff-facing use, with action logs and monthly evaluations, and no unresolved serious incident.",
        "A child-facing privacy risk check.",
        "Written sign-off from a named safeguarding lead.",
        "Opt-in consent from each child's parent or guardian, and the child's own assent, in a language they understand.",
        "Written notice to the relevant education or child protection authority.",
        "No AI-generated images of real learners, ever."
      ]
    },
    method: {
      intro: "The Salama readiness check turns SAFE-A into a short self-assessment. Its scoring is published so anyone can check it.",
      points: [
        "Five pillar scores from 0 to 100, weighted Scope 20%, Anonymise 25%, Fence 20%, Evidence 20%, Adapt 15%.",
        "A critical cap: shared logins, children's, health or case data in free AI tools, or learner records handled outside a school cap the overall score at 39 until fixed.",
        "Four bands: Foundations first (0 to 39), Building (40 to 64), Pilot-ready (65 to 79), Scale-ready (80 and above).",
        "\"Not sure\" answers are scored as gaps and listed as worth checking.",
        "The score reflects self-reported answers. It is not an audit, a certification or a legal opinion."
      ]
    },
    notLaw: "SAFE-A is good practice, not law. It complements data protection, child protection and education laws but does not replace them, and meeting SAFE-A does not mean an organisation complies with any law. Where a law sets a stricter rule, the law wins. SAFE-A does not certify anyone, and no one may claim to be SAFE-A certified.",
    contribute: "This is a public draft and an open standard. Anyone may use, adapt, translate and share it under CC BY 4.0, with attribution. Comments and proposed changes from practitioners, safeguarding leads, data protection specialists, teachers and the communities affected are welcome in the public repository before version 1.0. Every change is recorded in the version history.",
    open: [
      "The standard, its scoring rules and the case studies are published under CC BY 4.0.",
      "The readiness check, the SAFE-A starter kit and the evaluation tools are open source under Apache-2.0.",
      "Translations are welcome. A translation must say which version it translates and must not change the controls."
    ],
    changelog: [["0.1", "19 October 2026", "First public draft."]]
  };

  var CASE_STUDY = {
    title: "Designing a safe measurement spine: SAFE-A applied to SELution",
    status: "Design-stage review. No learner data was used, and no outcomes are claimed.",
    about: "SELution is a play-based programme for low-resource classrooms that delivers four connected strands, social and emotional learning, foundational literacy and numeracy, unplugged coding and robotics, through one teacher-training pathway and one measurement spine. It is at the design and partnership stage, with no funded pilot yet.",
    plans: [
      "Every session follows one cycle: goal, game, roles, reflect, record.",
      "The teacher completes a record for each child in about ten seconds. These per-child records roll up to a cluster dashboard.",
      "A pilot covers one district or county cluster of 8 to 15 schools for one to two terms, with a baseline and an endline assessment.",
      "Materials are deliberately cheap, so most spend goes to teacher coaching."
    ],
    why: "That design makes SELution a child-data system from the first session. Per-child records, parents' phone numbers, cluster dashboards and WhatsApp coordination are exactly where children's data tends to leak, and they are also where AI is most tempting: summarising progress, drafting session plans and writing to parents.",
    recommendations: [
      ["Scope", "Three job cards instead of one general assistant: a Teacher Planning Assistant that drafts session plans and never sees learner data (Tier 1); a Cluster Summary Agent that reads aggregate counts only (Tier 0); and a Parent Message Assistant that drafts messages a teacher checks and sends (Tier 2)."],
      ["Anonymise", "Give each child a pseudonymous code at baseline and keep names on the school's own register. The dashboard works at group level, figures for groups smaller than five are hidden, and AI sees counts, never rows. Decide the identifier scheme before the baseline, because it is hard to change afterwards."],
      ["Fence", "Parents' replies on WhatsApp never reach an agent that can act. Messages are drafted for a teacher and never sent automatically."],
      ["Evidence", "A coach reviews a sample of AI-drafted session plans against the curriculum every month. Every draft that is accepted, edited or rejected is logged, and a breach plan with named roles is signed before the baseline."],
      ["Adapt", "Records are captured on paper or a shared tablet and synced at cluster level, so a lost connection never loses a session. Materials are tested with teachers in both English and Kiswahili, and the dashboard and documentation are handed over to the implementing partner so the system survives staff and funder changes."]
    ],
    measure: [
      "Teacher minutes saved per week, logged by the teachers themselves.",
      "Session-plan quality, scored blind by a coach against a curriculum checklist.",
      "The share of AI drafts rejected or heavily edited.",
      "Data incidents, with a target of zero.",
      "Parent response to drafted messages."
    ],
    lessons: [
      "Child data starts on day one. A ten-second record per child creates thousands of records in a term, so the controls have to come before the first session, not after the dashboard is built.",
      "Aggregates first. Most of the AI value in this design comes from summaries that never need a name.",
      "The cheapest control is not collecting. Every field on the per-child record should earn its place against the evidence threshold the pilot has to meet."
    ]
  };

  // An open outline anyone can use to publish their own case study.
  var CASE_TEMPLATE = [
    ["Context", "Who you are, what you do, and the people you serve, without naming individuals."],
    ["The data involved", "What personal data the work touches, where it lives, and who can see it."],
    ["Where AI helps", "The tasks, and the action tier for each one (read, draft, send or change)."],
    ["SAFE-A decisions", "One short paragraph for each pillar: Scope, Anonymise, Fence, Evidence, Adapt."],
    ["What you measured", "Time saved, quality checks, drafts rejected, incidents. Report counts, not just percentages."],
    ["Lessons", "What you would do differently, and what others should copy."],
    ["Permissions", "Written permission from every organisation named, and confirmation that nothing can identify a person."]
  ];

  g.SALAMA_STANDARD = { standard: STANDARD, caseStudy: CASE_STUDY, caseTemplate: CASE_TEMPLATE };
})(globalThis);
