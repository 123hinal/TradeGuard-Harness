import { NextResponse } from "next/server";
import { computeAuditMetrics } from "@/services/audit-logger";
import { tradePersistence } from "@/services/trade-persistence";

export async function GET() {
  try {
    const runs = await tradePersistence.getRuns(100);
    const alarmCounts = await tradePersistence.getAlarmCounts();

    const runsWithCounts = runs.map((run) => ({
      id: run.runId,
      ticker: run.request.ticker,
      action: run.request.action,
      amount: run.request.amount,
      status: run.status,
      decision: run.decision,
      created_at: run.createdAt ?? new Date().toISOString(),
      alarm_count: run.alarms.length,
    }));

    const metrics = computeAuditMetrics(runsWithCounts, alarmCounts);
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
