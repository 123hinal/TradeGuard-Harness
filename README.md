# TradeGuard AI Harness

Production-quality governance harness for financial trade recommendation agents. Built with Next.js 15, Supabase, and Anthropic Claude.

> **Agents recommend. The harness decides.**

## Features

- **Material Handler** — validates and normalizes trade requests
- **Guardrails** — pre-agent policy enforcement (size, securities, actions)
- **Checkpoints** — post-agent validation (confidence, volatility, reasoning)
- **Alarm Engine** — typed alarms with severity-based human escalation
- **Swappable Agents** — Claude or Mock via `AGENT_PROVIDER`
- **Audit Dashboard** — pass rates, alarm counts, execution history
- **Supabase Persistence** — full audit trail with in-memory fallback

## Architecture Overview

```
User → Material Handler → Guardrails → Agent → Checkpoints → Alarms → Decision
```

See [HARNESS.md](./HARNESS.md) for the full architecture documentation.

## Local Setup

### Prerequisites

- **Node.js 18.18+** (required for Next.js 15)
- npm 9+
- Supabase account (optional for local dev — in-memory fallback works)
- Anthropic API key (only when `AGENT_PROVIDER=claude`)

### Install & Run

```bash
# Clone and enter project
cd TradeGuard-Harness-main

# Install dependencies
npm install

# Copy environment template
# macOS/Linux:  cp .env.example .env.local
# Windows:      copy .env.example .env.local
# PowerShell:   Copy-Item .env.example .env.local
copy .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed Sample Data

```bash
npm run seed
```

Runs five demo trades through the harness using the mock agent.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_PROVIDER` | No | `mock` (default) or `claude` |
| `ANTHROPIC_API_KEY` | For Claude | Anthropic API key |
| `NEXT_PUBLIC_SUPABASE_URL` | For DB | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For DB | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For DB | Service role key (server-side writes) |
| `LANGFUSE_PUBLIC_KEY` | Optional | Langfuse public key |
| `LANGFUSE_SECRET_KEY` | Optional | Langfuse secret key |
| `LANGFUSE_BASE_URL` | Optional | Langfuse API base URL |

Example `.env.local`:

```bash
AGENT_PROVIDER=mock
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Supabase Setup

**New to Supabase?** Follow the step-by-step guide: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

Quick configure (after creating a project):

```bash
npm run supabase:configure -- \
  --url="https://YOUR_PROJECT_REF.supabase.co" \
  --anon="YOUR_ANON_KEY" \
  --service="YOUR_SERVICE_ROLE_KEY" \
  --db-password="YOUR_DB_PASSWORD"

npm run db:migrate
```

Tables created:

- `trade_runs`
- `guardrail_results`
- `checkpoint_results`
- `alarms`
- `audit_logs`

## Claude Setup

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Set in `.env.local`:

```bash
AGENT_PROVIDER=claude
ANTHROPIC_API_KEY=your-key-here
```

3. Restart the dev server

The harness code does not change — only the agent factory switches implementations.

## Vercel Deployment

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables in Vercel project settings
4. Deploy

The project includes `vercel.json` and requires no modification for Vercel.

```bash
# Or deploy via CLI
npx vercel --prod
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/trades/analyze` | Submit trade for harness evaluation |
| `GET` | `/api/trades/history` | Audit metrics and recent runs |
| `GET` | `/api/alarms` | List generated alarms |
| `GET` | `/api/checkpoints` | List checkpoint results |
| `GET` | `/api/runs` | List runs or get by `?id=` |

### Example Request

```bash
curl -X POST http://localhost:3000/api/trades/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "NVDA",
    "action": "BUY",
    "amount": 50000,
    "riskProfile": "MODERATE"
  }'
```

## Demo Instructions

1. Start the app: `npm run dev`
2. Open the **Submit Trade** page
3. Try these scenarios:

| Ticker | Amount | Expected Decision |
|--------|--------|-------------------|
| NVDA | 50000 | PENDING_HUMAN_REVIEW |
| AAPL | 30000 | APPROVED |
| TSLA | 10000 | BLOCKED |
| MSFT | 60000 | BLOCKED |

4. View results on the **Decision Dashboard**
5. Check aggregate metrics on the **Audit Dashboard**
6. Run `npm run seed` to populate sample history

## Screenshots

> _Placeholder — add screenshots after first local run_

| Page | Description |
|------|-------------|
| Submit Trade | Trade request form with demo scenarios |
| Decision Dashboard | Recommendation, guardrails, checkpoints, alarms, decision |
| Audit Dashboard | Pass rate, approval rate, alarm counts, recent runs |

## Project Structure

```
src/
├── agents/           # Swappable trade agents
├── app/              # Next.js pages and API routes
├── components/       # UI components (shadcn/ui)
├── harness/
│   ├── material-handler/
│   ├── guardrails/
│   ├── checkpoints/
│   ├── alarms/
│   └── orchestrator/
├── lib/              # Utilities and Supabase client
├── services/         # Audit logger and persistence
└── types/            # Domain models
supabase/
├── migrations/       # Database schema
├── sample-data.ts    # Demo trade requests
└── seed.ts           # Seed script
```

## License

MIT
