/* Salama redactor: replaces personal identifiers with stable tokens before text
 * leaves the device. Rule-based and deliberately cautious. It WILL miss some
 * names (single unknown first names, unusual spellings), so the app treats its
 * output as "reduced risk", never "anonymous", and always shows the person what
 * will be sent. */
(function (g) {
  "use strict";

  var PLACES = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Nanyuki", "Thika", "Machakos", "Kiambu", "Kilifi",
    "Kakamega", "Garissa", "Turkana", "Lodwar", "Kitui", "Meru", "Nyeri", "Embu", "Kericho", "Bungoma", "Busia",
    "Migori", "Homa Bay", "Siaya", "Kajiado", "Narok", "Marsabit", "Wajir", "Mandera", "Isiolo", "Laikipia",
    "Kibera", "Mathare", "Kawangware", "Mukuru", "Korogocho", "Kariobangi", "Dandora", "Kangemi", "Githurai",
    "Kakuma", "Kalobeyei", "Dadaab", "Malindi", "Lamu", "Voi", "Naivasha", "Kitale", "Kisii", "Nyamira", "Vihiga",
    "Kampala", "Gulu", "Mbarara", "Jinja", "Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Zanzibar", "Kigali",
    "Lagos", "Abuja", "Kano", "Ibadan", "Accra", "Kumasi", "Addis Ababa", "Mogadishu", "Hargeisa", "Juba",
    "Lilongwe", "Blantyre", "Lusaka", "Harare", "Bulawayo", "Johannesburg", "Cape Town", "Durban", "Goma", "Kinshasa"
  ];

  // Common given names across the region. Used only to catch single-word mentions.
  var NAMES = ("Mary John Grace Faith Mercy Joy Esther Ann Anne Jane Sarah Ruth Joyce Agnes Rose Lucy Alice Beatrice " +
    "Peter James David Daniel Joseph Paul Brian Kevin Dennis Collins Samuel Moses Isaac Elijah Michael Stephen " +
    "Atieno Akinyi Achieng Adhiambo Awino Anyango Auma Otieno Odhiambo Omondi Ochieng Onyango Owino Okoth " +
    "Wanjiku Wanjiru Wambui Njeri Nyambura Wairimu Muthoni Kamau Mwangi Njoroge Kariuki Maina Wafula Wekesa " +
    "Nekesa Nafula Chebet Chepkoech Jepkosgei Kiprop Kipchoge Kibet Cheruiyot Mutua Mwende Mumbua Ndanu Kioko " +
    "Juma Amina Fatuma Halima Zawadi Baraka Imani Neema Rehema Hassan Hussein Abdi Ahmed Mohamed Mohammed Ali " +
    "Aisha Khadija Asha Said Omar Wanjala Barasa Simiyu Makokha Kerubo Moraa Nyaboke Bosire Ongeri Akello Opio " +
    "Chukwu Ngozi Chinedu Emeka Amaka Tunde Bola Kwame Kofi Ama Abena Yaw Tendai Chipo Thandiwe Sipho").split(" ");
  var NAME_SET = Object.create(null);
  NAMES.forEach(function (n) { NAME_SET[n] = true; });

  // Capitalised words that are not names: titles, days, months, pronouns, sentence openers, institutions.
  var TITLES = ("Mr Mrs Ms Miss Dr Teacher Mwalimu Mama Baba Bi Bw Bwana Madam Sir Pastor Chief Nurse Officer " +
    "Guardian Mlezi Father Mother Aunt Uncle Shangazi Mjomba").split(" ");
  var TITLE_SET = Object.create(null);
  TITLES.forEach(function (n) { TITLE_SET[n] = true; });
  var STOP = ("The A An This That These Those Our Her His Their My Your We She He They It I In On At By For From " +
    "To Of And But Or If When After Before During Last Next Every Each Some All Most Many Today Yesterday " +
    "Tomorrow Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June " +
    "July August September October November December Jumatatu Jumanne Jumatano Alhamisi Ijumaa Jumamosi " +
    "Jumapili Januari Februari Machi Aprili Mei Juni Julai Agosti Septemba Oktoba Novemba Desemba County " +
    "Ministry Government School Primary Secondary Hospital Clinic Centre Center Project Programme Program " +
    "Report Quarter Term Grade Form Class Standard Kenya Uganda Tanzania Rwanda Nigeria Ghana Ethiopia Somalia " +
    "Africa African English Kiswahili Swahili WhatsApp Excel Google KoBo ODK Hii Huyu Yeye Wao Sisi Mimi Kwa " +
    "Katika Baada Kabla Leo Jana Kesho Siku Mwezi Wiki Shule Kaunti").split(" ");
  var STOP_SET = Object.create(null);
  STOP.forEach(function (n) { STOP_SET[n] = true; });

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  var RULES = [
    ["EMAIL", /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g],
    // Kenyan mobiles (07xx, 01xx, +254, 254) then generic international numbers
    ["PHONE", /(?:\+?254[\s-]?|\b0)(?:7|1)\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g],
    ["PHONE", /\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g],
    // National ID, birth certificate, NEMIS/UPI-like numbers: 6 to 10 digit runs
    ["ID", /\b\d{6,10}\b/g],
    ["AGE", /\b(?:aged?\s+\d{1,2}|\d{1,2}\s*(?:-|\s)?(?:years?[\s-]old|year-old|yrs?\b|yo\b)|miaka\s+\d{1,2})/gi],
    ["SCHOOL", /\b(?:[A-Z][a-z]+\s){1,3}(?:Primary|Secondary|Academy|High|Junior|Comprehensive)(?:\s(?:School|Sch\.?))?\b|\b(?:[A-Z][a-z]+\s){1,3}School\b/g],
    ["PLACE", new RegExp("\\b(?:" + PLACES.map(escapeRe).join("|") + ")\\b", "g")]
  ];

  function redact(text) {
    var input = String(text || "");
    var map = Object.create(null);      // original -> token
    var counts = { PERSON: 0, PHONE: 0, EMAIL: 0, ID: 0, AGE: 0, SCHOOL: 0, PLACE: 0 };
    var found = [];
    function token(kind, original) {
      var key = kind + "|" + original.toLowerCase();
      if (map[key]) return map[key];
      counts[kind] += 1;
      var t = "[" + kind + "_" + counts[kind] + "]";
      map[key] = t;
      found.push({ kind: kind, token: t });
      return t;
    }

    var out = input;
    RULES.forEach(function (r) {
      out = out.replace(r[1], function (m) { return token(r[0], m.trim()); });
    });

    // People. Pass 1: runs of capitalised words, split on non-name words.
    var personParts = Object.create(null); // single word -> token of the full name it belongs to
    out = out.replace(/\b[A-Z][a-z'’]+(?:\s+[A-Z][a-z'’]+){0,3}\b/g, function (m, offset, whole) {
      var words = m.split(/\s+/);
      var before = whole.slice(0, offset);
      var sentenceStart = /(^|[.!?:;]\s+|\n\s*)$/.test(before);
      var prevWord = (before.match(/([A-Za-z]+)\s*$/) || [])[1] || "";
      var result = [];
      var run = [];
      var titled = !!TITLE_SET[prevWord];
      function flush() {
        if (!run.length) return;
        // A sentence opener glued to a name ("Visited Mary Atieno"): drop the opener.
        if (run.startIdx === 0 && sentenceStart && run.length >= 2 && !NAME_SET[run[0]]) {
          result.push(run.shift());
        }
        if (run.length >= 2 || (run.length === 1 && (titled || NAME_SET[run[0]]))) {
          var full = run.join(" ");
          var t = token("PERSON", full);
          run.forEach(function (w) { if (w.length > 2) personParts[w] = t; });
          result.push(t);
        } else {
          result.push(run.join(" "));
        }
        run = [];
      }
      words.forEach(function (w, i) {
        if (STOP_SET[w] || TITLE_SET[w]) {
          flush();
          result.push(w);
          titled = !!TITLE_SET[w];
        } else {
          if (!run.length) run.startIdx = i;
          run.push(w);
        }
      });
      flush();
      return result.join(" ");
    });

    // Pass 2: later single-word mentions of someone already found ("Mary missed 6 days").
    out = out.replace(/\b[A-Z][a-z'’]+\b/g, function (w) { return personParts[w] || w; });

    return { text: out, found: found, count: found.length };
  }

  var api = { redact: redact };
  g.SalamaRedact = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
