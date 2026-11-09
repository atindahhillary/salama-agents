/* Salama Agents content: every question, option, label and message the app shows,
 * in English and Kiswahili (beta, pending native review). Pure data plus a few
 * small `when` predicates, so the same file loads in the browser and in the
 * Supabase edge function (Deno). Attaches to globalThis.SALAMA_CONTENT. */
(function (g) {
  "use strict";

  // ---------- Countries (ISO 3166-1 alpha-2). Regulator details live in REGULATORS below. ----------
  var COUNTRIES = [
    ["Africa", [["KE", "Kenya"], ["UG", "Uganda"], ["TZ", "Tanzania"], ["RW", "Rwanda"], ["BI", "Burundi"], ["ET", "Ethiopia"],
      ["SO", "Somalia"], ["SS", "South Sudan"], ["CD", "DR Congo"], ["NG", "Nigeria"], ["GH", "Ghana"], ["SL", "Sierra Leone"],
      ["LR", "Liberia"], ["SN", "Senegal"], ["CM", "Cameroon"], ["CI", "Côte d'Ivoire"], ["ZA", "South Africa"], ["ZM", "Zambia"],
      ["ZW", "Zimbabwe"], ["MW", "Malawi"], ["MZ", "Mozambique"], ["EG", "Egypt"], ["MA", "Morocco"]]],
    ["Asia and the Pacific", [["IN", "India"], ["BD", "Bangladesh"], ["PK", "Pakistan"], ["NP", "Nepal"], ["LK", "Sri Lanka"],
      ["PH", "Philippines"], ["ID", "Indonesia"], ["KH", "Cambodia"], ["MM", "Myanmar"], ["AU", "Australia"]]],
    ["Middle East", [["JO", "Jordan"], ["LB", "Lebanon"]]],
    ["Americas", [["BR", "Brazil"], ["MX", "Mexico"], ["CO", "Colombia"], ["PE", "Peru"], ["GT", "Guatemala"], ["HT", "Haiti"],
      ["US", "United States"], ["CA", "Canada"]]],
    ["Europe", [["GB", "United Kingdom"], ["EU", "European Union country"], ["XE", "Other European country"]]],
    ["Other", [["XX", "Another country"]]]
  ];
  var COUNTRY_NAMES = {};
  COUNTRIES.forEach(function (grp) { grp[1].forEach(function (c) { COUNTRY_NAMES[c[0]] = c[1]; }); });

  // From the data protection lawyer's reviewed table (council/03-legal.md). `verify: true`
  // marks entries the lawyer flagged for checking. `registration` says whether the
  // authority runs a registration, licensing or notification scheme for controllers
  // (true), does not (false), or it is unclear for most NGOs (null). Questions only ask
  // "are you registered" when it is true. Countries missing here get generic wording.
  var REGULATORS = {
    KE: { law: "Data Protection Act 2019", authority: "the Office of the Data Protection Commissioner (ODPC)", short: "the ODPC", registration: true, breach: "72h" },
    UG: { law: "Data Protection and Privacy Act 2019", authority: "the Personal Data Protection Office (PDPO)", short: "the PDPO", registration: true },
    TZ: { law: "Personal Data Protection Act 2022", authority: "the Personal Data Protection Commission (PDPC)", short: "the PDPC", registration: true },
    RW: { law: "Law No. 058/2021 on the protection of personal data and privacy", authority: "the National Cyber Security Authority (NCSA)", short: "the NCSA", registration: true, breach: "48h" },
    ET: { law: "Personal Data Protection Proclamation No. 1321/2024", authority: "the Ethiopian Communication Authority", short: "the Ethiopian Communication Authority", registration: null, verify: true },
    NG: { law: "Nigeria Data Protection Act 2023", authority: "the Nigeria Data Protection Commission (NDPC)", short: "the NDPC", registration: null, breach: "72h" },
    GH: { law: "Data Protection Act 2012 (Act 843)", authority: "the Data Protection Commission", short: "the Data Protection Commission", registration: true },
    ZA: { law: "Protection of Personal Information Act 2013 (POPIA)", authority: "the Information Regulator", short: "the Information Regulator", registration: null, breach: "asap" },
    ZM: { law: "Data Protection Act 2021", authority: "the Office of the Data Protection Commissioner", short: "the Office of the Data Protection Commissioner", registration: true, verify: true },
    ZW: { law: "Cyber and Data Protection Act 2021", authority: "POTRAZ, as the data protection authority", short: "POTRAZ", registration: true },
    MW: { law: "Data Protection Act 2024", authority: "MACRA", short: "MACRA", registration: null, verify: true },
    SN: { law: "Law No. 2008-12 on the protection of personal data", authority: "the Commission de Protection des Données Personnelles (CDP)", short: "the CDP", registration: true, verify: true },
    EG: { law: "Personal Data Protection Law No. 151 of 2020", authority: "the Personal Data Protection Center", short: "the Personal Data Protection Center", registration: null, verify: true },
    MA: { law: "Law No. 09-08", authority: "the CNDP", short: "the CNDP", registration: true },
    IN: { law: "Digital Personal Data Protection Act 2023", authority: "the Data Protection Board of India", short: "the Data Protection Board of India", registration: false, verify: true },
    PK: { law: null, authority: null, short: null, registration: false, verify: true },
    PH: { law: "Data Privacy Act of 2012", authority: "the National Privacy Commission (NPC)", short: "the National Privacy Commission", registration: null },
    ID: { law: "Personal Data Protection Law No. 27 of 2022", authority: null, short: null, registration: false, verify: true },
    BR: { law: "General Data Protection Law (LGPD)", authority: "the ANPD", short: "the ANPD", registration: false },
    CO: { law: "Law 1581 of 2012", authority: "the Superintendence of Industry and Commerce", short: "the Superintendence of Industry and Commerce", registration: null },
    GB: { law: "UK GDPR and the Data Protection Act 2018", authority: "the Information Commissioner's Office (ICO)", short: "the ICO (data protection fee)", registration: true, breach: "72h" },
    EU: { law: "the GDPR", authority: "your national data protection authority", short: null, registration: false, breach: "72h" },
    US: { law: null, authority: null, short: null, registration: false },
    CA: { law: "PIPEDA, and provincial laws such as Quebec's Law 25", authority: "the Office of the Privacy Commissioner of Canada", short: null, registration: false }
  };

  // Vetted legal notes (council/03-legal.md claims table). Shown as general information,
  // never as a compliance finding. `when(a, ctx)` decides whether a note applies.
  var LEGAL_NOTES = [
    { id: "ke_register", when: function (a, ctx) { return ctx.country === "KE" && a.registered !== "yes"; },
      en: "Most Kenyan organisations handling personal data must register with the ODPC. Very small ones may be exempt, but not schools, health providers or other listed sectors. Check your status with the ODPC.",
      sw: "Mashirika mengi ya Kenya yanayoshughulikia data binafsi lazima yasajiliwe na ODPC. Madogo sana yanaweza kusamehewa, lakini si shule, watoa huduma za afya au sekta nyingine zilizoorodheshwa. Hakikisheni hali yenu na ODPC." },
    { id: "ke_breach", when: function (a, ctx) { return ctx.country === "KE"; },
      en: "In Kenya, where a breach poses a real risk of harm, the ODPC must be told within 72 hours of becoming aware, and the people affected must be told in writing.",
      sw: "Nchini Kenya, uvujaji wa data unapoleta hatari halisi ya madhara, ODPC lazima ijulishwe ndani ya saa 72 tangu kujua, na walioathirika wajulishwe kwa maandishi." },
    { id: "ke_children", when: function (a, ctx) { return ctx.country === "KE" && ctx.servesChildren; },
      en: "In Kenya, a child's data (under 18) needs a parent's or guardian's consent, must serve the child's best interests, and needs age verification.",
      sw: "Nchini Kenya, data ya mtoto (chini ya miaka 18) inahitaji idhini ya mzazi au mlezi, lazima iwe kwa maslahi bora ya mtoto, na inahitaji uthibitisho wa umri." },
    { id: "breach_global", when: function (a, ctx) { return ctx.country !== "KE"; },
      en: "Many data protection laws require fast notice of serious breaches, for example 72 hours in Kenya, Nigeria, the EU and the UK, 48 hours in Rwanda, and as soon as reasonably possible in South Africa. Check the rule in each country you work in.",
      sw: "Sheria nyingi za ulinzi wa data zinataka taarifa ya haraka ya uvujaji mkubwa, kwa mfano saa 72 nchini Kenya, Nigeria, Umoja wa Ulaya na Uingereza, saa 48 nchini Rwanda, na haraka iwezekanavyo nchini Afrika Kusini. Hakikisheni kanuni ya kila nchi mnayofanyia kazi." },
    { id: "children_global", when: function (a, ctx) { return ctx.country !== "KE" && ctx.servesChildren; },
      en: "The age at which a parent must consent varies: under 18 in Kenya, Nigeria and India, 16 in Rwanda, 13 to 16 for online services in the EU and UK, and 13 for online services in the US. Follow the child's country, and if unsure, use the strictest.",
      sw: "Umri ambao mzazi lazima atoe idhini hutofautiana: chini ya 18 nchini Kenya, Nigeria na India, 16 nchini Rwanda, 13 hadi 16 kwa huduma za mtandaoni Ulaya na Uingereza, na 13 kwa huduma za mtandaoni Marekani. Fuateni nchi ya mtoto, na mkiwa na shaka, tumieni kanuni kali zaidi." },
    { id: "transfer", when: function (a) { return a.ai_use && a.ai_use !== "none"; },
      en: "Most AI tools process data in another country. Many laws allow this only with safeguards, and some education and health data may need a copy kept in-country. Record where each tool sends data.",
      sw: "Zana nyingi za AI huchakata data katika nchi nyingine. Sheria nyingi huruhusu hili kwa kinga tu, na baadhi ya data za elimu na afya zinaweza kuhitaji nakala kubaki nchini. Rekodini kila zana hupeleka data wapi." }
  ];

  // ---------- Organisation types ----------
  var SCHOOL_TYPES = ["school_public", "school_private", "school_network"];
  var GOV_TYPES = ["edu_office", "local_gov"];

  // ---------- Helpers used by `when` predicates ----------
  function has(a, k, v) { return Array.isArray(a[k]) && a[k].indexOf(v) >= 0; }
  function isSchool(a) { return SCHOOL_TYPES.indexOf(a.org_type) >= 0; }
  function servesChildren(a) { return has(a, "serve", "kids_u6") || has(a, "serve", "kids_6_12") || has(a, "serve", "teens") || isSchool(a); }
  var NOT_SURE = { v: "unsure", en: "Not sure", sw: "Sina uhakika" };

  // ---------- Steps and questions ----------
  // type: single | multi | select | textarea. `max` caps a multi. `optional` skips validation.
  var STEPS = [
    {
      id: "about",
      title: { en: "About you", sw: "Kuhusu ninyi" },
      intro: { en: "A few basics so your results fit your organisation.", sw: "Maswali machache ya msingi ili matokeo yaendane na shirika lenu." },
      questions: [
        { id: "org_type", type: "single", label: { en: "What kind of organisation are you?", sw: "Shirika lenu ni la aina gani?" },
          options: [
            { v: "ngo", en: "Local or national NGO", sw: "Shirika lisilo la kiserikali la ndani au la kitaifa" },
            { v: "ingo", en: "International NGO (country office)", sw: "Shirika la kimataifa (ofisi ya nchi)" },
            { v: "cbo", en: "Community-based organisation", sw: "Shirika la kijamii (CBO)" },
            { v: "fbo", en: "Faith-based organisation", sw: "Shirika la kidini" },
            { v: "school_public", en: "Public school", sw: "Shule ya umma" },
            { v: "school_private", en: "Private or low-fee school", sw: "Shule ya binafsi au ya ada nafuu" },
            { v: "school_network", en: "School network or chain", sw: "Mtandao wa shule" },
            { v: "edu_office", en: "Education office (national, regional or district)", sw: "Ofisi ya elimu (kitaifa, kaunti au wilaya)" },
            { v: "local_gov", en: "Local or county government", sw: "Serikali ya mtaa au ya kaunti" },
            { v: "social", en: "Social enterprise or EdTech", sw: "Biashara ya kijamii au EdTech" },
            { v: "funder", en: "Funder or foundation", sw: "Mfadhili au wakfu" }
          ] },
        { id: "country", type: "select", label: { en: "Which country do you mainly work in?", sw: "Mnafanya kazi zaidi katika nchi gani?" } },
        { id: "staff", type: "single", when: function (a) { return a.org_type !== "funder"; },
          label: { en: "How many paid staff do you have?", sw: "Mna wafanyakazi wangapi wanaolipwa?" },
          options: [
            { v: "s1", en: "1 to 9", sw: "1 hadi 9" }, { v: "s2", en: "10 to 49", sw: "10 hadi 49" },
            { v: "s3", en: "50 to 200", sw: "50 hadi 200" }, { v: "s4", en: "Over 200", sw: "Zaidi ya 200" }
          ] },
        { id: "collectors", type: "single", when: function (a) { return a.org_type !== "funder"; },
          label: { en: "How many volunteers, community workers, teachers or partner staff collect data for you?", sw: "Ni wajitolea, wahudumu wa jamii, walimu au wafanyakazi wa washirika wangapi wanaokusanya data kwa niaba yenu?" },
          options: [
            { v: "none", en: "None", sw: "Hakuna" }, { v: "c1", en: "1 to 20", sw: "1 hadi 20" },
            { v: "c2", en: "21 to 100", sw: "21 hadi 100" }, { v: "c3", en: "Over 100", sw: "Zaidi ya 100" }, NOT_SURE
          ] },
        { id: "serve", type: "multi", when: function (a) { return a.org_type !== "funder"; },
          label: { en: "Who do you serve?", sw: "Mnahudumia nani?" }, help: "pick_all",
          options: [
            { v: "kids_u6", en: "Children under 6", sw: "Watoto chini ya miaka 6" },
            { v: "kids_6_12", en: "Children 6 to 12", sw: "Watoto wa miaka 6 hadi 12" },
            { v: "teens", en: "Young people 13 to 17", sw: "Vijana wa miaka 13 hadi 17" },
            { v: "youth", en: "Young adults 18 to 35", sw: "Vijana wa miaka 18 hadi 35" },
            { v: "adults", en: "Adults and caregivers", sw: "Watu wazima na walezi" },
            { v: "pwd", en: "People or learners with disabilities", sw: "Watu au wanafunzi wenye ulemavu" },
            { v: "patients", en: "Patients or people with health conditions", sw: "Wagonjwa au watu wenye hali za kiafya" },
            { v: "refugees", en: "Refugees or displaced people", sw: "Wakimbizi au watu waliohamishwa makazi" },
            { v: "survivors", en: "Survivors of violence, including gender-based violence", sw: "Manusura wa ukatili, pamoja na ukatili wa kijinsia" },
            { v: "teachers", en: "Teachers and schools", sw: "Walimu na shule" }
          ] },
        { id: "levels", type: "multi", optional: true, when: isSchool,
          label: { en: "Which levels do you teach?", sw: "Mnafundisha ngazi zipi?" }, help: "pick_all",
          options: [
            { v: "pre", en: "Pre-primary", sw: "Elimu ya awali" }, { v: "lower", en: "Lower primary", sw: "Msingi wa chini" },
            { v: "upper", en: "Upper primary", sw: "Msingi wa juu" }, { v: "junior", en: "Junior or lower secondary", sw: "Sekondari ya chini" },
            { v: "senior", en: "Senior or upper secondary", sw: "Sekondari ya juu" }, { v: "tvet", en: "Vocational or other", sw: "Ufundi au nyingine" }
          ] }
      ]
    },
    {
      id: "work",
      title: { en: "Your work", sw: "Kazi yenu" },
      intro: { en: "Which tasks would you most like help with?", sw: "Ni kazi zipi mngependa kusaidiwa zaidi?" },
      questions: [
        { id: "tasks", type: "multi", max: 3, label: { en: "Pick up to 3 tasks that take your team the most time", sw: "Chagua hadi kazi 3 zinazochukua muda mwingi wa timu yenu" },
          options: [
            { v: "reporting", en: "Donor reports and impact stories", sw: "Ripoti kwa wafadhili na hadithi za mafanikio" },
            { v: "proposals", en: "Proposals and budgets", sw: "Maandiko ya miradi na bajeti" },
            { v: "data_cleaning", en: "Survey and field data cleaning", sw: "Kusafisha data za tafiti na za uwandani" },
            { v: "lessons", en: "Lesson plans and schemes of work", sw: "Maandalio ya somo na maazimio ya kazi" },
            { v: "assessment", en: "Assessment tasks and rubrics", sw: "Kazi za tathmini na vigezo vyake" },
            { v: "parent_reports", en: "Progress reports for parents", sw: "Ripoti za maendeleo kwa wazazi" },
            { v: "inclusive", en: "Differentiated and inclusive materials", sw: "Nyenzo za viwango tofauti na jumuishi" },
            { v: "coaching", en: "Teacher coaching and training notes", sw: "Ushauri na mafunzo kwa walimu" },
            { v: "attendance", en: "Attendance and dropout follow-up", sw: "Ufuatiliaji wa mahudhurio na wanaoacha masomo" },
            { v: "messages", en: "Messages to parents and communities, including translation", sw: "Ujumbe kwa wazazi na jamii, pamoja na tafsiri" },
            { v: "safeguarding", en: "Safeguarding incident intake (higher risk)", sw: "Kupokea ripoti za ulinzi wa mtoto (hatari kubwa)" },
            { v: "knowledge", en: "Answers from our own documents", sw: "Majibu kutoka kwenye nyaraka zetu wenyewe" }
          ] },
        { id: "report_days", type: "single", when: function (a) { return !isSchool(a); },
          label: { en: "Last reporting period, how many staff days went into donor reports?", sw: "Katika kipindi kilichopita cha ripoti, siku ngapi za wafanyakazi zilitumika kuandaa ripoti za wafadhili?" },
          options: [
            { v: "d1", en: "Under 3", sw: "Chini ya 3" }, { v: "d2", en: "3 to 10", sw: "3 hadi 10" },
            { v: "d3", en: "10 to 20", sw: "10 hadi 20" }, { v: "d4", en: "Over 20", sw: "Zaidi ya 20" },
            { v: "none", en: "We don't report to donors", sw: "Hatutoi ripoti kwa wafadhili" }, NOT_SURE
          ] },
        { id: "templates", type: "single", when: function (a) { return !isSchool(a) && a.report_days && a.report_days !== "none"; },
          label: { en: "How many donors want reports in their own template?", sw: "Ni wafadhili wangapi wanaotaka ripoti kwa violezo vyao wenyewe?" },
          options: [
            { v: "t1", en: "1", sw: "1" }, { v: "t2", en: "2 to 3", sw: "2 hadi 3" },
            { v: "t3", en: "4 to 6", sw: "4 hadi 6" }, { v: "t4", en: "7 or more", sw: "7 au zaidi" }
          ] },
        { id: "teacher_hours", type: "single", when: isSchool,
          label: { en: "How many hours a week does a teacher spend on lesson plans, schemes and records?", sw: "Mwalimu hutumia saa ngapi kwa wiki kuandaa maandalio ya somo, maazimio na rekodi?" },
          options: [
            { v: "h1", en: "Under 2", sw: "Chini ya 2" }, { v: "h2", en: "2 to 5", sw: "2 hadi 5" },
            { v: "h3", en: "5 to 10", sw: "5 hadi 10" }, { v: "h4", en: "Over 10", sw: "Zaidi ya 10" }, NOT_SURE
          ] },
        { id: "pain_text", type: "textarea", optional: true, maxLength: 280,
          label: { en: "In a sentence or two, what takes your team the most time?", sw: "Kwa sentensi moja au mbili, ni nini kinachochukua muda mwingi wa timu yenu?" },
          help: "pain_help" }
      ]
    },
    {
      id: "ai",
      title: { en: "AI today", sw: "AI kwa sasa" },
      intro: { en: "No wrong answers. Starting from zero is fine.", sw: "Hakuna jibu baya. Kuanza bila chochote ni sawa kabisa." },
      questions: [
        { id: "ai_use", type: "single", label: { en: "How does your team use AI tools like ChatGPT, Gemini or Copilot today?", sw: "Timu yenu inatumiaje zana za AI kama ChatGPT, Gemini au Copilot kwa sasa?" },
          options: [
            { v: "none", en: "We don't use them", sw: "Hatuzitumii" },
            { v: "personal", en: "Some staff use free tools on personal accounts", sw: "Baadhi ya wafanyakazi hutumia zana za bure kwa akaunti zao binafsi" },
            { v: "approved", en: "We have approved tools on work accounts", sw: "Tuna zana zilizoidhinishwa kwenye akaunti za kazi" },
            { v: "built", en: "We have built or commissioned our own AI tools", sw: "Tumetengeneza au kuagiza zana zetu za AI" }, NOT_SURE
          ] },
        { id: "ai_data", type: "multi", when: function (a) { return a.ai_use && a.ai_use !== "none"; },
          label: { en: "In the last 3 months, has anyone put any of these into an AI tool?", sw: "Katika miezi 3 iliyopita, kuna mtu ameweka mojawapo ya haya kwenye zana ya AI?" }, help: "honest_help",
          options: [
            { v: "nothing", en: "Nothing sensitive", sw: "Hakuna cha siri" },
            { v: "internal", en: "Internal documents and drafts", sw: "Nyaraka za ndani na rasimu" },
            { v: "names", en: "Names or phone numbers of people we serve", sw: "Majina au namba za simu za tunaowahudumia" },
            { v: "learner", en: "Learner names with marks or reports", sw: "Majina ya wanafunzi pamoja na alama au ripoti" },
            { v: "photos", en: "Photos or videos of children", sw: "Picha au video za watoto" },
            { v: "health", en: "Health, disability or special needs notes", sw: "Maelezo ya afya, ulemavu au mahitaji maalum" },
            { v: "cases", en: "Case or survivor information", sw: "Taarifa za kesi au za manusura" },
            { v: "finance", en: "Donor or financial records", sw: "Rekodi za wafadhili au za fedha" },
            { v: "cannot_tell", en: "Staff use personal accounts, so we can't tell", sw: "Wafanyakazi hutumia akaunti binafsi, kwa hiyo hatuwezi kujua" }
          ] },
        { id: "ai_rules", type: "single", label: { en: "Do you have written rules for using AI?", sw: "Mna kanuni zilizoandikwa za kutumia AI?" },
          options: [
            { v: "none", en: "No", sw: "Hapana" },
            { v: "written", en: "Yes, but staff haven't been trained on them", sw: "Ndiyo, lakini wafanyakazi hawajafunzwa" },
            { v: "trained", en: "Yes, and staff are trained", sw: "Ndiyo, na wafanyakazi wamefunzwa" }, NOT_SURE
          ] }
      ]
    },
    {
      id: "data",
      title: { en: "Data and protection", sw: "Data na ulinzi wake" },
      intro: { en: "The hardest step. \"Not sure\" is a useful answer.", sw: "Hatua ngumu zaidi. \"Sina uhakika\" ni jibu lenye manufaa." },
      note: "data_note",
      questions: [
        { id: "registered", type: "single", when: function (a, ctx) { return !(ctx && ctx.reg && ctx.reg.registration === false); },
          label: { en: "Is your organisation registered with {regulator}?", sw: "Je, shirika lenu limesajiliwa na {regulator}?" },
          options: [
            { v: "yes", en: "Yes, and it is current", sw: "Ndiyo, na usajili uko hai" },
            { v: "applied", en: "We have applied or are renewing", sw: "Tumeomba au tunahuisha" },
            { v: "no", en: "No", sw: "Hapana" },
            { v: "unsure", en: "Not sure who handles this", sw: "Sijui nani anashughulikia hili" }
          ] },
        { id: "dp_lead", type: "single", when: function (a, ctx) { return !!(ctx && ctx.reg && ctx.reg.registration === false); },
          label: { en: "Do you have a named person responsible for data protection?", sw: "Mna mtu aliyeteuliwa kusimamia ulinzi wa data?" },
          options: [
            { v: "yes", en: "Yes", sw: "Ndiyo" }, { v: "informal", en: "Someone does it informally", sw: "Mtu hufanya hivyo bila uteuzi rasmi" },
            { v: "no", en: "No", sw: "Hapana" }, NOT_SURE
          ] },
        { id: "consent", type: "single", when: servesChildren,
          label: { en: "When you collect information about children, how is consent recorded?", sw: "Mnapokusanya taarifa za watoto, idhini hurekodiwa vipi?" },
          options: [
            { v: "signed", en: "A signed form that states the purpose", sw: "Fomu iliyosainiwa inayoeleza madhumuni" },
            { v: "general", en: "A general form at enrolment", sw: "Fomu ya jumla wakati wa kujiunga" },
            { v: "digital", en: "A question in our digital form", sw: "Swali kwenye fomu yetu ya kidijitali" },
            { v: "verbal", en: "Verbally, not recorded", sw: "Kwa mdomo, bila kurekodiwa" },
            { v: "partner", en: "A school or partner collects it", sw: "Shule au mshirika ndiye hukusanya" }, NOT_SURE
          ] },
        { id: "access", type: "single", label: { en: "How do staff log in to email, data tools and shared drives?", sw: "Wafanyakazi huingiaje kwenye barua pepe, zana za data na hifadhi za pamoja?" },
          options: [
            { v: "mfa", en: "Their own login plus a code sent to their phone", sw: "Akaunti yao binafsi pamoja na namba inayotumwa kwa simu" },
            { v: "password", en: "Their own login, password only", sw: "Akaunti binafsi, nenosiri pekee" },
            { v: "shared", en: "Some team logins are shared", sw: "Baadhi ya akaunti za timu hutumiwa kwa pamoja" }, NOT_SURE
          ] },
        { id: "systems", type: "multi", label: { en: "Where does personal data live today?", sw: "Data binafsi huhifadhiwa wapi kwa sasa?" }, help: "pick_all",
          options: [
            { v: "paper", en: "Paper registers", sw: "Rejista za karatasi" },
            { v: "sheets", en: "Excel or Google Sheets", sw: "Excel au Google Sheets" },
            { v: "forms", en: "KoBo, ODK or similar digital forms", sw: "KoBo, ODK au fomu za kidijitali kama hizo" },
            { v: "crm", en: "A CRM or case management system", sw: "Mfumo wa CRM au wa kusimamia kesi" },
            { v: "gov", en: "{learnerSystem} or another government system", sw: "{learnerSystem} au mfumo mwingine wa serikali" },
            { v: "school_mis", en: "School management or fees software", sw: "Programu ya usimamizi wa shule au ada" },
            { v: "whatsapp", en: "WhatsApp groups", sw: "Makundi ya WhatsApp" }, NOT_SURE
          ] },
        { id: "data_flow", type: "single", when: function (a) { return !isSchool(a); },
          label: { en: "How do partners or field teams send you data?", sw: "Washirika au timu za uwandani huwatumiaje data?" },
          options: [
            { v: "forms", en: "Through a shared digital form", sw: "Kupitia fomu ya kidijitali ya pamoja" },
            { v: "email", en: "Spreadsheets by email", sw: "Majedwali kwa barua pepe" },
            { v: "wa_photos", en: "WhatsApp photos of registers", sw: "Picha za rejista kupitia WhatsApp" },
            { v: "paper", en: "On paper", sw: "Kwa karatasi" },
            { v: "none", en: "We have no partners or field teams", sw: "Hatuna washirika wala timu za uwandani" }
          ] },
        { id: "data_entry", type: "single", when: isSchool,
          label: { en: "Who enters learner data into {learnerSystem}?", sw: "Nani huingiza data za wanafunzi kwenye {learnerSystem}?" },
          options: [
            { v: "head", en: "The head or deputy", sw: "Mwalimu mkuu au naibu wake" },
            { v: "ict", en: "A named ICT teacher", sw: "Mwalimu wa TEHAMA aliyeteuliwa" },
            { v: "clerk", en: "A clerk or bursar", sw: "Karani au mhasibu" },
            { v: "outside", en: "A cyber cafe or another outside person", sw: "Mhudumu wa cyber au mtu mwingine wa nje" }, NOT_SURE
          ] },
        { id: "breach", type: "single", label: { en: "If personal data leaked tomorrow, would you have a written plan?", sw: "Data binafsi zikivuja kesho, mngekuwa na mpango ulioandikwa?" },
          options: [
            { v: "practised", en: "Yes, and we have practised it", sw: "Ndiyo, na tumeufanyia mazoezi" },
            { v: "written", en: "Yes, written but never used", sw: "Ndiyo, umeandikwa lakini haujatumika" },
            { v: "no", en: "No", sw: "Hapana" }, NOT_SURE
          ] }
      ]
    },
    {
      id: "field",
      title: { en: "Field realities", sw: "Hali halisi uwandani" },
      intro: { en: "How your teams and communities really connect.", sw: "Jinsi timu na jamii zenu zinavyowasiliana kwa kweli." },
      questions: [
        { id: "connectivity", type: "single", label: { en: "How is the internet where your teams work?", sw: "Mtandao ukoje mahali timu zenu zinapofanya kazi?" },
          options: [
            { v: "good", en: "Reliable in the office and the field", sw: "Unaaminika ofisini na uwandani" },
            { v: "patchy", en: "Good in the office, patchy in the field", sw: "Mzuri ofisini, wa kusuasua uwandani" },
            { v: "offline", en: "Mostly offline in the field", sw: "Mara nyingi hakuna mtandao uwandani" }
          ] },
        { id: "devices", type: "multi", label: { en: "Where would staff use an AI assistant?", sw: "Wafanyakazi wangetumia msaidizi wa AI wapi?" }, help: "pick_all",
          options: [
            { v: "laptops", en: "Work laptops", sw: "Kompyuta za kazi" },
            { v: "own_phones", en: "Staff's own phones", sw: "Simu binafsi za wafanyakazi" },
            { v: "shared_pc", en: "A shared office computer", sw: "Kompyuta ya pamoja ofisini" },
            { v: "programme", en: "Programme tablets or phones", sw: "Tablet au simu za mradi" },
            { v: "shared_collect", en: "Shared data collection phones", sw: "Simu za pamoja za kukusanyia data" },
            { v: "cafe", en: "A cyber cafe", sw: "Cyber cafe" }
          ] },
        { id: "channels", type: "multi", label: { en: "How do you reach the people you serve, or parents?", sw: "Mnawafikiaje mnaowahudumia, au wazazi?" }, help: "pick_all",
          options: [
            { v: "whatsapp", en: "WhatsApp", sw: "WhatsApp" }, { v: "sms", en: "Bulk SMS", sw: "SMS za jumla" },
            { v: "ussd", en: "USSD", sw: "USSD" }, { v: "calls", en: "Phone calls", sw: "Kupiga simu" },
            { v: "radio", en: "Radio", sw: "Redio" }, { v: "meetings", en: "Meetings in person", sw: "Mikutano ya ana kwa ana" },
            { v: "letters", en: "Letters or learner diaries", sw: "Barua au shajara za wanafunzi" }, { v: "app", en: "An app", sw: "Programu (app)" }
          ] },
        { id: "languages", type: "multi", label: { en: "Which languages do they use?", sw: "Wanatumia lugha zipi?" }, help: "pick_all",
          options: [
            { v: "en", en: "English", sw: "Kiingereza" }, { v: "fr", en: "French", sw: "Kifaransa" }, { v: "es", en: "Spanish", sw: "Kihispania" },
            { v: "pt", en: "Portuguese", sw: "Kireno" }, { v: "ar", en: "Arabic", sw: "Kiarabu" }, { v: "sw", en: "Kiswahili", sw: "Kiswahili" },
            { v: "am", en: "Amharic", sw: "Kiamhari" }, { v: "so", en: "Somali", sw: "Kisomali" }, { v: "ha", en: "Hausa", sw: "Kihausa" },
            { v: "yo", en: "Yoruba", sw: "Kiyoruba" }, { v: "hi", en: "Hindi", sw: "Kihindi" }, { v: "bn", en: "Bengali", sw: "Kibengali" },
            { v: "ur", en: "Urdu", sw: "Kiurdu" }, { v: "id", en: "Indonesian", sw: "Kiindonesia" }, { v: "tl", en: "Tagalog or Filipino", sw: "Kitagalogi" },
            { v: "local", en: "Another local language", sw: "Lugha nyingine ya kienyeji" }
          ] },
        { id: "continuity", type: "single", label: { en: "If the person who runs your data and reports left tomorrow, could someone else produce the next report?", sw: "Kama mtu anayesimamia data na ripoti zenu angeondoka kesho, mtu mwingine angeweza kuandaa ripoti inayofuata?" },
          options: [
            { v: "yes", en: "Yes", sw: "Ndiyo" }, { v: "partly", en: "Partly", sw: "Kwa kiasi" }, { v: "no", en: "No", sw: "Hapana" }
          ] }
      ]
    },
    {
      id: "plans",
      title: { en: "Your plans", sw: "Mipango yenu" },
      intro: { en: "Last step. This helps us suggest a realistic first move.", sw: "Hatua ya mwisho. Hii hutusaidia kupendekeza hatua ya kwanza inayowezekana." },
      questions: [
        { id: "timeline", type: "single", label: { en: "When would you want to start?", sw: "Mngependa kuanza lini?" },
          options: [
            { v: "now", en: "Within a month", sw: "Ndani ya mwezi mmoja" }, { v: "soon", en: "In 1 to 3 months", sw: "Ndani ya miezi 1 hadi 3" },
            { v: "later", en: "In 3 to 6 months", sw: "Ndani ya miezi 3 hadi 6" }, { v: "explore", en: "We're just exploring", sw: "Tunachunguza tu" }
          ] },
        { id: "triggers", type: "multi", optional: true, label: { en: "Is anything coming up in the next three months?", sw: "Kuna jambo lolote linalokuja katika miezi mitatu ijayo?" }, help: "pick_all",
          options: [
            { v: "report", en: "A donor report is due", sw: "Ripoti ya mfadhili inatakiwa" },
            { v: "proposal", en: "A proposal deadline", sw: "Tarehe ya mwisho ya andiko la mradi" },
            { v: "diligence", en: "Funder due diligence or an audit", sw: "Ukaguzi wa mfadhili au wa hesabu" },
            { v: "grant", en: "A new grant starting", sw: "Ruzuku mpya inaanza" },
            { v: "board", en: "A board meeting", sw: "Mkutano wa bodi" },
            { v: "yearend", en: "A grant or financial year ending", sw: "Mwisho wa ruzuku au wa mwaka wa fedha" },
            { v: "term", en: "School term planning", sw: "Mipango ya muhula wa shule" },
            { v: "nothing", en: "Nothing specific", sw: "Hakuna jambo maalum" }
          ] },
        { id: "pay_path", type: "single", label: { en: "If this proves useful, how could it be paid for?", sw: "Ikionekana kuwa na manufaa, ingelipiwa vipi?" },
          options: [
            { v: "line", en: "From an existing budget line", sw: "Kutoka kifungu cha bajeti kilichopo" },
            { v: "move", en: "We'd need to move funds or ask our funder", sw: "Tungehitaji kuhamisha fedha au kumwomba mfadhili" },
            { v: "proposal", en: "In an upcoming proposal", sw: "Kwenye andiko la mradi linalokuja" },
            { v: "funder", en: "A funder might pay directly", sw: "Mfadhili anaweza kulipa moja kwa moja" },
            { v: "none", en: "No budget right now", sw: "Hakuna bajeti kwa sasa" }, NOT_SURE
          ] },
        { id: "funder_asked", type: "single", label: { en: "Has a funder asked about AI, data protection or digital safeguarding?", sw: "Kuna mfadhili aliyeuliza kuhusu AI, ulinzi wa data au ulinzi wa kidijitali?" },
          options: [
            { v: "conditions", en: "It's in our grant conditions", sw: "Iko kwenye masharti ya ruzuku yetu" },
            { v: "asked", en: "Yes, they have asked", sw: "Ndiyo, wameuliza" },
            { v: "no", en: "No", sw: "Hapana" }, NOT_SURE
          ] },
        { id: "role", type: "single", label: { en: "What is your role in a decision like this?", sw: "Una nafasi gani katika uamuzi kama huu?" },
          options: [
            { v: "approve", en: "I approve spending", sw: "Mimi huidhinisha matumizi" },
            { v: "recommend", en: "I recommend, and my director approves", sw: "Mimi hupendekeza, na mkurugenzi huidhinisha" },
            { v: "board", en: "It needs board, ministry or head office approval", sw: "Inahitaji idhini ya bodi, wizara au makao makuu" },
            { v: "info", en: "I'm gathering information", sw: "Ninakusanya taarifa" }
          ] },
        { id: "budget", type: "single", optional: true, label: { en: "Roughly what could you put toward this in the next 12 months?", sw: "Takriban mngeweza kutenga kiasi gani kwa hili katika miezi 12 ijayo?" }, help: "budget_help",
          options: [
            { v: "b0", en: "No budget yet", sw: "Hakuna bajeti bado" },
            { v: "b1", en: "Under {b1}", sw: "Chini ya {b1}" }, { v: "b2", en: "{b1} to {b2}", sw: "{b1} hadi {b2}" },
            { v: "b3", en: "{b2} to {b3}", sw: "{b2} hadi {b3}" }, { v: "b4", en: "Over {b3}", sw: "Zaidi ya {b3}" },
            { v: "funder", en: "A funder would need to pay", sw: "Mfadhili angehitaji kulipa" },
            { v: "private", en: "Prefer not to say", sw: "Napendelea kutosema" }
          ] },
        { id: "consent_report", type: "checkbox", optional: true, help: "consent_helper",
          label: { en: "Yes, my organisation's answers, without names or contact details, may be included in the annual AI Readiness report. Only combined results from many organisations will be published. My organisation will not be named and my written answers will not be quoted. I can withdraw at any time for reports not yet published.",
            sw: "Ndiyo, majibu ya shirika letu, bila majina wala taarifa za mawasiliano, yanaweza kujumuishwa kwenye ripoti ya kila mwaka ya Utayari wa AI. Matokeo ya pamoja ya mashirika mengi pekee ndiyo yatachapishwa. Shirika letu halitatajwa na majibu yetu yaliyoandikwa hayatanukuliwa. Ninaweza kuondoa ruhusa wakati wowote kwa ripoti ambazo bado hazijachapishwa." } }
      ]
    }
  ];

  // Budget bands by currency (shown in the budget options).
  var BUDGET_BANDS = {
    USD: { b1: "US$500", b2: "US$2,000", b3: "US$10,000" },
    KES: { b1: "KES 65,000", b2: "KES 260,000", b3: "KES 1.3 million" }
  };

  // ---------- Agents ----------
  var AGENTS = [
    { id: "meal", tier: "med", tasks: ["reporting", "data_cleaning"],
      name: { en: "MEAL Reporting Agent", sw: "Wakala wa Ripoti za Ufuatiliaji na Tathmini" },
      who: { en: "M&E officers and programme managers", sw: "Maafisa wa ufuatiliaji na tathmini na wasimamizi wa miradi" },
      desc: { en: "Turns cleaned field data into donor-ready indicator tables and a draft narrative. Code calculates every number; the AI only writes words around them.", sw: "Hubadilisha data za uwandani zilizosafishwa kuwa majedwali ya viashiria na rasimu ya maelezo kwa wafadhili. Programu hukokotoa kila namba; AI huandika maneno tu." },
      guardrails: { en: ["Every figure links back to its source row", "Missing breakdowns show as \"not recorded\", never guessed", "Never invents quotes or case stories", "A person approves before anything is sent"],
        sw: ["Kila namba inaonyesha chanzo chake", "Takwimu zisizopatikana huonyeshwa kama \"hazijarekodiwa\", hazikisiwi", "Haibuni nukuu wala hadithi", "Mtu huidhinisha kabla chochote hakijatumwa"] } },
    { id: "grant", tier: "low", tasks: ["proposals"],
      name: { en: "Proposal and Budget Assistant", sw: "Msaidizi wa Maandiko ya Miradi na Bajeti" },
      who: { en: "Directors and fundraising staff", sw: "Wakurugenzi na wafanyakazi wa kutafuta fedha" },
      desc: { en: "Drafts proposals against the funder's template using your own approved evidence, and marks every claim it cannot source.", sw: "Huandaa rasimu za maandiko kulingana na kiolezo cha mfadhili kwa kutumia ushahidi wenu ulioidhinishwa, na huweka alama kwenye kila dai lisilo na chanzo." },
      guardrails: { en: ["Reads only documents you approve", "Marks any claim it cannot source", "Drafts only; a person submits"],
        sw: ["Husoma nyaraka mlizoidhinisha pekee", "Huweka alama kwenye dai lisilo na chanzo", "Huandaa rasimu tu; mtu ndiye huwasilisha"] } },
    { id: "teacher", tier: "low", tasks: ["lessons", "assessment", "inclusive", "coaching"],
      name: { en: "Teacher Planning Assistant", sw: "Msaidizi wa Mwalimu" },
      who: { en: "Teachers and school heads", sw: "Walimu na walimu wakuu" },
      desc: { en: "Prepares schemes of work, lesson plans, assessment tasks and differentiated activities aligned to {curriculum}. It works at class level and never sees a learner's name.", sw: "Huandaa maazimio ya kazi, maandalio ya somo, kazi za tathmini na shughuli za viwango tofauti kulingana na {curriculum}. Hufanya kazi kwa ngazi ya darasa na kamwe haioni jina la mwanafunzi." },
      guardrails: { en: ["No learner names, marks or photos go in", "Cites the curriculum outcome it is aligned to, and says so when something is not in the curriculum", "Drafts only; the teacher decides every mark and comment"],
        sw: ["Hakuna majina, alama wala picha za wanafunzi zinazoingizwa", "Hutaja matokeo ya mtaala inayolenga, na husema kama jambo halimo kwenye mtaala", "Huandaa rasimu tu; mwalimu huamua kila alama na maoni"] } },
    { id: "dq", tier: "med", tasks: ["data_cleaning", "attendance"],
      name: { en: "Field Data and Attendance Checker", sw: "Mkaguzi wa Data na Mahudhurio" },
      who: { en: "Programme and data teams", sw: "Timu za miradi na za data" },
      desc: { en: "Flags duplicates, gaps and unusual patterns in registers and beneficiary lists before they reach a report.", sw: "Huonyesha nakala zinazojirudia, mapengo na mienendo isiyo ya kawaida kwenye rejista na orodha za wanufaika kabla hazijafika kwenye ripoti." },
      guardrails: { en: ["Flags only; a person decides", "Works on pseudonymised IDs", "Logs every flag and decision"],
        sw: ["Huonyesha tu; mtu ndiye huamua", "Hufanya kazi kwa vitambulisho visivyo na majina", "Hurekodi kila alama na uamuzi"] } },
    { id: "parent", tier: "med", tasks: ["messages", "parent_reports"],
      name: { en: "Parent and Community Messages Assistant", sw: "Msaidizi wa Ujumbe kwa Wazazi na Jamii" },
      who: { en: "Teachers, community staff and comms", sw: "Walimu, wafanyakazi wa jamii na wa mawasiliano" },
      desc: { en: "Drafts and translates messages and progress-report wording for a person to check and send. It never sends anything itself.", sw: "Huandaa na kutafsiri ujumbe na maneno ya ripoti za maendeleo ili mtu ayahakiki na kuyatuma. Haitumi chochote yenyewe." },
      guardrails: { en: ["Drafts only; a person sends", "Translations checked by a fluent speaker", "No names or records go into the AI"],
        sw: ["Huandaa rasimu tu; mtu ndiye hutuma", "Tafsiri hukaguliwa na mzungumzaji fasaha", "Hakuna majina wala rekodi zinazoingizwa kwenye AI"] } },
    { id: "knowledge", tier: "low", tasks: ["knowledge"],
      name: { en: "Policy and Knowledge Assistant", sw: "Msaidizi wa Sera na Maarifa" },
      who: { en: "All staff", sw: "Wafanyakazi wote" },
      desc: { en: "Finds answers in your own policies, reports and procedures, and shows the page it came from.", sw: "Hutafuta majibu kwenye sera, ripoti na taratibu zenu, na huonyesha ukurasa yalikotoka." },
      guardrails: { en: ["Reads only documents you approve", "Always shows its source", "No access to beneficiary or learner data"],
        sw: ["Husoma nyaraka mlizoidhinisha pekee", "Daima huonyesha chanzo", "Haina ufikiaji wa data za wanufaika wala wanafunzi"] } },
    { id: "safeguard", tier: "high", tasks: ["safeguarding"],
      name: { en: "Safeguarding Intake Assistant", sw: "Msaidizi wa Kupokea Ripoti za Ulinzi" },
      who: { en: "Safeguarding leads", sw: "Wasimamizi wa ulinzi wa mtoto" },
      desc: { en: "Records and routes safeguarding reports to the right person quickly. It never decides an outcome.", sw: "Hurekodi na kupeleka ripoti za ulinzi kwa mtu sahihi haraka. Kamwe haiamui matokeo." },
      guardrails: { en: ["Routes and timestamps only; never decides", "Two-person access to every case", "Built only after a safeguarding review and a privacy risk check"],
        sw: ["Hupeleka na kuweka muda tu; haiamui", "Watu wawili ndio wenye ufikiaji wa kila kesi", "Hujengwa tu baada ya mapitio ya ulinzi na tathmini ya hatari za faragha"] } }
  ];
  var FOUNDATIONS = {
    id: "foundations",
    name: { en: "Foundations Sprint", sw: "Mpango wa Misingi" },
    desc: { en: "Two to three weeks to put written AI rules, 2-step login, consent wording and a breach plan in place before any agent touches personal data.", sw: "Wiki mbili hadi tatu za kuweka kanuni za AI zilizoandikwa, kuingia kwa hatua mbili, maneno ya idhini na mpango wa uvujaji wa data kabla wakala yeyote hajagusa data binafsi." },
    guardrails: { en: ["One-page AI use rules adopted by management", "2-step login on email and data tools", "Consent wording that names software providers", "A one-page breach plan with named roles"],
      sw: ["Kanuni za ukurasa mmoja za matumizi ya AI zilizoidhinishwa na uongozi", "Kuingia kwa hatua mbili kwenye barua pepe na zana za data", "Maneno ya idhini yanayotaja watoa huduma za programu", "Mpango wa ukurasa mmoja wa uvujaji wa data wenye majukumu ya watu"] }
  };

  // ---------- SAFE-A pillars ----------
  var PILLARS = [
    { id: "SC", weight: 0.2, name: { en: "Scope", sw: "Mipaka" },
      desc: { en: "Each agent has a written job card: what it may read, what it may change, and what always needs a person.", sw: "Kila wakala ana kadi ya kazi iliyoandikwa: anachoweza kusoma, anachoweza kubadilisha, na kile ambacho daima kinahitaji mtu." } },
    { id: "AN", weight: 0.25, name: { en: "Anonymise", sw: "Kuficha utambulisho" },
      desc: { en: "Names, phone numbers and children's records are replaced with labels before any AI sees them.", sw: "Majina, namba za simu na rekodi za watoto hubadilishwa kuwa lebo kabla AI yoyote haijaziona." } },
    { id: "FE", weight: 0.2, name: { en: "Fence", sw: "Uzio" },
      desc: { en: "Messages, emails and documents from outside can inform an agent but never give it orders.", sw: "Ujumbe, barua pepe na nyaraka kutoka nje zinaweza kumpa wakala taarifa lakini kamwe haziwezi kumpa amri." } },
    { id: "EV", weight: 0.2, name: { en: "Evidence", sw: "Ushahidi" },
      desc: { en: "Every action is logged, tested every month, and covered by a plan for when things go wrong.", sw: "Kila hatua hurekodiwa, hujaribiwa kila mwezi, na ina mpango wa kufuata mambo yakienda kombo." } },
    { id: "AD", weight: 0.15, name: { en: "Adapt", sw: "Kuendana na mazingira" },
      desc: { en: "Works offline, on WhatsApp and SMS, in local languages, on low-cost phones, and survives staff turnover.", sw: "Hufanya kazi bila mtandao, kupitia WhatsApp na SMS, kwa lugha za kienyeji, kwenye simu za bei nafuu, na huendelea hata wafanyakazi wakibadilika." } }
  ];

  var BANDS = [
    { id: "foundations", min: 0, name: { en: "Foundations first", sw: "Misingi kwanza" },
      desc: { en: "Put a few basics in place before any agent touches personal data. Most of them are free.", sw: "Wekeni misingi michache kabla wakala yeyote hajagusa data binafsi. Mingi yake ni bure." } },
    { id: "building", min: 40, name: { en: "Building", sw: "Mnajenga" },
      desc: { en: "Good foundations with some gaps. Close the fixes below and a supervised pilot is realistic.", sw: "Misingi mizuri yenye mapengo machache. Fanyeni marekebisho yaliyo hapa chini na majaribio yanayosimamiwa yanawezekana." } },
    { id: "pilot", min: 65, name: { en: "Pilot-ready", sw: "Tayari kwa majaribio" },
      desc: { en: "Ready for one supervised pilot, with a person approving every output.", sw: "Mko tayari kwa majaribio moja yanayosimamiwa, mtu akiidhinisha kila matokeo." } },
    { id: "scale", min: 80, name: { en: "Scale-ready", sw: "Tayari kupanua" },
      desc: { en: "Strong controls. Ready to run more than one agent with monthly evaluation.", sw: "Udhibiti imara. Mko tayari kuendesha zaidi ya wakala mmoja kwa tathmini ya kila mwezi." } }
  ];

  // ---------- Offers (indicative "from" prices by segment; confirmed after a call) ----------
  var OFFERS = {
    segments: {
      small: { USD: { sprint: 300, audit: 300, pilot: 1500 }, KES: { sprint: 39000, audit: 39000, pilot: 195000 } },
      mid: { USD: { sprint: 900, audit: 1200, pilot: 5000 }, KES: { sprint: 115000, audit: 155000, pilot: 645000 } },
      large: { USD: { sprint: 2500, audit: 3000, pilot: 15000 }, KES: { sprint: 320000, audit: 390000, pilot: 1900000 } }
    },
    items: {
      sprint: { name: { en: "Foundations Sprint", sw: "Mpango wa Misingi" },
        desc: { en: "Two to three weeks to put AI rules, 2-step login, consent wording and a breach plan in place.", sw: "Wiki mbili hadi tatu za kuweka kanuni za AI, kuingia kwa hatua mbili, maneno ya idhini na mpango wa uvujaji." } },
      audit: { name: { en: "AI Risk and Readiness Review", sw: "Ukaguzi wa Hatari na Utayari wa AI" },
        desc: { en: "Two weeks. We check your systems against SAFE-A and leave a written plan and policy pack. The fee counts toward a pilot signed within 60 days.", sw: "Wiki mbili. Tunakagua mifumo yenu dhidi ya SAFE-A na kuwaachia mpango ulioandikwa na seti ya sera. Ada hii huhesabiwa kwenye majaribio yatakayosainiwa ndani ya siku 60." } },
      pilot: { name: { en: "Supervised pilot", sw: "Majaribio yanayosimamiwa" },
        desc: { en: "Four to eight weeks with one agent, review included, and a person approving every output.", sw: "Wiki nne hadi nane na wakala mmoja, ukaguzi ukiwemo, na mtu akiidhinisha kila matokeo." } },
      funder: { name: { en: "Ask your funder to cover it", sw: "Mwombeni mfadhili wenu agharamie" },
        desc: { en: "A one-page request your funder can approve, written from this report. Copy it below.", sw: "Ombi la ukurasa mmoja ambalo mfadhili wenu anaweza kuidhinisha, limeandikwa kutokana na ripoti hii. Linakili hapa chini." } }
    }
  };

  // ---------- Risks and fixes (rules live in engine.js; text lives here) ----------
  // owner/cost are shown on each fix. {items}, {regulator}, {learnerSystem}, {langs} are filled by the engine.
  var O = {
    director: { en: "Director", sw: "Mkurugenzi" },
    ops: { en: "Operations or ICT lead", sw: "Msimamizi wa uendeshaji au TEHAMA" },
    prog: { en: "Programme and safeguarding leads", sw: "Wasimamizi wa programu na ulinzi" },
    meal: { en: "M&E lead", sw: "Msimamizi wa ufuatiliaji na tathmini" },
    head: { en: "Head teacher", sw: "Mwalimu mkuu" },
    lead: { en: "Programme lead", sw: "Msimamizi wa programu" }
  };
  var RISKS = {
    ai_sensitive: { owner: O.director, cost: "free",
      title: { en: "Personal data is going into AI tools", sw: "Data binafsi zinaingizwa kwenye zana za AI" },
      why: { en: "You told us someone has put {items} into an AI tool in the last 3 months.", sw: "Mlituambia kuna mtu ameweka {items} kwenye zana ya AI katika miezi 3 iliyopita." },
      fix: { en: "This week, issue a one-page rule: no names, phone numbers, learner records, photos, health or case notes in AI tools. Give staff one approved tool for drafting.", sw: "Wiki hii, toeni kanuni ya ukurasa mmoja: hakuna majina, namba za simu, rekodi za wanafunzi, picha, maelezo ya afya wala ya kesi kwenye zana za AI. Wapeni wafanyakazi zana moja iliyoidhinishwa ya kuandaa rasimu." },
      short: { en: "staff have put {items} into AI tools", sw: "wafanyakazi wameweka {items} kwenye zana za AI" } },
    shared_logins: { owner: O.ops, cost: "time",
      title: { en: "Team logins are shared", sw: "Akaunti za timu zinatumiwa kwa pamoja" },
      why: { en: "Some team logins are shared, so you can't tell who did what, and one leaked password opens everything.", sw: "Baadhi ya akaunti za timu hutumiwa kwa pamoja, kwa hiyo hamwezi kujua nani alifanya nini, na nenosiri moja likivuja linafungua kila kitu." },
      fix: { en: "Give every person their own login and turn on phone codes, starting with email and your data collection tool.", sw: "Mpeni kila mtu akaunti yake na washeni namba za simu za kuingia, mkianza na barua pepe na zana ya kukusanya data." },
      short: { en: "team logins are shared", sw: "akaunti za timu zinatumiwa kwa pamoja" } },
    outside_entry: { owner: O.head, cost: "free",
      title: { en: "Learner records are handled outside the school", sw: "Rekodi za wanafunzi zinashughulikiwa nje ya shule" },
      why: { en: "Someone outside the school enters learner data into {learnerSystem}, so they hold your logins and your learners' records.", sw: "Mtu wa nje ya shule huingiza data za wanafunzi kwenye {learnerSystem}, kwa hiyo anashikilia akaunti zenu na rekodi za wanafunzi wenu." },
      fix: { en: "Have a named staff member enter learner data, change the passwords, and stop sharing logins with anyone outside the school.", sw: "Mteueni mfanyakazi mmoja aingize data za wanafunzi, badilisheni manenosiri, na acheni kushiriki akaunti na mtu yeyote wa nje ya shule." },
      short: { en: "learner records and logins are handled outside the school", sw: "rekodi za wanafunzi na akaunti zinashughulikiwa nje ya shule" } },
    consent_gap: { owner: O.prog, cost: "time",
      title: { en: "Children's consent isn't recorded for a clear purpose", sw: "Idhini ya watoto hairekodiwi kwa madhumuni wazi" },
      why: { en: "You serve children, and you told us consent is recorded this way: {consent}.", sw: "Mnahudumia watoto, na mlituambia idhini hurekodiwa hivi: {consent}." },
      fix: { en: "Add purpose-specific consent to enrolment and registration forms, and name the software providers that will process the data.", sw: "Ongezeni idhini yenye madhumuni maalum kwenye fomu za kujiunga na usajili, na tajeni watoa huduma za programu watakaochakata data." },
      short: { en: "children's consent isn't recorded for a clear purpose", sw: "idhini ya watoto hairekodiwi kwa madhumuni wazi" } },
    auto_judgement: { owner: O.head, cost: "free",
      title: { en: "AI may be judging learners", sw: "AI inaweza kuwa inawahukumu wanafunzi" },
      why: { en: "You want help with assessment or progress reports, and learner details have gone into AI tools.", sw: "Mnataka msaada wa tathmini au ripoti za maendeleo, na taarifa za wanafunzi zimeingizwa kwenye zana za AI." },
      fix: { en: "Keep AI to drafting. A teacher decides every mark, comment and special needs note, and no learner names go in.", sw: "AI iandae rasimu tu. Mwalimu huamua kila alama, maoni na maelezo ya mahitaji maalum, na hakuna majina ya wanafunzi yanayoingizwa." },
      short: { en: "AI may be writing judgements about learners", sw: "AI inaweza kuwa inaandika maamuzi kuhusu wanafunzi" } },
    ai_unknown: { owner: O.ops, cost: "free",
      title: { en: "You can't see what goes into AI tools", sw: "Hamwezi kuona kinachoingizwa kwenye zana za AI" },
      why: { en: "Staff use personal accounts, so nobody can check what has been shared.", sw: "Wafanyakazi hutumia akaunti binafsi, kwa hiyo hakuna anayeweza kukagua kilichoshirikiwa." },
      fix: { en: "Run a 10-minute anonymous staff survey, then move AI use onto work accounts you control.", sw: "Fanyeni utafiti mfupi wa dakika 10 kwa wafanyakazi bila majina, kisha hamishieni matumizi ya AI kwenye akaunti za kazi mnazozidhibiti." },
      short: { en: "nobody can see what staff put into AI tools", sw: "hakuna anayeweza kuona wafanyakazi wanaweka nini kwenye zana za AI" } },
    not_registered: { owner: O.director, cost: "time",
      title: { en: "Registration with {regulator} is unclear", sw: "Usajili na {regulator} haueleweki" },
      why: { en: "You told us: {registered}.", sw: "Mlituambia: {registered}." },
      fix: { en: "Check your status with {regulator}, and confirm with a qualified adviser whether you need to register.", sw: "Hakikisheni hali yenu na {regulator}, na thibitisheni na mshauri mwenye sifa kama mnahitaji kusajiliwa." },
      short: { en: "registration with {regulator} is unclear", sw: "usajili na {regulator} haueleweki" } },
    no_dp_lead: { owner: O.director, cost: "free",
      title: { en: "Nobody is named as responsible for data protection", sw: "Hakuna aliyeteuliwa kusimamia ulinzi wa data" },
      why: { en: "Without a named person, requests, breaches and new tools have no owner.", sw: "Bila mtu aliyeteuliwa, maombi, uvujaji na zana mpya hazina msimamizi." },
      fix: { en: "Name a data protection lead and a deputy, and write their duties on one page.", sw: "Mteueni msimamizi wa ulinzi wa data na naibu wake, na andikeni majukumu yao kwenye ukurasa mmoja." },
      short: { en: "nobody is named as responsible for data protection", sw: "hakuna aliyeteuliwa kusimamia ulinzi wa data" } },
    no_breach: { owner: O.director, cost: "free",
      title: { en: "No written plan if data leaks", sw: "Hakuna mpango ulioandikwa data zikivuja" },
      why: { en: "If data leaked tomorrow, nobody would know who decides, who tells the authorities, or how fast.", sw: "Data zikivuja kesho, hakuna atakayejua nani anaamua, nani anajulisha mamlaka, au kwa haraka gani." },
      fix: { en: "Write a one-page breach plan: who decides, who tells the regulator and the people affected, and by when.", sw: "Andikeni mpango wa ukurasa mmoja wa uvujaji: nani anaamua, nani anamjulisha mdhibiti na walioathirika, na lini." },
      short: { en: "there is no written plan if data leaks", sw: "hakuna mpango ulioandikwa data zikivuja" } },
    partner_whatsapp: { owner: O.meal, cost: "time",
      title: { en: "Partner data arrives as WhatsApp photos", sw: "Data za washirika zinakuja kama picha za WhatsApp" },
      why: { en: "Photos of registers stay on personal phones long after the data is entered.", sw: "Picha za rejista hubaki kwenye simu binafsi muda mrefu baada ya data kuingizwa." },
      fix: { en: "Move partners to one shared digital form, and delete register photos once the data is entered.", sw: "Hamishieni washirika kwenye fomu moja ya kidijitali ya pamoja, na futeni picha za rejista data zikishaingizwa." },
      short: { en: "partner registers arrive as WhatsApp photos", sw: "rejista za washirika zinakuja kama picha za WhatsApp" } },
    password_only: { owner: O.ops, cost: "free",
      title: { en: "Logins use passwords only", sw: "Akaunti zinatumia nenosiri pekee" },
      why: { en: "One stolen or guessed password is enough to open your email or your data.", sw: "Nenosiri moja likiibiwa au kukisiwa linatosha kufungua barua pepe au data zenu." },
      fix: { en: "Turn on phone codes (2-step login) for email and data tools. It takes an afternoon.", sw: "Washeni namba za simu za kuingia (hatua mbili) kwa barua pepe na zana za data. Inachukua mchana mmoja." },
      short: { en: "logins use passwords only", sw: "akaunti zinatumia nenosiri pekee" } },
    continuity: { owner: O.director, cost: "time",
      title: { en: "Reporting depends on one person", sw: "Ripoti zinategemea mtu mmoja" },
      why: { en: "You told us the next report would be at risk if one person left.", sw: "Mlituambia ripoti inayofuata ingekuwa hatarini kama mtu mmoja angeondoka." },
      fix: { en: "Write down the reporting steps, and move logins to named accounts with a trained deputy.", sw: "Andikeni hatua za kuandaa ripoti, na hamishieni akaunti kwa majina ya watu pamoja na naibu aliyefunzwa." },
      short: { en: "reporting depends on one person", sw: "ripoti zinategemea mtu mmoja" } },
    no_rules: { owner: O.director, cost: "free",
      title: { en: "No written AI rules", sw: "Hakuna kanuni za AI zilizoandikwa" },
      why: { en: "Staff are deciding for themselves what is safe to put into AI tools.", sw: "Wafanyakazi wanajiamulia wenyewe kipi ni salama kuweka kwenye zana za AI." },
      fix: { en: "Adopt a one-page AI use policy at your next management or board meeting. The SAFE-A starter kit has a template.", sw: "Pitisheni sera ya ukurasa mmoja ya matumizi ya AI kwenye kikao kijacho cha uongozi au bodi. Kifurushi cha kuanzia cha SAFE-A kina kiolezo." },
      short: { en: "there are no written AI rules", sw: "hakuna kanuni za AI zilizoandikwa" } },
    cafe_devices: { owner: O.ops, cost: "budget",
      title: { en: "Work data is used on cyber cafe computers", sw: "Data za kazi zinatumika kwenye kompyuta za cyber" },
      why: { en: "Cyber cafe computers can keep copies of files and saved logins.", sw: "Kompyuta za cyber zinaweza kubaki na nakala za faili na akaunti zilizohifadhiwa." },
      fix: { en: "Give staff a work device or a programme phone for anything with personal data, and never save logins on shared computers.", sw: "Wapeni wafanyakazi kifaa cha kazi au simu ya mradi kwa chochote chenye data binafsi, na kamwe msihifadhi akaunti kwenye kompyuta za pamoja." },
      short: { en: "work data is used on cyber cafe computers", sw: "data za kazi zinatumika kwenye kompyuta za cyber" } },
    whatsapp_groups: { owner: O.director, cost: "free",
      title: { en: "Personal data sits in WhatsApp groups", sw: "Data binafsi ziko kwenye makundi ya WhatsApp" },
      why: { en: "Anyone in a group can forward what is posted there.", sw: "Mtu yeyote kwenye kundi anaweza kusambaza kilichowekwa humo." },
      fix: { en: "Agree what never goes into WhatsApp groups, such as names with health, case or marks information, and use your main system instead.", sw: "Kubalianeni kisichopaswa kuwekwa kwenye makundi ya WhatsApp, kama majina pamoja na taarifa za afya, kesi au alama, na tumieni mfumo wenu mkuu badala yake." },
      short: { en: "personal data sits in WhatsApp groups", sw: "data binafsi ziko kwenye makundi ya WhatsApp" } },
    assessment_rules: { owner: O.head, cost: "free",
      title: { en: "Assessment tasks need rules before AI helps", sw: "Kazi za tathmini zinahitaji kanuni kabla AI haijasaidia" },
      why: { en: "You want AI help with assessment tasks, and you have no written AI rules yet.", sw: "Mnataka msaada wa AI kwenye kazi za tathmini, na bado hamna kanuni za AI zilizoandikwa." },
      fix: { en: "Agree rules for AI-made assessment tasks: a teacher reviews every task, no learner data goes in, and AI is never used near national exams.", sw: "Kubalianeni kanuni za kazi za tathmini zinazoandaliwa na AI: mwalimu hukagua kila kazi, hakuna data za wanafunzi zinazoingizwa, na AI haitumiki kamwe karibu na mitihani ya kitaifa." },
      short: { en: "AI-made assessment tasks have no rules yet", sw: "kazi za tathmini zinazoandaliwa na AI bado hazina kanuni" } },
    shared_collect: { owner: O.meal, cost: "free",
      title: { en: "Data collection phones are shared", sw: "Simu za kukusanyia data zinatumiwa kwa pamoja" },
      why: { en: "Whoever picks up the phone next can see the last person's records.", sw: "Atakayechukua simu inayofuata anaweza kuona rekodi za mtumiaji aliyetangulia." },
      fix: { en: "Give each phone a screen lock and a named user, and clear its data after each upload.", sw: "Wekeni kufuli ya skrini na mtumiaji anayejulikana kwa kila simu, na futeni data zake baada ya kila upakiaji." },
      short: { en: "data collection phones are shared", sw: "simu za kukusanyia data zinatumiwa kwa pamoja" } },
    languages: { owner: O.lead, cost: "time",
      title: { en: "Test in your community's languages", sw: "Jaribuni kwa lugha za jamii yenu" },
      why: { en: "You work in {langs}, and AI quality varies a lot between languages.", sw: "Mnafanya kazi kwa {langs}, na ubora wa AI hutofautiana sana kati ya lugha." },
      fix: { en: "Before rollout, have fluent speakers check 20 AI outputs in each language.", sw: "Kabla ya kuanza, wazungumzaji fasaha wakague matokeo 20 ya AI kwa kila lugha." },
      short: { en: "AI hasn't been tested in your community's languages", sw: "AI haijajaribiwa kwa lugha za jamii yenu" } },
    offline: { owner: O.lead, cost: "free",
      title: { en: "Plan for working offline", sw: "Pangeni kufanya kazi bila mtandao" },
      why: { en: "Your teams are mostly offline in the field.", sw: "Timu zenu mara nyingi hazina mtandao uwandani." },
      fix: { en: "Choose tools that save work on the device and sync later, and keep AI steps at the office end.", sw: "Chagueni zana zinazohifadhi kazi kwenye kifaa na kusawazisha baadaye, na shughuli za AI zifanyike ofisini." },
      short: { en: "field teams are mostly offline", sw: "timu za uwandani mara nyingi hazina mtandao" } },
    eval_none: { owner: O.meal, cost: "free",
      title: { en: "AI output isn't checked yet", sw: "Matokeo ya AI hayakaguliwi bado" },
      why: { en: "Even good AI tools make confident mistakes.", sw: "Hata zana nzuri za AI hukosea kwa kujiamini." },
      fix: { en: "Pick 20 real, de-identified examples and check AI answers against them every month.", sw: "Chagueni mifano 20 halisi isiyo na utambulisho na mkague majibu ya AI dhidi yake kila mwezi." },
      short: { en: "AI output isn't checked yet", sw: "matokeo ya AI hayakaguliwi bado" } }
  };

  // Short nouns for AI data items, used inside risk sentences.
  var AI_DATA_SHORT = {
    names: { en: "names or phone numbers of people you serve", sw: "majina au namba za simu za mnaowahudumia" },
    learner: { en: "learner marks or reports", sw: "alama au ripoti za wanafunzi" },
    photos: { en: "photos of children", sw: "picha za watoto" },
    health: { en: "health or special needs notes", sw: "maelezo ya afya au mahitaji maalum" },
    cases: { en: "case or survivor information", sw: "taarifa za kesi au za manusura" },
    finance: { en: "donor or financial records", sw: "rekodi za wafadhili au za fedha" }
  };

  var STRENGTHS = {
    mfa: { en: "Staff log in with their own account and a phone code.", sw: "Wafanyakazi huingia kwa akaunti zao na namba ya simu." },
    rules_trained: { en: "You have written AI rules, and staff are trained on them.", sw: "Mna kanuni za AI zilizoandikwa, na wafanyakazi wamefunzwa." },
    rules_written: { en: "You have written AI rules.", sw: "Mna kanuni za AI zilizoandikwa." },
    breach_practised: { en: "You have a breach plan and have practised it.", sw: "Mna mpango wa uvujaji wa data na mmeufanyia mazoezi." },
    breach_written: { en: "You have a written breach plan.", sw: "Mna mpango ulioandikwa wa uvujaji wa data." },
    consent_signed: { en: "Children's consent is recorded on a signed form with a clear purpose.", sw: "Idhini ya watoto hurekodiwa kwenye fomu iliyosainiwa yenye madhumuni wazi." },
    registered: { en: "You are registered with {regulator}.", sw: "Mmesajiliwa na {regulator}." },
    dp_lead: { en: "You have a named data protection lead.", sw: "Mna msimamizi aliyeteuliwa wa ulinzi wa data." },
    forms: { en: "Partners and field teams send data through a shared digital form.", sw: "Washirika na timu za uwandani hutuma data kupitia fomu ya kidijitali ya pamoja." },
    continuity: { en: "Someone else could produce your next report.", sw: "Mtu mwingine angeweza kuandaa ripoti yenu inayofuata." },
    ai_none: { en: "Nobody is putting your data into AI tools yet, so you can set the rules first.", sw: "Hakuna anayeweka data zenu kwenye zana za AI bado, kwa hiyo mnaweza kuweka kanuni kwanza." },
    ai_approved: { en: "AI tools run on work accounts you control.", sw: "Zana za AI zinatumika kwenye akaunti za kazi mnazozidhibiti." },
    no_sensitive: { en: "No sensitive data has gone into AI tools.", sw: "Hakuna data za siri zilizoingizwa kwenye zana za AI." },
    school_entry: { en: "A named staff member handles learner records.", sw: "Mfanyakazi aliyeteuliwa ndiye hushughulikia rekodi za wanafunzi." },
    connectivity: { en: "Your teams have reliable internet in the office and the field.", sw: "Timu zenu zina mtandao unaoaminika ofisini na uwandani." }
  };

  var PLAN = {
    w1: { en: "Fix your top risk: {risk}.", sw: "Rekebisheni hatari yenu kuu: {risk}." },
    w2: { en: "Map one task end to end ({task}). List the data it touches and remove anything an AI would not need.", sw: "Chambueni kazi moja kuanzia mwanzo hadi mwisho ({task}). Orodhesheni data inazogusa na ondoeni chochote ambacho AI haitahitaji." },
    w3_found: { en: "Adopt one-page AI rules and a breach plan, and turn on phone codes for email.", sw: "Pitisheni kanuni za AI za ukurasa mmoja na mpango wa uvujaji, na washeni namba za simu za kuingia kwenye barua pepe." },
    w3_agent: { en: "Try the {agent} on 20 de-identified examples in a sandbox, with a person approving every output.", sw: "Jaribuni {agent} kwa mifano 20 isiyo na utambulisho katika mazingira ya majaribio, mtu akiidhinisha kila matokeo." },
    w4: { en: "Review what you found: accuracy, time saved and any near-misses. Decide to scale, fix or stop.", sw: "Pitieni mlichogundua: usahihi, muda uliookolewa na makosa yaliyokaribia kutokea. Amueni kupanua, kurekebisha au kusimama." },
    school: { en: "Schools: tell your education office in writing before any pilot, and keep AI away from national exam periods.", sw: "Shule: julisheni ofisi yenu ya elimu kwa maandishi kabla ya majaribio yoyote, na msitumie AI karibu na vipindi vya mitihani ya kitaifa." },
    school_ke: { en: "Schools: tell your Sub-county Director of Education in writing before any pilot, get a NACOSTI permit if you will collect research data, and keep AI away from KPSEA, KJSEA and KCSE periods.", sw: "Shule: mjulisheni Mkurugenzi wa Elimu wa Kaunti Ndogo kwa maandishi kabla ya majaribio yoyote, pateni kibali cha NACOSTI kama mtakusanya data za utafiti, na msitumie AI karibu na vipindi vya KPSEA, KJSEA na KCSE." }
  };

  var BOARD = {
    decisions: {
      policy: { en: "Adopt a one-page AI and data use policy.", sw: "Pitisheni sera ya ukurasa mmoja ya matumizi ya AI na data." },
      lead: { en: "Name a data protection lead and a deputy.", sw: "Mteueni msimamizi wa ulinzi wa data na naibu wake." },
      pilot: { en: "Approve a supervised pilot of the {agent}, with a person approving every output.", sw: "Idhinisheni majaribio yanayosimamiwa ya {agent}, mtu akiidhinisha kila matokeo." },
      sprint: { en: "Approve a Foundations Sprint before any AI pilot.", sw: "Idhinisheni Mpango wa Misingi kabla ya majaribio yoyote ya AI." }
    },
    questions: [
      { en: "Which of our systems hold personal data, and who can log in to each?", sw: "Ni mifumo yetu ipi inayohifadhi data binafsi, na nani anaweza kuingia kwenye kila mmoja?" },
      { en: "What goes into AI tools today, and who checks it?", sw: "Ni nini kinachoingizwa kwenye zana za AI leo, na nani anakikagua?" },
      { en: "If data leaked tomorrow, who would tell {regulatorOr} and the people affected, and how fast?", sw: "Data zikivuja kesho, nani angemjulisha {regulatorOr} na walioathirika, na kwa haraka gani?" }
    ],
    request: {
      en: "Request: digital safeguarding and responsible AI\n\nWe would like to use AI to reduce the time our team spends on {task}, without putting the people we serve at risk. A readiness check against the SAFE-A standard rated us \"{band}\" ({score} out of 100). Our priorities are:\n1. {fix1}\n2. {fix2}\n3. {fix3}\n\nWe request support for an AI risk and readiness review and staff training, followed by a small supervised pilot in which a person approves every output.\n\nEstimated cost: {price}\nSuggested budget line: {line}\nExpected result: written AI and data rules adopted by our board, a named data protection lead, and a measured pilot report.",
      sw: "Ombi: ulinzi wa kidijitali na matumizi ya AI kwa uwajibikaji\n\nTungependa kutumia AI kupunguza muda ambao timu yetu hutumia kwenye {task}, bila kuwaweka hatarini tunaowahudumia. Tathmini ya utayari kwa kiwango cha SAFE-A imetupa kiwango cha \"{band}\" (alama {score} kati ya 100). Vipaumbele vyetu ni:\n1. {fix1}\n2. {fix2}\n3. {fix3}\n\nTunaomba msaada wa ukaguzi wa hatari na utayari wa AI na mafunzo kwa wafanyakazi, kisha majaribio madogo yanayosimamiwa ambapo mtu huidhinisha kila matokeo.\n\nGharama inayokadiriwa: {price}\nKifungu cha bajeti kinachopendekezwa: {line}\nMatokeo yanayotarajiwa: kanuni za AI na data zilizopitishwa na bodi yetu, msimamizi aliyeteuliwa wa ulinzi wa data, na ripoti ya majaribio yaliyopimwa."
    },
    lines: {
      line: { en: "an existing capacity building or M&E line", sw: "kifungu kilichopo cha kujenga uwezo au ufuatiliaji na tathmini" },
      move: { en: "a reallocation to capacity building or M&E", sw: "uhamisho kwenda kifungu cha kujenga uwezo au ufuatiliaji na tathmini" },
      proposal: { en: "capacity building in our next proposal", sw: "kujenga uwezo kwenye andiko letu lijalo" },
      funder: { en: "direct funder support for digital safeguarding", sw: "msaada wa moja kwa moja wa mfadhili kwa ulinzi wa kidijitali" },
      other: { en: "capacity building", sw: "kujenga uwezo" }
    }
  };

  // ---------- Privacy notice (council/03-legal.md). [Brackets] are placeholders the founder must fill. ----------
  var PRIVACY = {
    version: "1.0-draft",
    en: [
      ["Who we are", "{legalEntity} runs Salama Agents and controls the data described here. Contact: {privacyEmail}. ODPC registration: {odpcNumber}. EU and UK representatives: {euRep}."],
      ["What we collect and why", "Your answers about your organisation, to write your report and, combined with others, to understand what organisations need. Our basis is our legitimate interest in providing and improving this service. You can object at any time, or choose \"Keep my answers on this device only\" before you start, in which case we receive nothing."],
      ["Your note about your most time-consuming task", "Names, phone numbers and similar details are removed on your device before anything is saved. Please never include details of the people you serve. This note is not sent to any AI model, and we delete it after 90 days."],
      ["Only if you tick a box", "Your contact details (name, role, organisation, email, WhatsApp), so we can discuss a walk-through or pilot. Your answers in our annual report as combined results only. Our basis is your consent, which you can withdraw at any time."],
      ["Usage", "Which steps were completed, using a random code that lasts only while your page is open, and a scrambled internet address used to prevent abuse. No tracking or advertising cookies."],
      ["AI", "If you choose \"Write my brief\", we send your organisation profile, without your name, contact details or written note, to Anthropic (Claude) to write it. You see exactly what is sent first. {aiTerms}"],
      ["Where data goes", "Supabase stores our database in {region}. Anthropic (USA) writes AI briefs. Both work under data protection agreements that include standard contractual clauses. {hostName} hosts the website and keeps its own access logs. We never sell your data."],
      ["How long we keep it", "Contact details: 24 months after our last contact, 12 months if we never hear back, or until you withdraw. Answers: 36 months, then deleted or reduced to totals. AI briefs: 180 days. Usage events: 12 months. Scrambled addresses: 2 days. Drafts stay on your device until you submit or tap \"Clear my answers\", and expire after 72 hours."],
      ["Your rights", "You can ask to see, correct or delete your data, get a copy, limit or object to its use, or withdraw consent. Email {privacyEmail}. We will check it is you and reply within 7 days."],
      ["Children", "This check is for adults working in organisations. We do not knowingly collect children's data."],
      ["Complaints", "You can complain to Kenya's Office of the Data Protection Commissioner (www.odpc.go.ke) or to the data protection authority where you live."]
    ],
    sw: [
      ["Sisi ni nani", "{legalEntity} huendesha Salama Agents na husimamia data zilizoelezwa hapa. Mawasiliano: {privacyEmail}. Usajili wa ODPC: {odpcNumber}. Wawakilishi wa EU na Uingereza: {euRep}."],
      ["Tunakusanya nini na kwa nini", "Majibu yenu kuhusu shirika lenu, ili kuandika ripoti yenu na, yakiunganishwa na mengine, kuelewa mahitaji ya mashirika. Msingi wetu ni maslahi halali ya kutoa na kuboresha huduma hii. Mnaweza kupinga wakati wowote, au kuchagua \"Hifadhi majibu yangu kwenye kifaa hiki tu\" kabla ya kuanza, na hapo hatupokei chochote."],
      ["Maelezo yenu kuhusu kazi inayochukua muda mwingi", "Majina, namba za simu na taarifa kama hizo huondolewa kwenye kifaa chenu kabla ya kuhifadhiwa. Tafadhali msiweke kamwe taarifa za mnaowahudumia. Maelezo haya hayatumwi kwa modeli yoyote ya AI, na tunayafuta baada ya siku 90."],
      ["Pale tu mnapoweka alama", "Taarifa zenu za mawasiliano (jina, nafasi, shirika, barua pepe, WhatsApp), ili tuzungumze kuhusu mazungumzo au majaribio. Majibu yenu kwenye ripoti yetu ya kila mwaka kama matokeo ya pamoja tu. Msingi wetu ni idhini yenu, ambayo mnaweza kuiondoa wakati wowote."],
      ["Matumizi", "Hatua zipi zilikamilika, kwa kutumia msimbo wa nasibu unaodumu ukurasa ukiwa wazi tu, na anwani ya mtandao iliyofichwa inayotumika kuzuia matumizi mabaya. Hakuna vidakuzi vya ufuatiliaji wala matangazo."],
      ["AI", "Mkichagua \"Niandikie muhtasari\", tunatuma wasifu wa shirika lenu, bila jina, taarifa za mawasiliano wala maelezo yenu yaliyoandikwa, kwa Anthropic (Claude) ili kuuandika. Mnaona kwanza hasa kitakachotumwa. {aiTerms}"],
      ["Data zinakwenda wapi", "Supabase huhifadhi hifadhidata yetu katika {region}. Anthropic (Marekani) huandika muhtasari wa AI. Wote hufanya kazi chini ya mikataba ya ulinzi wa data yenye vifungu vya kawaida vya mikataba. {hostName} huhifadhi tovuti na kumbukumbu zake za ufikiaji. Hatuuzi data zenu kamwe."],
      ["Tunahifadhi kwa muda gani", "Taarifa za mawasiliano: miezi 24 baada ya mawasiliano ya mwisho, miezi 12 kama hatukusikia kutoka kwenu, au hadi mtakapoondoa idhini. Majibu: miezi 36, kisha hufutwa au kubaki kama jumla. Muhtasari wa AI: siku 180. Matukio ya matumizi: miezi 12. Anwani zilizofichwa: siku 2. Rasimu hubaki kwenye kifaa chenu hadi mtakapowasilisha au kubonyeza \"Futa majibu yangu\", na huisha baada ya saa 72."],
      ["Haki zenu", "Mnaweza kuomba kuona, kusahihisha au kufuta data zenu, kupata nakala, kuzuia au kupinga matumizi yake, au kuondoa idhini. Tumieni barua pepe {privacyEmail}. Tutathibitisha kuwa ni ninyi na kujibu ndani ya siku 7."],
      ["Watoto", "Tathmini hii ni kwa watu wazima wanaofanya kazi kwenye mashirika. Hatukusanyi kwa makusudi data za watoto."],
      ["Malalamiko", "Mnaweza kulalamika kwa Ofisi ya Kamishna wa Ulinzi wa Data ya Kenya (www.odpc.go.ke) au kwa mamlaka ya ulinzi wa data mnakoishi."]
    ]
  };

  // ---------- UI strings ----------
  var UI = {
    en: {
      brand: "Salama Agents",
      nav_check: "Readiness check", nav_standard: "SAFE-A standard", nav_case: "Case study", nav_privacy: "Privacy", nav_pipeline: "Pipeline",
      lang_other: "Kiswahili", lang_other_code: "sw", lang_beta: "beta",
      hero_eyebrow: "For NGOs, schools and education programmes",
      heroA_title: "Use AI on your reports and lesson plans. Keep the people you serve out of it.",
      heroB_title: "AI agents built to protect children's data.",
      hero_sub: "We help NGOs and schools use AI for reporting, proposals and teaching without leaking personal data, breaking consent or losing control.",
      cta_check: "Take the readiness check", cta_meta: "About 6 minutes · free · no sign-up", cta_standard: "Read the SAFE-A standard",
      partner_banner: "Shared with you by {partner}",
      demo_title: "See what an AI would see",
      demo_lead: "Before any AI reads your notes, we swap names, phone numbers and schools for labels like [PERSON_1], so it can help without knowing who the child is. It all happens on your device.",
      demo_in: "Example field note (made up)", demo_btn: "Hide personal details", demo_out: "What the AI receives",
      demo_count: "{n} personal details hidden", demo_limit: "Tested in English and Kiswahili. It can miss some names, so a person always checks. Please don't paste real notes here.",
      demo_reset: "Reset the example",
      demo_sample: "Visited Mary Atieno (aged 9) at Kibera Primary School on Tuesday. Her guardian, Grace Achieng, 0712 345 678, says Mary missed 6 days after her father lost work. Teacher Wanjiku will follow up by WhatsApp.",
      pillars_title: "The SAFE-A standard", pillars_sub: "Five tests every AI agent must pass before it touches real work.",
      agents_title: "Agents we deploy first", agents_sub: "Staff-facing first. Nothing talks to children until it has passed the evidence gates in the standard.",
      tier_low: "Lower risk", tier_med: "Medium risk", tier_high: "Higher risk",
      how_title: "From check to pilot",
      how_1_t: "Readiness check", how_1_d: "About six minutes. You get a SAFE-A score, your top three fixes and the first agent that fits.",
      how_2_t: "Tailored brief", how_2_d: "A brief written by AI from your de-identified answers only, plus a board summary you can forward.",
      how_3_t: "Supervised pilot", how_3_d: "One agent for four to eight weeks. A person approves every output, and you get a monthly evaluation report.",
      proof_title: "We practise what we sell",
      proof_body: "This check never sends your name, email or organisation name to an AI model. Before your brief is written, you see exactly what will be sent.",
      cta_band_title: "Find out where you stand", cta_band_body: "Free, about six minutes, and the report is yours to keep.",
      footer_line: "Salama Agents · Secure AI agents for education and NGOs",
      footer_beta: "Public beta. The Kiswahili version is being reviewed by native speakers.",
      footer_team: "Team sign-in",
      open_title: "Open by design",
      open_body: "SAFE-A is an open standard: free to use, adapt, translate and share under CC BY 4.0. The readiness check and the starter kit are open source under Apache-2.0, so any organisation, network or funder can run them, check how they work, or improve them.",
      open_points: "Read every rule that sets your score|Run the check on your own servers|Translate it into your language|Propose changes in the open",
      open_source: "View the source", open_licence: "Open standard (CC BY 4.0) · Open source (Apache-2.0)",
      case_open_title: "Publish your own case study",
      case_open_body: "Case studies are open too. Use this outline, remove anything that could identify a person, get written permission from every organisation you name, and share it under CC BY 4.0.",
      // check
      check_intro_title: "AI readiness check",
      check_intro_body: "Six short steps, about six minutes. No sign-up. Your report appears straight away.",
      shared_label: "This is a shared phone or computer, so don't save my answers on it",
      start: "Start", resume_title: "Continue where you left off?", resume: "Continue", start_fresh: "Start fresh",
      step_of: "Step {a} of {b}", back: "Back", next: "Next", finish: "See my report", optional: "Optional",
      pick_up_to: "Pick up to {n}", chosen: "{a} of {b} chosen", pick_all: "Pick all that apply",
      err_summary: "Answer {n} more question(s) to continue.", err_required: "Choose an answer to continue.",
      max_reached: "You can pick up to {n}. Unpick one to choose another.",
      saved_device: "Saved on this device", not_saved: "Not saved on this device",
      clear_device: "Clear my answers from this device", cleared: "Your answers were cleared from this device.",
      pain_help: "Don't include names, phone numbers, ages, schools or health details of anyone you serve. We hide what we can find on your device, and you can see what will be stored below. This note is never sent to an AI model.",
      honest_help: "Pick all that apply. Honest answers give a better plan.",
      budget_help: "This helps us suggest something you can afford. We never share it.",
      data_note: "Your answers are stored without your organisation's name. Contact details are optional and kept separately.",
      redact_preview: "What we will store", redact_none: "No personal details found.",
      select_country: "Choose a country",
      funder_title: "A different route for funders",
      funder_body: "This check is built for organisations that run programmes. For funders, we run portfolio readiness reviews: your grantees take the check through your own link, and you see de-identified totals only, never their answers.",
      // report
      rep_eyebrow: "SAFE-A readiness report", rep_for: "{type} · {country} · {date}",
      score_line: "Score {s} out of 100. Band: {band}.",
      cap_note: "Capped at 39 because {reason}. Fix this first and the cap lifts.",
      stakes_line: "Higher stakes: you serve {groups}.",
      pillars_heading: "Your five SAFE-A tests",
      strengths_title: "What you already do well",
      strengths_none: "You're starting from the beginning, which makes the first fixes quick wins.",
      fixes_title: "Your top three fixes", fix_owner: "Owner", fix_cost: "Cost", fix_points: "+{n} points",
      cost_free: "Free", cost_time: "Staff time", cost_budget: "Needs budget",
      unsure_title: "Worth checking", unsure_body: "You answered \"Not sure\" to {n} question(s). Finding out is a useful first task, and it often raises the score.",
      diag_none: "No critical gaps showed up in your answers. Your next step is a supervised pilot.",
      agent_title: "Your first agent", foundations_title: "Start with a Foundations Sprint", guardrails: "Guardrails",
      agent_blocked: "{agent} comes later. It needs a score of 65 or more and signed, purpose-specific consent.",
      time_title: "Time on the table",
      time_report: "Your team spent {days} staff days on donor reports last period, across {templates} donor templates.",
      time_report_nt: "Your team spent {days} staff days on donor reports last period.",
      time_teacher: "Each teacher spends {hours} hours a week on lesson plans, schemes and records.",
      time_note: "We measure the real saving during a pilot. We don't guess it here.",
      board_title: "Board and funder summary", board_decisions: "Three decisions for your board",
      board_questions: "Three questions your board should ask", budget_line_title: "Request to send your funder",
      plan_title: "Your next 30 days", week: "Week {n}",
      ai_title: "Tailored AI brief",
      ai_desc: "Claude writes a brief for your situation from your de-identified answers. It can take up to a minute.",
      ai_preview: "See exactly what will be sent", ai_go: "Write my brief", ai_wait: "Writing your brief. This can take up to a minute.",
      ai_stop: "Stop", ai_unavail: "The AI brief isn't available here. Your report above is complete without it.",
      ai_err: "The brief couldn't be written just now. Try again in a minute.",
      ai_declined: "AI is turned off for this page, so the brief isn't available. Your report above is complete without it.",
      ai_rate: "Too many briefs have been requested today. Your report above is complete without it.",
      ai_offline: "The AI brief needs an internet connection.",
      ai_summary: "In short", ai_risks: "What to act on", ai_agent: "Suggested agent", ai_first_test: "First safe test",
      ai_plan: "Four-week plan", ai_compliance: "Legal points to confirm", ai_questions: "Questions for a discovery call",
      ai_disclaimer: "Written by AI from your de-identified answers. Check legal points with a qualified adviser.",
      offers_title: "Next steps",
      offer_walk: "Book a free 30-minute walk-through of your report",
      offer_walk_body: "We go through your fixes together and tell you honestly whether you need us.",
      from: "From {price}", price_note: "Indicative prices. We confirm a fixed quote after a call.",
      contact_title: "Talk to us", contact_body: "Leave a way to reach you and we'll set up the walk-through. Your contact details are stored separately from your answers and are never sent to an AI model.",
      f_name: "Your name", f_role: "Your role", f_org: "Organisation", f_email: "Email", f_phone: "WhatsApp number with country code",
      f_phone_hint: "For example +254712345678",
      consent_contact: "Yes, {legalEntity} (Salama Agents) may contact me by email, phone or WhatsApp about this check and a possible pilot. These are my own contact details. I can stop at any time by replying STOP or emailing {privacyEmail}.",
      consent_helper: "Optional. Your report is the same either way.",
      notice_short: "We use your answers to write your report and, combined with others, to understand what organisations need. We don't ask for your name in the check.",
      notice_link: "Read the privacy notice",
      keep_local_label: "Keep my answers on this device only (we receive nothing, and the AI brief is turned off)",
      privacy_title: "Privacy notice", privacy_version: "Version {v}. Placeholders in brackets are filled in before public launch.",
      legal_title: "Legal points to check", legal_note: "General information, not legal advice, and not a compliance assessment. Confirm with a qualified adviser.",
      generic_law: "your country's data protection law", generic_regulator: "your data protection authority",
      adviser_phrase: "Confirm with a qualified adviser.",
      local_only_note: "Kept on this device only. Nothing was sent to us.",
      contact_send: "Send", contact_ok: "Thank you. We'll be in touch within two working days.",
      contact_need: "Add an email or a WhatsApp number so we can reach you.",
      contact_consent_need: "Tick the first box so we're allowed to contact you.",
      contact_phone_bad: "Write the WhatsApp number with its country code, for example +254712345678.",
      contact_email_bad: "Check the email address.",
      contact_err: "We couldn't send that just now. Try again in a minute.",
      contact_offline: "This page can't send your details from here. Copy this and send it to us:",
      share_title: "Share", share_plan: "Share the plan on WhatsApp", share_full: "Share plan and band on WhatsApp",
      share_text_plan: "We just checked how ready we are to use AI without putting the people we serve at risk. Free, about 6 minutes, no sign-up: {link}",
      share_text_full: "We just checked how ready we are to use AI without putting the people we serve at risk. Our band: {band}. Free, about 6 minutes, no sign-up: {link}",
      download: "Download report", copy_summary: "Copy summary", copied: "Copied", copy: "Copy", copy_fail: "Select the text and copy it.",
      fb_title: "How useful was this report?", fb_ph: "What was missing or wrong? (optional)", fb_send: "Send feedback",
      fb_thanks: "Thank you. This shapes the next version.", star: "{n} out of 5",
      shared_after: "Using a shared phone or computer?", clear_now: "Clear my answers now",
      rep_footer: "Based on self-reported answers on {date}. Not an audit or legal opinion.",
      retake: "Retake the check",
      not_sure: "Not sure"
    },
    sw: {
      brand: "Salama Agents",
      nav_check: "Tathmini ya utayari", nav_standard: "Kiwango cha SAFE-A", nav_case: "Mfano halisi", nav_privacy: "Faragha", nav_pipeline: "Pipeline",
      lang_other: "English", lang_other_code: "en", lang_beta: "",
      hero_eyebrow: "Kwa mashirika yasiyo ya kiserikali, shule na programu za elimu",
      heroA_title: "Tumieni AI kwenye ripoti na maandalio ya somo. Bila kuwaweka hatarini mnaowahudumia.",
      heroB_title: "Mawakala wa AI walioundwa kulinda data za watoto.",
      hero_sub: "Tunasaidia mashirika na shule kutumia AI kwa ripoti, maandiko ya miradi na ufundishaji bila kuvujisha data binafsi, kuvunja idhini au kupoteza udhibiti.",
      cta_check: "Fanya tathmini ya utayari", cta_meta: "Takriban dakika 6 · bure · bila kujisajili", cta_standard: "Soma kiwango cha SAFE-A",
      partner_banner: "Umeshirikishwa na {partner}",
      demo_title: "Ona kile ambacho AI ingeona",
      demo_lead: "Kabla AI yoyote haijasoma maelezo yenu, tunabadilisha majina, namba za simu na shule kuwa lebo kama [PERSON_1], ili isaidie bila kujua mtoto ni nani. Yote hufanyika kwenye kifaa chako.",
      demo_in: "Mfano wa maelezo ya uwandani (ya kubuni)", demo_btn: "Ficha taarifa binafsi", demo_out: "Kile ambacho AI inapokea",
      demo_count: "Taarifa binafsi {n} zimefichwa", demo_limit: "Imejaribiwa kwa Kiingereza na Kiswahili. Inaweza kukosa baadhi ya majina, kwa hiyo mtu huhakiki kila mara. Tafadhali usiweke maelezo halisi hapa.",
      demo_reset: "Rudisha mfano",
      demo_sample: "Nilimtembelea Mary Atieno (miaka 9) katika Kibera Primary School siku ya Jumanne. Mlezi wake, Grace Achieng, 0712 345 678, anasema Mary alikosa siku 6 baada ya baba yake kupoteza kazi. Mwalimu Wanjiku atafuatilia kwa WhatsApp.",
      pillars_title: "Kiwango cha SAFE-A", pillars_sub: "Majaribio matano ambayo kila wakala wa AI lazima ayapite kabla ya kugusa kazi halisi.",
      agents_title: "Mawakala tunaoanza nao", agents_sub: "Kwanza ni kwa wafanyakazi. Hakuna kinachozungumza na watoto hadi kipite vigezo vya ushahidi vilivyo kwenye kiwango.",
      tier_low: "Hatari ndogo", tier_med: "Hatari ya wastani", tier_high: "Hatari kubwa",
      how_title: "Kutoka tathmini hadi majaribio",
      how_1_t: "Tathmini ya utayari", how_1_d: "Takriban dakika sita. Mnapata alama ya SAFE-A, marekebisho matatu muhimu na wakala wa kwanza anayewafaa.",
      how_2_t: "Muhtasari maalum", how_2_d: "Muhtasari ulioandikwa na AI kutokana na majibu yenu yasiyo na utambulisho pekee, pamoja na muhtasari wa bodi mnaoweza kutuma.",
      how_3_t: "Majaribio yanayosimamiwa", how_3_d: "Wakala mmoja kwa wiki nne hadi nane. Mtu huidhinisha kila matokeo, na mnapata ripoti ya tathmini kila mwezi.",
      proof_title: "Tunatenda tunachouza",
      proof_body: "Tathmini hii haitumi jina lako, barua pepe wala jina la shirika kwa modeli ya AI. Kabla muhtasari wako haujaandikwa, unaona hasa kitakachotumwa.",
      cta_band_title: "Jueni mlipo", cta_band_body: "Bure, takriban dakika sita, na ripoti ni yenu.",
      footer_line: "Salama Agents · Mawakala salama wa AI kwa elimu na mashirika",
      footer_beta: "Toleo la majaribio. Toleo la Kiswahili linahakikiwa na wazungumzaji asilia.",
      footer_team: "Kuingia kwa timu",
      open_title: "Wazi kwa makusudi",
      open_body: "SAFE-A ni kiwango huria: bure kutumia, kurekebisha, kutafsiri na kushiriki chini ya leseni ya CC BY 4.0. Tathmini ya utayari na kifurushi cha kuanzia ni programu huria chini ya Apache-2.0, kwa hiyo shirika, mtandao au mfadhili yeyote anaweza kuziendesha, kuangalia jinsi zinavyofanya kazi, au kuziboresha.",
      open_points: "Soma kila kanuni inayoweka alama yenu|Endesheni tathmini kwenye seva zenu|Itafsirini kwa lugha yenu|Pendekezeni mabadiliko hadharani",
      open_source: "Tazama msimbo", open_licence: "Kiwango huria (CC BY 4.0) · Programu huria (Apache-2.0)",
      case_open_title: "Chapisheni mfano wenu",
      case_open_body: "Mifano halisi pia ni huria. Tumieni muhtasari huu, ondoeni chochote kinachoweza kumtambulisha mtu, pateni ruhusa ya maandishi kutoka kwa kila shirika mnalolitaja, na mshiriki chini ya CC BY 4.0.",
      check_intro_title: "Tathmini ya utayari wa AI",
      check_intro_body: "Hatua sita fupi, takriban dakika sita. Bila kujisajili. Ripoti yenu itaonekana papo hapo.",
      shared_label: "Hii ni simu au kompyuta ya pamoja, kwa hiyo usihifadhi majibu yangu humu",
      start: "Anza", resume_title: "Uendelee ulipoishia?", resume: "Endelea", start_fresh: "Anza upya",
      step_of: "Hatua {a} kati ya {b}", back: "Rudi", next: "Endelea", finish: "Ona ripoti yangu", optional: "Si lazima",
      pick_up_to: "Chagua hadi {n}", chosen: "{a} kati ya {b} zimechaguliwa", pick_all: "Chagua zote zinazohusika",
      err_summary: "Jibu maswali {n} zaidi ili kuendelea.", err_required: "Chagua jibu ili kuendelea.",
      max_reached: "Unaweza kuchagua hadi {n}. Ondoa moja ili uchague nyingine.",
      saved_device: "Imehifadhiwa kwenye kifaa hiki", not_saved: "Haijahifadhiwa kwenye kifaa hiki",
      clear_device: "Futa majibu yangu kwenye kifaa hiki", cleared: "Majibu yako yamefutwa kwenye kifaa hiki.",
      pain_help: "Usiweke majina, namba za simu, umri, shule wala taarifa za afya za mtu yeyote mnayemhudumia. Tunaficha tunachoweza kupata kwenye kifaa chako, na unaweza kuona kitakachohifadhiwa hapa chini. Maelezo haya hayatumwi kamwe kwa modeli ya AI.",
      honest_help: "Chagua zote zinazohusika. Majibu ya kweli huleta mpango bora.",
      budget_help: "Hii hutusaidia kupendekeza kitu mnachoweza kumudu. Hatukishiriki na mtu yeyote.",
      data_note: "Majibu yenu huhifadhiwa bila jina la shirika lenu. Taarifa za mawasiliano si lazima na huhifadhiwa kando.",
      redact_preview: "Tutakachohifadhi", redact_none: "Hakuna taarifa binafsi zilizopatikana.",
      select_country: "Chagua nchi",
      funder_title: "Njia tofauti kwa wafadhili",
      funder_body: "Tathmini hii imeundwa kwa mashirika yanayoendesha programu. Kwa wafadhili, tunafanya mapitio ya utayari wa wanaofadhiliwa: wanaofadhiliwa hufanya tathmini kupitia kiungo chenu, na mnaona jumla zisizo na utambulisho pekee, kamwe si majibu yao.",
      rep_eyebrow: "Ripoti ya utayari wa SAFE-A", rep_for: "{type} · {country} · {date}",
      score_line: "Alama {s} kati ya 100. Kiwango: {band}.",
      cap_note: "Imewekewa kikomo cha 39 kwa sababu {reason}. Rekebisheni hili kwanza na kikomo kitaondoka.",
      stakes_line: "Uzito mkubwa zaidi: mnahudumia {groups}.",
      pillars_heading: "Majaribio yenu matano ya SAFE-A",
      strengths_title: "Mnachofanya vizuri tayari",
      strengths_none: "Mnaanza mwanzo kabisa, kwa hiyo marekebisho ya kwanza ni mafanikio ya haraka.",
      fixes_title: "Marekebisho yenu matatu muhimu", fix_owner: "Mhusika", fix_cost: "Gharama", fix_points: "+alama {n}",
      cost_free: "Bure", cost_time: "Muda wa wafanyakazi", cost_budget: "Inahitaji bajeti",
      unsure_title: "Inafaa kuhakikiwa", unsure_body: "Mlijibu \"Sina uhakika\" kwa maswali {n}. Kujua jibu ni kazi nzuri ya kwanza, na mara nyingi huongeza alama.",
      diag_none: "Hakuna mapengo makubwa yaliyojitokeza kwenye majibu yenu. Hatua yenu inayofuata ni majaribio yanayosimamiwa.",
      agent_title: "Wakala wenu wa kwanza", foundations_title: "Anzeni na Mpango wa Misingi", guardrails: "Kinga",
      agent_blocked: "{agent} atakuja baadaye. Anahitaji alama ya 65 au zaidi na idhini iliyosainiwa yenye madhumuni maalum.",
      time_title: "Muda unaoweza kuokolewa",
      time_report: "Timu yenu ilitumia siku {days} za wafanyakazi kwenye ripoti za wafadhili kipindi kilichopita, kwa violezo {templates} vya wafadhili.",
      time_report_nt: "Timu yenu ilitumia siku {days} za wafanyakazi kwenye ripoti za wafadhili kipindi kilichopita.",
      time_teacher: "Kila mwalimu hutumia saa {hours} kwa wiki kwenye maandalio ya somo, maazimio na rekodi.",
      time_note: "Tunapima muda halisi utakaookolewa wakati wa majaribio. Hatuukisii hapa.",
      board_title: "Muhtasari kwa bodi na mfadhili", board_decisions: "Maamuzi matatu kwa bodi yenu",
      board_questions: "Maswali matatu ambayo bodi yenu inapaswa kuuliza", budget_line_title: "Ombi la kumtumia mfadhili wenu",
      plan_title: "Siku 30 zijazo", week: "Wiki ya {n}",
      ai_title: "Muhtasari maalum wa AI",
      ai_desc: "Claude huandika muhtasari unaowafaa kutokana na majibu yenu yasiyo na utambulisho. Unaweza kuchukua hadi dakika moja.",
      ai_preview: "Ona hasa kitakachotumwa", ai_go: "Niandikie muhtasari", ai_wait: "Tunaandika muhtasari wenu. Unaweza kuchukua hadi dakika moja.",
      ai_stop: "Simamisha", ai_unavail: "Muhtasari wa AI haupatikani hapa. Ripoti yenu hapo juu imekamilika bila huo.",
      ai_err: "Muhtasari haukuweza kuandikwa sasa hivi. Jaribuni tena baada ya dakika moja.",
      ai_declined: "AI imezimwa kwenye ukurasa huu, kwa hiyo muhtasari haupatikani. Ripoti yenu hapo juu imekamilika bila huo.",
      ai_rate: "Muhtasari mwingi umeombwa leo. Ripoti yenu hapo juu imekamilika bila huo.",
      ai_offline: "Muhtasari wa AI unahitaji mtandao.",
      ai_summary: "Kwa ufupi", ai_risks: "Mnachopaswa kushughulikia", ai_agent: "Wakala anayependekezwa", ai_first_test: "Jaribio la kwanza salama",
      ai_plan: "Mpango wa wiki nne", ai_compliance: "Masuala ya kisheria ya kuthibitisha", ai_questions: "Maswali ya mazungumzo ya awali",
      ai_disclaimer: "Umeandikwa na AI kutokana na majibu yenu yasiyo na utambulisho. Thibitisheni masuala ya kisheria na mshauri mwenye sifa.",
      offers_title: "Hatua zinazofuata",
      offer_walk: "Wekeni miadi ya bure ya dakika 30 ya kupitia ripoti yenu",
      offer_walk_body: "Tunapitia marekebisho yenu pamoja na kuwaambia kwa uwazi kama mnatuhitaji.",
      from: "Kuanzia {price}", price_note: "Bei za makadirio. Tunathibitisha bei kamili baada ya mazungumzo.",
      contact_title: "Zungumzeni nasi", contact_body: "Acheni njia ya kuwafikia na tutapanga mazungumzo. Taarifa zenu za mawasiliano huhifadhiwa kando na majibu yenu na kamwe hazitumwi kwa modeli ya AI.",
      f_name: "Jina lako", f_role: "Nafasi yako", f_org: "Shirika", f_email: "Barua pepe", f_phone: "Namba ya WhatsApp pamoja na msimbo wa nchi",
      f_phone_hint: "Kwa mfano +254712345678",
      consent_contact: "Ndiyo, {legalEntity} (Salama Agents) wanaweza kuwasiliana nami kwa barua pepe, simu au WhatsApp kuhusu tathmini hii na majaribio yanayowezekana. Hizi ni taarifa zangu binafsi za mawasiliano. Ninaweza kusitisha wakati wowote kwa kujibu STOP au kutuma barua pepe kwa {privacyEmail}.",
      consent_helper: "Si lazima. Ripoti yenu ni ileile kwa vyovyote vile.",
      notice_short: "Tunatumia majibu yenu kuandika ripoti yenu na, yakiunganishwa na mengine, kuelewa mahitaji ya mashirika. Hatuombi jina lako kwenye tathmini.",
      notice_link: "Soma taarifa ya faragha",
      keep_local_label: "Hifadhi majibu yangu kwenye kifaa hiki tu (hatupokei chochote, na muhtasari wa AI unazimwa)",
      privacy_title: "Taarifa ya faragha", privacy_version: "Toleo {v}. Nafasi zilizo kwenye mabano hujazwa kabla ya kuzinduliwa rasmi.",
      legal_title: "Masuala ya kisheria ya kuhakiki", legal_note: "Taarifa za jumla, si ushauri wa kisheria, wala si tathmini ya utiifu. Thibitisheni na mshauri mwenye sifa.",
      generic_law: "sheria ya ulinzi wa data ya nchi yenu", generic_regulator: "mamlaka yenu ya ulinzi wa data",
      adviser_phrase: "Thibitisha na mshauri wa kisheria aliyehitimu.",
      local_only_note: "Imehifadhiwa kwenye kifaa hiki tu. Hakuna kilichotumwa kwetu.",
      contact_send: "Tuma", contact_ok: "Asanteni. Tutawasiliana nanyi ndani ya siku mbili za kazi.",
      contact_need: "Ongezeni barua pepe au namba ya WhatsApp ili tuweze kuwafikia.",
      contact_consent_need: "Wekeni alama kwenye kisanduku cha kwanza ili turuhusiwe kuwasiliana nanyi.",
      contact_phone_bad: "Andikeni namba ya WhatsApp pamoja na msimbo wa nchi, kwa mfano +254712345678.",
      contact_email_bad: "Hakikisheni anwani ya barua pepe.",
      contact_err: "Hatukuweza kutuma sasa hivi. Jaribuni tena baada ya dakika moja.",
      contact_offline: "Ukurasa huu hauwezi kutuma taarifa zenu kutoka hapa. Nakilini hii na mtutumie:",
      share_title: "Shiriki", share_plan: "Shiriki mpango kwenye WhatsApp", share_full: "Shiriki mpango na kiwango kwenye WhatsApp",
      share_text_plan: "Tumepima jinsi tulivyo tayari kutumia AI bila kuwaweka hatarini tunaowahudumia. Ni bure, takriban dakika 6, bila kujisajili: {link}",
      share_text_full: "Tumepima jinsi tulivyo tayari kutumia AI bila kuwaweka hatarini tunaowahudumia. Kiwango chetu: {band}. Ni bure, takriban dakika 6, bila kujisajili: {link}",
      download: "Pakua ripoti", copy_summary: "Nakili muhtasari", copied: "Imenakiliwa", copy: "Nakili", copy_fail: "Chagua maandishi kisha unakili.",
      fb_title: "Ripoti hii ina manufaa kiasi gani?", fb_ph: "Nini kilikosekana au kilikosewa? (si lazima)", fb_send: "Tuma maoni",
      fb_thanks: "Asanteni. Hii inaunda toleo lijalo.", star: "{n} kati ya 5",
      shared_after: "Mnatumia simu au kompyuta ya pamoja?", clear_now: "Futa majibu yangu sasa",
      rep_footer: "Imetokana na majibu mliyotoa wenyewe tarehe {date}. Si ukaguzi wala ushauri wa kisheria.",
      retake: "Rudia tathmini",
      not_sure: "Sina uhakika"
    }
  };

  var api = {
    version: "2026-10-19.1",
    schemaVersion: 1,
    countries: COUNTRIES, countryNames: COUNTRY_NAMES, regulators: REGULATORS,
    steps: STEPS, budgetBands: BUDGET_BANDS, agents: AGENTS, foundations: FOUNDATIONS,
    pillars: PILLARS, bands: BANDS, offers: OFFERS, ui: UI,
    risks: RISKS, aiDataShort: AI_DATA_SHORT, strengths: STRENGTHS, plan: PLAN, board: BOARD, privacy: PRIVACY, legalNotes: LEGAL_NOTES,
    schoolTypes: SCHOOL_TYPES, govTypes: GOV_TYPES,
    helpers: { has: has, isSchool: isSchool, servesChildren: servesChildren }
  };
  g.SALAMA_CONTENT = api;
})(globalThis);
