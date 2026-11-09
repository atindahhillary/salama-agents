# Contributing

SAFE-A and the readiness check are open. Contributions are welcome from practitioners, safeguarding leads, data protection specialists, teachers, developers and the communities these tools affect.

## Ways to help
- **Comment on the standard.** Open an issue titled `SAFE-A: <control id>` with the change you propose and why. Real field examples help most.
- **Translate.** Copy the `en` strings in `src/content.js` into a new language block. Name a fluent reviewer in the pull request. Do not change the meaning of any control or question.
- **Improve the redactor.** Add test cases to `tests/redact.test.mjs` for names, phone formats and places from your country. Never use real people's data; make examples up.
- **Share a case study.** Use the outline on the case study page. Get written permission from every organisation you name, and remove anything that could identify a person.

## Rules
1. No real personal data in issues, pull requests, tests or examples.
2. Scoring changes must update `tests/engine.test.mjs` and say how they change existing scores.
3. Run `node tests/redact.test.mjs && node tests/engine.test.mjs && node scripts/build.mjs` before opening a pull request.
4. No em dashes in user-facing text, and plain language at about B1 level.
5. Security issues go to the contact in `docs/.well-known/security.txt`, not to public issues.

By contributing, you agree that code is licensed under Apache-2.0 and standard text under CC BY 4.0.
