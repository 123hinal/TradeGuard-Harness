import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogEntry, HarnessExecutionResult } from "@/types";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("your-project")) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key);
  }

  return supabaseClient;
}

export interface DbTradeRun {
  id: string;
  ticker: string;
  action: string;
  amount: number;
  status: string;
  decision: string;
  agent_used: string;
  execution_time_ms: number;
  recommendation: Record<string, unknown> | null;
  created_at: string;
}

export interface DbGuardrailResult {
  id: string;
  trade_run_id: string;
  guardrail_name: string;
  passed: boolean;
  message: string;
}

export interface DbCheckpointResult {
  id: string;
  trade_run_id: string;
  checkpoint_name: string;
  passed: boolean;
  message: string;
}

export interface DbAlarm {
  id: string;
  trade_run_id: string;
  alarm_type: string;
  severity: string;
  context: string;
  recommended_action: string;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  run_id: string;
  execution_time_ms: number;
  guardrail_results: AuditLogEntry["guardrailResults"];
  checkpoint_results: AuditLogEntry["checkpointResults"];
  alarms: AuditLogEntry["alarms"];
  decision: string;
  agent_used: string;
  created_at: string;
}
