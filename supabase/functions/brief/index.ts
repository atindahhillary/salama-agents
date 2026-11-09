// Salama Agents: the `brief` edge function.
//   kind "brief":    rebuilds the rule report from the stored, de-identified answers with the SAME
//                    engine the browser uses, asks Claude to tailor it, validates the result, stores it.
//   kind "pipeline": admin only (aal2 JWT); turns suppressed aggregates into founder insights.
// Deploy: supabase functions deploy brief --no-verify-jwt   (access is controlled in code below)
// Secrets: ANTHROPIC_API_KEY (required for briefs). Optional: IP_HMAC_KEY, ALLOWED_ORIGINS, ANTHROPIC_MODEL.
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import "./_shared/content.js";
import "./_shared/redact.js";
import "./_shared/engine.js";

// deno-lint-ignore no-explicit-any
const E = (globalThis as any).SalamaEngine;
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5-5";
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://atindahhillary.github.io").split(",").map((s) => s.trim()).filter(Boolean);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Without its own secret, the IP key is derived from the service key: secret, stable, never sent anywhere.
const IP_KEY = Deno.env.get("IP_HMAC_KEY") || "ip-hmac:" + (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// Created lazily: the SDK throws at construction when the key is missing, which would crash the function at boot.
let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ apiKey: API_KEY }));
const service = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function baseHeaders(origin: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", Vary: "Origin",
  };
  if (ORIGINS.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "authorization, apikey, content-type";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}

async function hmacHex(text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(IP_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Before launch, send a spoofed X-Forwarded-For with curl and confirm which entry the platform
// sets (council/02-security.md). The per-IP cap is a speed bump; the global cap is the real limit.
function clientIp(req: Request): string {
  const first = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return first.includes(":") ? first.split(":").slice(0, 4).join(":") + "::/64" : first;
}

function textOf(msg: Anthropic.Beta.BetaMessage): string {
  return msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
}

async function callClaude(system: string, user: string, schema: unknown, maxTokens: number) {
  // deno-lint-ignore no-explicit-any
  const params: any = {
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: schema ? { effort: "low", format: { type: "json_schema", schema } } : { effort: "low" },
    system,
    messages: [{ role: "user", content: user }],
  };
  const msg = await anthropic().beta.messages.create(params, { timeout: 60_000, maxRetries: 1 });
  if (msg.stop_reason === "refusal" || msg.stop_reason === "max_tokens") throw new Error("stop:" + msg.stop_reason);
  return msg;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = baseHeaders(origin);
  const rid = crypto.randomUUID();
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { status: ORIGINS.includes(origin) ? 204 : 403, headers });
  if (req.method !== "POST") return json({ error: "invalid", rid }, 405);
  if (ORIGINS.length && !ORIGINS.includes(origin)) return json({ error: "invalid", rid }, 403);

  const raw = await req.text();
  if (raw.length > 8192) return json({ error: "invalid", rid }, 413);
  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid", rid }, 400); }

  // No key yet: answer before claim_brief so no brief attempts are used up.
  if (!API_KEY) return json({ error: "unavailable", rid }, 503);

  // ---------- pipeline insight (admin only) ----------
  if (body?.kind === "pipeline") {
    const auth = req.headers.get("authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false }, global: { headers: { Authorization: auth } },
    });
    const { data: isAdmin, error: adminErr } = await userClient.rpc("is_admin");
    if (adminErr || isAdmin !== true) return json({ error: "invalid", rid }, 403);
    const agg = body.aggregates;
    if (!agg || typeof agg !== "object" || JSON.stringify(agg).length > 6000) return json({ error: "invalid", rid }, 400);
    const nonce = crypto.randomUUID().slice(0, 8);
    const system = [
      "You analyse de-identified aggregates for the founder of a small consultancy that sells secure AI agents to NGOs, schools and education programmes worldwide. Return one JSON object only.",
      "Use only AGGREGATES. Each finding cites one metric key and copies its value. No computed percentages; write \"X of Y\". \"suppressed\" means fewer than 5: never estimate it or identify anyone. With fewer than 30 assessments, confidence is \"low\". If data is missing, say so. Plain English, no markdown, no em dashes.",
      "Output: {\"answer\": string (500 chars), \"findings\": [up to 5 {\"claim\": string, \"metric\": string, \"value\": string}], \"actions\": [up to 3 strings], \"caveats\": [up to 3 strings], \"confidence\": \"low\"|\"medium\"|\"high\"}",
    ].join("\n");
    try {
      const msg = await callClaude(system, `<aggregates_${nonce}>${JSON.stringify(agg)}</aggregates_${nonce}>`, null, 3000);
      const t = textOf(msg);
      const parsed = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
      const keys = JSON.stringify(agg);
      const clean = (s: unknown, n: number) => String(s ?? "").replace(/[<>`*#​-‏‪-‮⁠-⁩﻿]/g, "").slice(0, n);
      const insight = {
        answer: clean(parsed.answer, 600),
        // deno-lint-ignore no-explicit-any
        findings: (Array.isArray(parsed.findings) ? parsed.findings : []).filter((f: any) => f && keys.includes(String(f.metric))).slice(0, 5)
          // deno-lint-ignore no-explicit-any
          .map((f: any) => ({ claim: clean(f.claim, 200), metric: clean(f.metric, 40), value: clean(f.value, 40) })),
        actions: (Array.isArray(parsed.actions) ? parsed.actions : []).slice(0, 3).map((x: unknown) => clean(x, 200)),
        caveats: (Array.isArray(parsed.caveats) ? parsed.caveats : []).slice(0, 3).map((x: unknown) => clean(x, 200)),
        confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "low",
      };
      return json({ insight, rid });
    } catch {
      return json({ error: "unavailable", rid }, 502);
    }
  }

  // ---------- readiness brief ----------
  const id = String(body?.assessment_id ?? "");
  if (!UUID.test(id)) return json({ error: "invalid", rid }, 400);
  const ipHmac = await hmacHex(clientIp(req));

  const { data: prof, error } = await service.rpc("claim_brief", { p_assessment: id, p_ip_hmac: ipHmac });
  if (error) {
    const m = String(error.message ?? "");
    if (m.includes("limit_")) return json({ error: "limit", rid }, 429);
    if (m.includes("disabled")) return json({ error: "unavailable", rid }, 503);
    return json({ error: "invalid", rid }, 400);
  }
  const lang = body?.lang === "sw" || (body?.lang == null && prof?.lang === "sw") ? "sw" : "en";
  // The server recomputes everything from the stored, schema-checked answers. Client scores are ignored.
  const report = E.build(prof.answers ?? {}, lang, { date: new Date().toISOString().slice(0, 10) });
  const p = E.prompt(report);

  try {
    const msg = await callClaude(p.system, p.user, E.wireSchema(), 4000);
    const v = E.validateBrief(textOf(msg), report);
    if (!v.ok) {
      console.log(JSON.stringify({ rid, outcome: "invalid", reason: v.reason }));   // never log content
      return json({ error: "unavailable", rid }, 502);
    }
    await service.rpc("store_brief", { p_assessment: id, p_brief: v.brief, p_model: msg.model, p_prompt: p.version });
    console.log(JSON.stringify({ rid, outcome: "ok", model: msg.model, in: msg.usage?.input_tokens, out: msg.usage?.output_tokens, patched: v.patched.length }));
    return json({ brief: v.brief, rid });
  } catch (e) {
    console.log(JSON.stringify({ rid, outcome: "error", kind: e instanceof Error ? e.message.slice(0, 40) : "unknown" }));
    return json({ error: "unavailable", rid }, 502);
  }
});
