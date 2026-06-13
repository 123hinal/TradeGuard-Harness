"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AuditMetrics } from "@/types";

export default function AuditDashboardPage() {
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      const response = await fetch("/api/trades/history");
      if (response.ok) {
        setMetrics(await response.json());
      }
      setLoading(false);
    }

    loadMetrics();
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading audit data...</p>;
  }

  if (!metrics) {
    return <p className="text-muted-foreground">Unable to load audit metrics.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Dashboard</h1>
        <p className="text-muted-foreground">Observability and execution history</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Runs" value={String(metrics.totalRuns)} />
        <MetricCard title="Pass Rate" value={`${metrics.passRate}%`} />
        <MetricCard title="Approval Rate" value={`${metrics.approvalRate}%`} />
        <MetricCard
          title="Total Alarms"
          value={String(Object.values(metrics.alarmCounts).reduce((a, b) => a + b, 0))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alarm Counts by Type</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(metrics.alarmCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No alarms recorded yet.</p>
          ) : (
            Object.entries(metrics.alarmCounts).map(([type, count]) => (
              <Badge key={type} variant="warning">
                {type}: {count}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Ticker</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Decision</th>
                  <th className="pb-2">Alarms</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentExecutions.map((run) => (
                  <tr key={run.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{formatDate(run.createdAt)}</td>
                    <td className="py-3 pr-4">{run.ticker}</td>
                    <td className="py-3 pr-4">{run.action}</td>
                    <td className="py-3 pr-4">{formatCurrency(run.amount)}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          run.decision === "APPROVED"
                            ? "success"
                            : run.decision === "PENDING_HUMAN_REVIEW"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {run.decision}
                      </Badge>
                    </td>
                    <td className="py-3">{run.alarmCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
