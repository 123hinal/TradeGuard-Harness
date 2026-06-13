# TradeGuard AI Harness

Governance harness for financial trade recommendation agents. The harness — not the AI — makes the final approval decision.

## Overview

TradeGuard AI Harness wraps a swappable trade recommendation agent with four independent governance pillars:

1. **Material Handler** — input validation and normalization
2. **Guardrails** — pre-agent policy enforcement
3. **Checkpoints** — post-agent output validation
4. **Alarm Engine** — operational alerts and human escalation

The agent recommends. The harness decides.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     TradeGuard AI Harness                        │
├─────────────────────────────────────────────────────────────────┤
│  User Request                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────┐                                           │
│  │ Material Handler │  validate · normalize · transform         │
│  └────────┬─────────┘                                           │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │    Guardrails    │  MAX_TRADE_SIZE · ALLOWED_SECURITIES ·    │
│  │                  │  VALID_ACTION · RISK_PROFILE_PRESENT       │
│  └────────┬─────────┘  fail → BLOCKED (stop)                     │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │   Trade Agent    │  ClaudeTradeAgent | MockTradeAgent        │
│  │   (swappable)    │  recommendation only — no approval         │
│  └────────┬─────────┘                                           │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │   Checkpoints    │  CONFIDENCE · AMOUNT · VOLATILITY ·        │
│  │                  │  REASONING                                 │
│  └────────┬─────────┘  fail → alarm (continue)                   │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  Alarm Engine    │  map failures → typed alarms               │
│  └────────┬─────────┘                                           │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │ Decision Engine  │  APPROVED | BLOCKED | PENDING_HUMAN_REVIEW │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Material Handling

**Location:** `src/harness/material-handler/`

Runs first. Converts raw user input into a normalized `TradeRequest`:

- Validates with Zod schema
- Uppercases ticker and action
- Parses currency strings
- Rejects invalid input before guardrails run

Material handler failure → `BLOCKED` at `MATERIAL_HANDLER` stage.

## Guardrails

**Location:** `src/harness/guardrails/`

Each guardrail implements:

```typescript
interface Guardrail {
  evaluate(request: TradeRequest): GuardrailResult;
}
```

| Guardrail | Rule |
|-----------|------|
| `MAX_TRADE_SIZE` | amount ≤ $50,000 |
| `ALLOWED_SECURITIES` | AAPL, MSFT, NVDA, GOOGL, AMZN |
| `VALID_ACTION` | BUY or SELL |
| `RISK_PROFILE_PRESENT` | riskProfile not empty |

Guardrails run **before** the agent. Any failure **immediately blocks** execution and generates `GUARDRAIL_FAILURE` alarms.

## Checkpoints

**Location:** `src/harness/checkpoints/`

Each checkpoint implements:

```typescript
interface Checkpoint {
  evaluate(recommendation: TradeRecommendation): CheckpointResult;
}
```

| Checkpoint | Pass Criteria |
|------------|---------------|
| `CONFIDENCE_THRESHOLD` | confidence > 0.70 |
| `MAX_RECOMMENDED_AMOUNT` | recommendedAmount ≤ $50,000 |
| `VOLATILITY_CHECK` | mock volatility ≠ HIGH |
| `REASONING_PRESENT` | reasoning length > 20 chars |

Checkpoints run **after** the agent. Failures **do not stop** processing — they generate alarms.

## Alarm Engine

**Location:** `src/harness/alarms/`

Independent module that maps failures to structured alarms:

```typescript
{
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  context: string;
  recommendedAction: string;
}
```

| Alarm Type | Trigger |
|------------|---------|
| `GUARDRAIL_FAILURE` | Guardrail blocked |
| `LOW_CONFIDENCE` | Confidence checkpoint failed |
| `HIGH_VOLATILITY` | NVDA (mock HIGH volatility) |
| `INVALID_RECOMMENDATION` | Amount or reasoning checkpoint failed |
| `HUMAN_REVIEW_REQUIRED` | Any HIGH/CRITICAL alarm present |

## Human Escalation

Decision logic in `HarnessOrchestrator`:

| Condition | Decision |
|-----------|----------|
| Any HIGH or CRITICAL alarm | `PENDING_HUMAN_REVIEW` |
| Checkpoint failures (no HIGH/CRITICAL) | `BLOCKED` |
| All checks pass | `APPROVED` |
| Guardrail failure | `BLOCKED` (immediate) |

The agent never returns approval. Only the harness sets the final decision.

## Persistence

**Location:** `supabase/migrations/001_initial_schema.sql`

Tables:

- `trade_runs` — execution metadata and recommendation
- `guardrail_results` — per-guardrail outcomes
- `checkpoint_results` — per-checkpoint outcomes
- `alarms` — generated alarms
- `audit_logs` — full observability payload

Without Supabase credentials, the app falls back to in-memory persistence for local development.

## Observability

**Location:** `src/services/audit-logger.ts`

Every run logs:

- Run ID
- Execution time (ms)
- Guardrail results
- Checkpoint results
- Alarms
- Final decision
- Agent used

Optional Langfuse integration via `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL`.

## Swappable Agent Design

**Location:** `src/agents/`

```typescript
interface TradeAgent {
  analyzeTrade(request: TradeRequest): Promise<TradeRecommendation>;
  readonly name: string;
}
```

Switch agents via environment variable — **no harness code changes**:

```bash
AGENT_PROVIDER=mock    # MockTradeAgent (default)
AGENT_PROVIDER=claude  # ClaudeTradeAgent
```

Factory: `src/agents/index.ts` → `createTradeAgent()`

## Demo Scenarios

| Input | Expected Outcome |
|-------|------------------|
| NVDA BUY $50k MODERATE | `PENDING_HUMAN_REVIEW` (high volatility + low mock confidence) |
| AAPL BUY $30k CONSERVATIVE | `APPROVED` |
| TSLA BUY $10k | `BLOCKED` (not in allowed securities) |
| MSFT SELL $60k | `BLOCKED` (exceeds max trade size) |
| GOOGL BUY $25k MODERATE | `APPROVED` |

Run seed script: `npm run seed`

## Challenge Requirement Mapping

| Requirement | Implementation |
|-------------|----------------|
| Four independent harness modules | `material-handler/`, `guardrails/`, `checkpoints/`, `alarms/` |
| Swappable AI worker | `TradeAgent` interface + `AGENT_PROVIDER` env |
| Worker never bypasses harness | All requests go through `HarnessOrchestrator` |
| Guardrails before agent | Orchestrator step 2 |
| Checkpoints after agent | Orchestrator step 4 |
| Alarm on checkpoint failure | `AlarmEngine.fromCheckpointFailures()` |
| Human escalation | HIGH/CRITICAL → `PENDING_HUMAN_REVIEW` |
| Supabase persistence | Migration + `trade-persistence.ts` |
| API endpoints | `/api/trades/analyze`, `/history`, `/alarms`, `/checkpoints`, `/runs` |
| Frontend dashboards | `/`, `/dashboard`, `/audit` |
| Audit logging | `audit-logger.ts` + `audit_logs` table |
| Langfuse (optional) | Env-gated ingestion in audit logger |
