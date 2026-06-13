import { getSupabaseClient } from "@/lib/supabase/client";
import type { HarnessExecutionResult } from "@/types";
import { v4 as uuidv4 } from "uuid";

const inMemoryRuns: StoredRun[] = [];

interface StoredRun extends HarnessExecutionResult {
  createdAt: string;
}

class TradePersistenceService {
  async saveExecution(result: HarnessExecutionResult): Promise<void> {
    const supabase = getSupabaseClient();
    const createdAt = new Date().toISOString();

    if (!supabase) {
      inMemoryRuns.unshift({ ...result, createdAt });
      return;
    }

    const { error: runError } = await supabase.from("trade_runs").insert({
      id: result.runId,
      ticker: result.request.ticker,
      action: result.request.action,
      amount: result.request.amount,
      status: result.status,
      decision: result.decision,
      agent_used: result.agentUsed,
      execution_time_ms: result.executionTimeMs,
      recommendation: result.recommendation,
      risk_profile: result.request.riskProfile,
      blocked_at: result.blockedAt ?? null,
      error_message: result.error ?? null,
      created_at: createdAt,
    });

    if (runError) {
      console.error("[TradePersistence] trade_runs insert failed:", runError.message);
      inMemoryRuns.unshift({ ...result, createdAt });
      return;
    }

    if (result.guardrailResults.length > 0) {
      await supabase.from("guardrail_results").insert(
        result.guardrailResults.map((g) => ({
          id: uuidv4(),
          trade_run_id: result.runId,
          guardrail_name: g.name,
          passed: g.passed,
          message: g.message,
        }))
      );
    }

    if (result.checkpointResults.length > 0) {
      await supabase.from("checkpoint_results").insert(
        result.checkpointResults.map((c) => ({
          id: uuidv4(),
          trade_run_id: result.runId,
          checkpoint_name: c.name,
          passed: c.passed,
          message: c.message,
        }))
      );
    }

    if (result.alarms.length > 0) {
      await supabase.from("alarms").insert(
        result.alarms.map((a) => ({
          id: uuidv4(),
          trade_run_id: result.runId,
          alarm_type: a.type,
          severity: a.severity,
          context: a.context,
          recommended_action: a.recommendedAction,
          created_at: createdAt,
        }))
      );
    }

    await supabase.from("audit_logs").insert({
      id: uuidv4(),
      run_id: result.runId,
      execution_time_ms: result.executionTimeMs,
      guardrail_results: result.guardrailResults,
      checkpoint_results: result.checkpointResults,
      alarms: result.alarms,
      decision: result.decision,
      agent_used: result.agentUsed,
      created_at: createdAt,
    });
  }

  async getRuns(limit = 50): Promise<StoredRun[]> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return inMemoryRuns.slice(0, limit);
    }

    const { data, error } = await supabase
      .from("trade_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return inMemoryRuns.slice(0, limit);
    }

    const runIds = data.map((row) => String(row.id));
    const { data: auditRows } = await supabase
      .from("audit_logs")
      .select("run_id, guardrail_results, checkpoint_results, alarms, execution_time_ms, agent_used")
      .in("run_id", runIds);

    const auditByRun = new Map(
      (auditRows ?? []).map((row) => [String(row.run_id), row])
    );

    return data.map((row) => {
      const base = mapDbRunToStored(row);
      const audit = auditByRun.get(String(row.id));
      if (!audit) return base;

      return {
        ...base,
        guardrailResults: (audit.guardrail_results as StoredRun["guardrailResults"]) ?? [],
        checkpointResults: (audit.checkpoint_results as StoredRun["checkpointResults"]) ?? [],
        alarms: (audit.alarms as StoredRun["alarms"]) ?? [],
        executionTimeMs: Number(audit.execution_time_ms ?? base.executionTimeMs),
        agentUsed: String(audit.agent_used ?? base.agentUsed),
      };
    });
  }

  async getRunById(id: string): Promise<StoredRun | null> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return inMemoryRuns.find((r) => r.runId === id) ?? null;
    }

    const { data: runRow } = await supabase.from("trade_runs").select("*").eq("id", id).single();
    if (!runRow) {
      return inMemoryRuns.find((r) => r.runId === id) ?? null;
    }

    const { data: auditRow } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("run_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const base = mapDbRunToStored(runRow);

    if (auditRow) {
      return {
        ...base,
        guardrailResults: (auditRow.guardrail_results as StoredRun["guardrailResults"]) ?? [],
        checkpointResults: (auditRow.checkpoint_results as StoredRun["checkpointResults"]) ?? [],
        alarms: (auditRow.alarms as StoredRun["alarms"]) ?? [],
        executionTimeMs: Number(auditRow.execution_time_ms ?? base.executionTimeMs),
        agentUsed: String(auditRow.agent_used ?? base.agentUsed),
      };
    }

    return base;
  }

  async getAlarms(limit = 100) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return inMemoryRuns.flatMap((r) =>
        r.alarms.map((a, i) => ({
          id: `${r.runId}-${i}`,
          trade_run_id: r.runId,
          alarm_type: a.type,
          severity: a.severity,
          context: a.context,
          recommended_action: a.recommendedAction,
          created_at: r.createdAt,
        }))
      ).slice(0, limit);
    }

    const { data } = await supabase
      .from("alarms")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    return data ?? [];
  }

  async getCheckpoints(limit = 100) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return inMemoryRuns.flatMap((r) =>
        r.checkpointResults.map((c, i) => ({
          id: `${r.runId}-${i}`,
          trade_run_id: r.runId,
          checkpoint_name: c.name,
          passed: c.passed,
          message: c.message,
        }))
      ).slice(0, limit);
    }

    const { data } = await supabase
      .from("checkpoint_results")
      .select("*")
      .order("id", { ascending: false })
      .limit(limit);

    return data ?? [];
  }

  async getAlarmCounts(): Promise<Record<string, number>> {
    const alarms = await this.getAlarms(500);
    return alarms.reduce<Record<string, number>>((acc, alarm) => {
      const type = alarm.alarm_type as string;
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});
  }
}

function mapDbRunToStored(row: Record<string, unknown>): StoredRun {
  const recommendation = row.recommendation as StoredRun["recommendation"];
  return {
    runId: String(row.id),
    status: String(row.status) as StoredRun["status"],
    decision: String(row.decision) as StoredRun["decision"],
    request: {
      ticker: String(row.ticker),
      action: String(row.action),
      amount: Number(row.amount),
      riskProfile: String(row.risk_profile ?? "MODERATE"),
    },
    recommendation: recommendation ?? null,
    guardrailResults: [],
    checkpointResults: [],
    alarms: [],
    executionTimeMs: Number(row.execution_time_ms ?? 0),
    agentUsed: String(row.agent_used ?? "Unknown"),
    createdAt: String(row.created_at),
  };
}

export const tradePersistence = new TradePersistenceService();
