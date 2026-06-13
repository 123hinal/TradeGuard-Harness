# TradeGuard Harness — Decisions Checklist

Use this checklist before implementation. Check items when the team has agreed and documented the decision (link to ADR, issue, or section in README as needed).

---

## Architecture & policy

- [x] **Guardrails vs checkpoints** — Which rules live in each layer? Document ordering (e.g. guardrails → agent → tools → checkpoints) and whether the same rule can appear in both.
- [x] **Decision engine policy** — Define how outcomes are chosen: one failed checkpoint = reject? Severity-based rules? When to **MODIFY** (e.g. auto-cap size) vs **REJECT** vs **ESCALATE**.
- [x] **Tool orchestration** — Agent picks tools within an allowlist, or harness runs a fixed tool pipeline and passes results to the agent?
- [x] **Alarm vs checkpoint** — Always emit an alarm on checkpoint failure, or only for certain severities? Single audit record or two (checkpoint + alarm)?

### Proposed defaults (ratify or edit)

Status: **proposed** — adopt as-is to unblock implementation, or change individual lines.

#### Canonical pipeline order

Tools run **before** the agent so checkpoints and the agent share the same facts.

```
User Request
    → Material Handler (normalize; fail → REJECT)
    → Request guardrails (MAX_TRADE_SIZE, APPROVED_SECURITIES, MANUAL_APPROVAL flag)
         fail → REJECT, stop run
    → Fixed tool pipeline (portfolio → market data → risk)
         critical tool fail → REJECT, stop run
    → Agent (single analyze call; tool outputs + request in context)
    → Output guardrails (RETIREMENT_ACCOUNT_RULES on agent recommendation)
         fail → REJECT, stop run
    → Checkpoints (concentration, risk, confidence, liquidity)
         any fail → alarm + REJECT
    → Decision engine (ESCALATE if manual-approval flag and all checks passed)
    → Final result
```

#### Guardrail fail behavior


| Layer                          | On fail                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Material handler               | `REJECT`, reason e.g. unparseable request; no tools, agent, or checkpoints                        |
| Request guardrails             | `REJECT`, persist audit event (`stage: GUARDRAIL`); optional `GUARDRAIL_VIOLATION` alarm (MEDIUM) |
| Output guardrails (retirement) | `REJECT`, same audit pattern                                                                      |
| `MANUAL_APPROVAL`              | **Does not fail** — sets `requiresHumanApproval: true` on the run                                 |


#### RETIREMENT and MANUAL_APPROVAL


| Rule                       | When evaluated     | Input                                             | On trigger                               |
| -------------------------- | ------------------ | ------------------------------------------------- | ---------------------------------------- |
| `MANUAL_APPROVAL`          | Request guardrails | Normalized `amount` from material handler         | Flag only; pipeline continues            |
| `RETIREMENT_ACCOUNT_RULES` | Output guardrails  | Agent recommendation (`instrumentType`, `action`) | `REJECT` if options, margin, or leverage |


Account type (`retirement` vs taxable) comes from the request payload; retirement guardrail runs only when `accountType === "RETIREMENT"`.

Decision engine: `requiresHumanApproval` + all guardrails/checkpoints pass → `ESCALATE`. Any checkpoint fail → `REJECT` (human does not review bad trades).

#### Decision engine matrix (MVP)


| Condition                                                 | Outcome                                          |
| --------------------------------------------------------- | ------------------------------------------------ |
| Material handler fail                                     | `REJECT`                                         |
| Request/output guardrail fail                             | `REJECT`                                         |
| Critical tool fail                                        | `REJECT`                                         |
| Any checkpoint fail                                       | `REJECT` (+ checkpoint alarm)                    |
| Risk score in escalate band (80–94, see thresholds table) | `ESCALATE` (even if checkpoint “passes” at < 95) |
| All checks pass + `requiresHumanApproval`                 | `ESCALATE`                                       |
| All checks pass, no flags                                 | `APPROVE`                                        |
| `MODIFY` (auto-cap size)                                  | **Not in MVP** — defer to v2                     |


#### Fixed tool pipeline


| Setting          | MVP default                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Tools            | Portfolio Analyzer → Market Data (ticker) → Risk Calculator                                |
| Frequency        | All three, every trade run                                                                 |
| Agent loop       | **Single-shot** one `analyzeTrade()` call                                                  |
| Iteration limits | Keep config (5 / 20s / $0.25) for future multi-step agent; not used in MVP                 |
| Tool fail        | Portfolio or market data fail → `REJECT`. Risk calculator fail → `REJECT`. No retry in MVP |


#### Alarm mapping (checkpoint fail)


| Checkpoint      | Alarm `type`             | `severity` | `recommended_action`  | Final status |
| --------------- | ------------------------ | ---------- | --------------------- | ------------ |
| `CONCENTRATION` | `POSITION_CONCENTRATION` | HIGH       | Reduce trade size     | `REJECT`     |
| `RISK_SCORE`    | `RISK_SCORE_EXCEEDED`    | CRITICAL   | Reject trade          | `REJECT`     |
| `CONFIDENCE`    | `LOW_CONFIDENCE`         | MEDIUM     | Escalate to human     | `REJECT`     |
| `LIQUIDITY`     | `LIQUIDITY_RISK`         | MEDIUM     | Reduce size or reject | `REJECT`     |


Checkpoint pass → no alarm. `recommended_action` is operator guidance; **decision engine** sets authoritative `status`.

#### Liquidity threshold (proposed)

**Pass if:** trade amount ≤ 5% of 20-day average daily dollar volume for the ticker.

Example: $4,000 trade needs ADV ≥ $80,000. Large-cap demo names pass; illiquid symbols fail.

#### Material handler

Always **first** stage. Parses raw request into `{ action, ticker, amount, accountType, ... }`. Everything downstream uses normalized shape only.

---

## Data & integrations

- [x] **Portfolio & market data** — Mock/static for MVP vs real APIs; what is in the request body vs loaded from the database.
- [x] **Persistence** — What is stored in PostgreSQL (runs, checkpoints, alarms, decisions, human approvals) and retention policy.
- [x] **Liquidity threshold** — Concrete rule (e.g. minimum average daily volume, max % of daily volume). **Proposed:** trade ≤ 5% of 20-day ADV (see Architecture proposed defaults).

---

## Configuration & accounts

- [ ] **Rule scope** — Global defaults vs per-account / per-risk-profile overrides.
- [x] **Risk profiles** — What `Moderate` (and others) change: thresholds only, guardrail set, or both.
- [ ] **Account type** — How retirement vs taxable is detected and which guardrails apply.
- [ ] **Approved securities** — Static list, config file, or admin-managed; update process.

---

## Human-in-the-loop

- [x] **Escalation UX** — Dashboard, queue, email/Slack, or API-only for MVP.
- [x] **Timeout behavior** — If no human response: reject, hold, or auto-approve under conditions.
- [x] **Approval threshold** — $25k triggers escalate only, or block until approved?

---

## Thresholds (fill in numbers)

Reference values from the design doc are listed for convenience; confirm or override.


| Rule                            | Design doc default    | Team decision |
| ------------------------------- | --------------------- | ------------- |
| Concentration limit             | Single position < 10% | yes           |
| Risk score pass                 | Score < 95            | yes           |
| Risk score warn band (optional) | e.g. 75–80 → escalate | yes           |
| Confidence minimum              | > 70%                 | yes           |
| Max trade size                  | $5,00                 | yes           |
| Manual approval threshold       | $5000                 | yes           |
| Max agent iterations            | 5                     | yes           |
| Max agent runtime               | 20 seconds            | yes           |
| Max agent cost                  | $0.25                 | yes           |


---

## Tech stack (pick one path for MVP)

- [x] **Backend** — Node.js or Python (and why).
- [x] **AI provider** — OpenAI or Claude for v1; env-based swap (`AGENT_PROVIDER`) from day one or later.
- [x] **Observability** — OpenTelemetry only, Langfuse, audit table, or combined; what the dashboard must show for demo.
- [x] **Frontend scope** — Full Angular 18 app vs minimal API + simple UI for a short MVP.

---

## API, security & ops

- [ ] **Auth** — Who can submit trades; roles (trader, approver, admin).
- [x] **Public API contract** — Request/response shapes for run, escalate, approve/reject.
- [x] **Failure handling** — Tool/API failures, agent timeouts, malformed recommendations → reject vs retry vs escalate.
- [ ] **Replay** — Whether “replayable” runs mean re-run from stored events or display-only audit trail.

---

## Doc alignment (quick wins)

Align naming across `README.md` and design docs before coding.

- [x] **Product name** — TradeGuard Harness vs Financial Trade Approval Harness (one canonical name).
- [x] **Agent interface** — `analyze()` vs `analyzeTrade()` (one method name).
- [x] **Alarm types** — `LOOP_LIMIT_EXCEEDED` vs `AGENT_LIMIT_EXCEEDED` (one enum).
- [x] **Guardrail names** — `RETIREMENT_ACCOUNT_RULES` vs `RETIREMENT_ACCOUNT` (one naming scheme).

---

## Suggested meeting order

1. **Decision engine + guardrails/checkpoints** — Blocks most design work.
2. **Data sources + persistence** — Blocks implementation.
3. **Human-in-the-loop + thresholds** — Blocks demo script.
4. **Stack + MVP scope** — Blocks sprint plan.
5. **Doc alignment** — Can be done in parallel.

---

## Decision log

Record finalized choices here (date, decision, owner).


| Date | Decision | Owner | Notes |
| ---- | -------- | ----- | ----- |
|      |          |       |       |


