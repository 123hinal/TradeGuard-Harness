# Supabase Setup Guide

Follow these steps to create a Supabase project, configure env vars, and run the migration.

## 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in (or create an account).
2. Click **New project**.
3. Choose an organization, name the project (e.g. `tradeguard-harness`), set a **database password**, and pick a region.
4. Wait for the project to finish provisioning (~2 minutes).

Save the **database password** — you will need it for migrations.

## 2. Copy API credentials

In your project dashboard:

1. Open **Project Settings** (gear icon) → **API**.
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret; server-only)

## 3. Configure environment variables

In Supabase dashboard, open **Connect** (or **Project Settings → Database**) and copy the **Session pooler** connection string (IPv4-compatible). Paste it as `DATABASE_URL` in `.env.local`.

From the project root, run:

```bash
npm run supabase:configure -- \
  --url="https://YOUR_PROJECT_REF.supabase.co" \
  --anon="YOUR_ANON_KEY" \
  --service="YOUR_SERVICE_ROLE_KEY" \
  --db-password="YOUR_DB_PASSWORD"
```

Or copy `.env.example` to `.env.local` and fill in the values manually:

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env.local

# Windows (Command Prompt)
copy .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

Required values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_PASSWORD=your-database-password
AGENT_PROVIDER=mock
```

Optional (alternative to `SUPABASE_DB_PASSWORD` — **recommended on Windows**):

```env
DATABASE_URL=postgresql://postgres.ttbmaovoaoibeeiqnwpx:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

Copy the exact URI from **Supabase → Connect → Session pooler**.

## 4. Run the migration

```bash
npm install
npm run db:migrate
```

Expected output:

```
TradeGuard — Running Supabase migration
Migration: .../supabase/migrations/001_initial_schema.sql
Migration applied successfully.
```

## 5. Verify tables

In Supabase dashboard → **Table Editor**, confirm these tables exist:

- `trade_runs`
- `guardrail_results`
- `checkpoint_results`
- `alarms`
- `audit_logs`

## 6. Seed sample data (optional)

```bash
npm run seed
npm run dev
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Missing database connection` | Set `DATABASE_URL` or `SUPABASE_DB_PASSWORD` in `.env.local` |
| `password authentication failed` | Use the password from project creation (Settings → Database → Reset if needed) |
| `ENOTFOUND db.xxxx.supabase.co` | Check `NEXT_PUBLIC_SUPABASE_URL` project ref matches your project |
| SSL errors | Migration script uses `ssl: { rejectUnauthorized: false }` for Supabase cloud |

## Local Supabase (optional)

If you prefer local Postgres via Docker:

```bash
npx supabase start
npx supabase status   # copy API URL and keys
npm run db:migrate
```

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).
