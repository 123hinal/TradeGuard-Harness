-- TradeGuard AI Harness schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS trade_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  action TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  decision TEXT NOT NULL,
  agent_used TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  recommendation JSONB,
  risk_profile TEXT,
  blocked_at TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guardrail_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_run_id UUID NOT NULL REFERENCES trade_runs(id) ON DELETE CASCADE,
  guardrail_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoint_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_run_id UUID NOT NULL REFERENCES trade_runs(id) ON DELETE CASCADE,
  checkpoint_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_run_id UUID NOT NULL REFERENCES trade_runs(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  context TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES trade_runs(id) ON DELETE CASCADE,
  execution_time_ms INTEGER NOT NULL,
  guardrail_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  checkpoint_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  alarms JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision TEXT NOT NULL,
  agent_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_runs_created_at ON trade_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alarms_trade_run_id ON alarms(trade_run_id);
CREATE INDEX IF NOT EXISTS idx_guardrail_results_trade_run_id ON guardrail_results(trade_run_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_results_trade_run_id ON checkpoint_results(trade_run_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_run_id ON audit_logs(run_id);
