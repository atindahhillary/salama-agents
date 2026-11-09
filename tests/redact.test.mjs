// node tests/redact.test.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { redact } = require("../src/redact.js");

let fail = 0;
function check(name, input, mustHide, mustKeep = []) {
  const r = redact(input);
  const leaks = mustHide.filter((s) => r.text.includes(s));
  const lost = mustKeep.filter((s) => !r.text.includes(s));
  const ok = !leaks.length && !lost.length;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}\n  in:  ${input}\n  out: ${r.text}${leaks.length ? "\n  LEAKED: " + leaks.join(", ") : ""}${lost.length ? "\n  OVER-REDACTED: " + lost.join(", ") : ""}`);
}

check("English field note",
  "Visited Mary Atieno (aged 9) at Kibera Primary School on Tuesday. Her guardian, Grace Achieng, 0712 345 678, says Mary missed 6 days after her father lost work. ID 23456789. Teacher Wanjiku will follow up by WhatsApp.",
  ["Mary", "Atieno", "aged 9", "Kibera", "Grace", "Achieng", "0712 345 678", "23456789", "Wanjiku"],
  ["Visited", "Tuesday", "WhatsApp", "6 days"]);

check("Kiswahili field note",
  "Nilimtembelea Mary Atieno (miaka 9) katika Kibera Primary School siku ya Jumanne. Mlezi wake, Grace Achieng, 0712 345 678, anasema Mary alikosa siku 6. Mwalimu Wanjiku atafuatilia kwa WhatsApp.",
  ["Mary", "Atieno", "miaka 9", "Grace", "Achieng", "0712 345 678", "Wanjiku"],
  ["Nilimtembelea", "Jumanne", "WhatsApp"]);

check("Email, +254 phone, place",
  "Contact the CHP John Otieno on +254 722 111 222 or john.otieno@example.org in Kakuma.",
  ["John", "Otieno", "722 111 222", "john.otieno@example.org", "Kakuma"]);

check("Workload description keeps meaning",
  "Every quarter three M&E officers spend two weeks turning KoBo data into the donor report for the county.",
  [], ["Every quarter", "KoBo", "donor report"]);

console.log(fail ? `\n${fail} failing` : "\nAll redaction checks passed");
process.exit(fail ? 1 : 0);
