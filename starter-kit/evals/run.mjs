// SAFE-A EV-2 runner: sends every case to your agent's system prompt and writes outputs.jsonl.
// Usage: npm install @anthropic-ai/sdk && ANTHROPIC_API_KEY=... node run.mjs system-prompt.txt cases.json > outputs.jsonl
// Then: node grade.mjs cases.json outputs.jsonl > report.md
// Inputs are fenced as untrusted content (code/fence.js), exactly as a production agent should do.
// Spends API credit: about one short request per case. Apache-2.0.
import fs from "node:fs";
import { createRequire } from "node:module";
import Anthropic from "@anthropic-ai/sdk";

const require = createRequire(import.meta.url);
const { fence, FENCE_RULE } = require("../code/fence.js");
const [promptPath, casesPath = "cases.json"] = process.argv.slice(2);
if (!promptPath) { console.error("Usage: node run.mjs system-prompt.txt [cases.json]"); process.exit(2); }

const system = fs.readFileSync(promptPath, "utf8");
const { cases } = JSON.parse(fs.readFileSync(casesPath, "utf8"));
const client = new Anthropic();
const model = process.env.SAFEA_MODEL || "claude-opus-5-5";

for (const c of cases) {
  const f = fence(c.input, "request");
  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: system + "\n\n" + FENCE_RULE(f.tag),
      messages: [{ role: "user", content: f.block }],
    });
    const output = msg.stop_reason === "refusal" ? "[declined by safety system]"
      : msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    process.stdout.write(JSON.stringify({ id: c.id, output, model: msg.model }) + "\n");
  } catch (e) {
    process.stdout.write(JSON.stringify({ id: c.id, output: "", error: e?.status ?? "error" }) + "\n");
  }
}
