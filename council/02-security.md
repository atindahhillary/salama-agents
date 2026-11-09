# Council: Security Architect (global scope)

The full SQL from this review is implemented, with adaptations, in `supabase/migrations/`. This file records the rulings.

## MUST (launch blockers)
1. **Own origin.**
   - Every repo on `atindahhillary.github.io` shares one origin, and localStorage is shared per origin.
   - Use a custom domain with Enforce HTTPS. Pin CORS and auth redirects to that domain.
2. **Grants, not just RLS.**
   - Column-level INSERT grants, so anonymous visitors cannot set status, brief, attempts, quality or timestamps.
   - Inserts use a UUID generated on the device and `return=minimal`, so anonymous visitors never need SELECT.
   - Internal tables live in a `private` schema the Data API does not expose.
   - Revoke PUBLIC execute on every function. Drop pg_graphql if it is unused.
3. **Postgres enforces the answer shapes.**
   - pg_jsonschema with `additionalProperties:false` and enums for every answer.
   - The only free text that reaches the model is one field of up to 300 characters.
   - The server recomputes the score, because a client score can be forged.
4. **A cost ceiling that does not depend on IP addresses.**
   - An atomic global daily cap, at most 3 briefs per assessment, and only for assessments under 24 hours old.
   - A fixed max_tokens.
   - A dedicated Anthropic workspace and key with a monthly spend limit.
   - A kill-switch row. If the cap runs out, users fall back to the rule-based report.
5. **IP hashing.**
   - HMAC-SHA256 with a secret key, since plain SHA-256 of an IPv4 address is reversible. Hash the /64 for IPv6.
   - Delete counters after 7 days.
   - Test how X-Forwarded-For arrives before trusting it.
   - Set the per-IP cap near 20, because carrier-grade NAT and workshop Wi-Fi put many real users behind one IP. It is a speed bump, not the main control.
6. **Model output is untrusted.**
   - Force JSON through a schema, then validate it on the server: exact keys, fixed array lengths, length caps on every field.
   - Reject angle brackets, URLs, emails and phone numbers, then run the redactor again.
   - If validation fails, store nothing and show the deterministic brief.
7. **No innerHTML where attacker or model text lands.**
   - textContent only, and no markdown-to-HTML library.
   - Strip bidi and zero-width characters.
   - CSV export: prefix any cell that starts with `= + - @`, a tab or a carriage return with an apostrophe.
8. **Admin auth.**
   - Sign-ups off, and the admin user created by hand.
   - The allowlist is keyed on `auth.uid()`.
   - `is_admin()` requires `aal2` (a TOTP second factor).
   - Sign-in uses a 6-digit email code rather than a link, because mail scanners prefetch links.
   - Exact redirect URLs only.
   - Custom SMTP with SPF, DKIM and DMARC.
9. **A CSP that cannot be bypassed.**
   - jsDelivr serves any npm package, so self-host a pinned supabase-js and any fonts.
   - No inline scripts or handlers. Setting style through `el.style` is fine.
   - The policy: `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src https://<ref>.supabase.co; worker-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; upgrade-insecure-requests`.
10. **Accounts.**
    - Passkeys on GitHub, Supabase, Anthropic, the domain registrar and the admin mailbox.
    - Registrar lock on the domain.
    - Secret scanning with push protection.
    - No real data or .env files anywhere in the repo's history.
11. **The privacy page must be literally true in every regime we touch.**
    - Disclose that GitHub and Supabase log visitor IPs, and that Anthropic (US) processes data.
    - Name the Supabase region and the transfer mechanism.
    - Consent boxes start unticked, stay separate, and are versioned and timestamped.
    - Confirm our own registration where we are based (ODPC), whether we need a GDPR Article 27 representative, and a breach plan that lists each regime's deadline.
12. **Shared devices.**
    - Never autosave contact fields.
    - Drafts expire after 72 hours and are cleared on submit.
    - The report offers "Clear this device".
    - Funnel events use an id held in memory for each tab, never stored, which avoids an ePrivacy consent question.
    - Keep the assessment UUID out of URLs and shares.

## SHOULD
- **Hosting.** Cloudflare Pages for real headers (HSTS, frame-ancestors, Permissions-Policy). Prospects' IT leads will check securityheaders.com.
- **Bot defence.** Self-hosted proof-of-work (ALTCHA) on briefs and inserts.
- **Insert throttle and quality flag.**
  - Leave unverified rows out of the annual report.
  - Suppress any figure covering fewer than 10 organisations.
- **Wording.** Say "de-identified", not "anonymised". Organisation type, country, size and population served can single out a small CBO.
- **Admin session.**
  - Kept in sessionStorage, with a 15 to 30 minute JWT and refresh-token rotation.
  - Exports run through an RPC that writes an audit row.
- **Logging.**
  - Log logins, status changes, deletes, exports and brief outcomes.
  - Never log prompts, free text, contacts or raw IPs.
- **Pipeline AI.** It sees numeric aggregates and enum counts only, and the server verifies the admin JWT.
- **Artifact mode.** Store only synthetic or demo data unless storage is confirmed private. Tell viewers their own Claude settings govern the AI call.
- **Disclosure.** Publish `/.well-known/security.txt` and a disclosure policy.

## COULD
- Trusted Types.
- A hash of the exact payload, returned by the function and compared with the preview.
- An HSTS-preloaded TLD (.app or .dev).
- Publish our own DPIA and SAFE-A self-score, and run monthly multilingual injection tests against `brief`.

## What the regex redactor will miss
- Names that are also ordinary words (Grace, Hope, Blessing, Baraka, Imani).
- Lowercase or vernacular names, and nicknames.
- Every non-Latin script.
- Informal place descriptions ("the school behind the clinic").
- Ages written in words.
- Phone and ID formats it was not written for.
- Payment references.

Run it on the device before storage, again on the server before the prompt, and again on the output. Label the demo with the languages it was tested in.

## Edge-function checklist (`brief`)
1. POST and OPTIONS only. CORS echoes the exact origin, with `Vary: Origin`.
2. Bodies are 2 KB at most, and `assessment_id` must match a UUID regex.
3. Verify proof-of-work, if enabled, before any database call.
4. HMAC the IP using the method you tested, then call `claim_brief`. Map `limit_*` to 429 and `disabled` to 503.
5. Build the prompt only from what `claim_brief` returns, mapping enums to labels on the server. Never query contacts.
6. Redact the free text again, wrap it in a random tag for each request, give the model no tools, and treat the content as untrusted in any language.
7. Pin the model, fix max_tokens, set a timeout, and retry once only on 529 or 5xx.
8. Validate the output, save it with `store_brief`, and return only the validated object.
9. Errors return as `{"error":"limit|unavailable|invalid","rid":"..."}` only.
10. Never log bodies, prompts or profiles.
11. Send a JSON content type, `nosniff` and `no-store`.
12. Store secrets with `supabase secrets set`, rotate them quarterly and when staff change, and pin imports.
13. Pre-launch tests:
    - a spoofed X-Forwarded-For
    - a fourth brief for one assessment
    - 20 concurrent calls on one id
    - an oversized body
    - HTML and multilingual "ignore previous instructions" text in the task field
    - malformed model JSON
