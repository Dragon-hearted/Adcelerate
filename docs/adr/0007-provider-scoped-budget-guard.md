# A provider's amount/balance check runs only when that provider serves the request

image-engine can serve a generation via the **Higgsfield CLI** (default, `higgsfield-nano-banana-pro`) or via **WisGate** (the Gemini image-gen gateway). The budget guard checks **WisGate's** balance — synced from WisGate's `available_balance` into a local DB at startup (`src/index.ts:41-61`, `syncBudgetWithWisGate()`) and enforced per-request by `budgetGuard()` middleware (`src/middleware/budget-guard.ts:6-57`), applied globally at `src/routes/generate.ts:75`. The middleware runs **before** the handler determines `isHiggsfield` (`src/routes/generate.ts:85`), so a Higgsfield generation is **402'd on WisGate's wallet** even though it never spends WisGate funds. This blocks real, payable work on an irrelevant balance, and reads downstream as "image-engine doing the wrong thing / failing for no reason."

**Decision:** a provider's balance/amount check runs **only when that provider actually serves the request**. The WisGate balance check must be skipped on the Higgsfield path. Because the guard is middleware that runs before model parsing, the fix peeks at `request.model` in the middleware (or moves the check into the handler after model detection) and short-circuits the WisGate check when `isHiggsfield`.

**Higgsfield gets no pre-flight balance guard** — Higgsfield exposes no balance/credits API (confirmed: `src/higgsfield-provider.ts` offers only `auth login`, `model list`, `generate create`). The CLI's own out-of-credits error surfaces normally if it ever occurs.

**Considered and rejected:**
- **Higgsfield balance pre-check** — impossible; no balance API exists.
- **Local spend counter for the Higgsfield path** (track spend against a configured cap, independent of any provider wallet) — a reasonable *optional* guardrail, but deliberately deferred: it's an enhancement, not part of unblocking the false 402. Can be added later without revisiting this decision.

**Scope note:** the batch-executor per-item check (`src/lib/batch-executor.ts:135-140`) is a provider-agnostic **token** ceiling, a separate guardrail — left as-is; this ADR concerns only the WisGate-wallet balance guard.

**Consequence:** Higgsfield generations stop being blocked by WisGate's balance. The principle generalizes: as more providers are added, each carries its own amount check, gated on being the serving provider — never a global cross-provider gate.
