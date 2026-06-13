import { v4 as uuidv4 } from "uuid";
import type { AuditLogEntry, AuditMetrics, HarnessExecutionResult } from "@/types";

const inMemoryAuditLogs: AuditLogEntry[] = [];

class AuditLogger {
  log(entry: AuditLogEntry): void {
    inMemoryAuditLogs.unshift(entry);

    if (process.env.NODE_ENV === "development") {
      console.log("[TradeGuard Audit]", JSON.stringify(entry, null, 2));
    }

    if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
      this.sendToLangfuse(entry).catch((error) => {
        console.error(
          "[TradeGuard Langfuse]",
          error instanceof Error ? error.message : error
        );
      });
    }
  }

  getRecent(limit = 50): AuditLogEntry[] {
    return inMemoryAuditLogs.slice(0, limit);
  }

  private async sendToLangfuse(entry: AuditLogEntry): Promise<void> {
    const baseUrl = process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com";
    const timestamp = entry.timestamp || new Date().toISOString();

    const response = await fetch(`${baseUrl}/api/public/ingestion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        batch: [
          {
            id: uuidv4(),
            type: "trace-create",
            timestamp,
            body: {
              id: entry.runId,
              name: "trade-harness-run",
              timestamp,
              metadata: {
                decision: entry.decision,
                agentUsed: entry.agentUsed,
                executionTimeMs: entry.executionTimeMs,
                guardrailResults: entry.guardrailResults,
                checkpointResults: entry.checkpointResults,
                alarms: entry.alarms,
              },
            },
          },
        ],
      }),
    });

    const responseText = await response.text();
    let payload: { errors?: unknown[]; success?: unknown[] } | null = null;

    if (responseText) {
      try {
        payload = JSON.parse(responseText) as { errors?: unknown[]; success?: unknown[] };
      } catch {
        payload = null;
      }
    }

    if (payload?.errors?.length) {
      throw new Error(`Langfuse rejected events: ${JSON.stringify(payload.errors)}`);
    }

    if (!response.ok && response.status !== 207) {
      throw new Error(`Langfuse HTTP ${response.status}: ${responseText || "empty response"}`);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[TradeGuard Langfuse] trace ingested:", entry.runId);
    }
  }
}

export const auditLogger = new AuditLogger();

export function computeAuditMetrics(
  runs: Array<{
    id: string;
    ticker: string;
    action: string;
    amount: number;
    status: string;
    decision: string;
    created_at: string;
    alarm_count?: number;
  }>,
  alarmCounts: Record<string, number>
): AuditMetrics {
  const totalRuns = runs.length;
  const approved = runs.filter((r) => r.decision === "APPROVED").length;
  const passedGuardrails = runs.filter(
    (r) => r.status !== "BLOCKED" || r.decision !== "BLOCKED"
  ).length;

  return {
    totalRuns,
    passRate: totalRuns > 0 ? Math.round((passedGuardrails / totalRuns) * 100) : 0,
    approvalRate: totalRuns > 0 ? Math.round((approved / totalRuns) * 100) : 0,
    alarmCounts,
    recentExecutions: runs.slice(0, 10).map((r) => ({
      id: r.id,
      ticker: r.ticker,
      action: r.action,
      amount: r.amount,
      status: r.status,
      decision: r.decision as HarnessExecutionResult["decision"],
      createdAt: r.created_at,
      alarmCount: r.alarm_count ?? 0,
    })),
  };
}
