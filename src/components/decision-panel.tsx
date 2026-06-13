"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Alarm, CheckpointResult, GuardrailResult, HarnessExecutionResult } from "@/types";

interface DecisionPanelProps {
  result: HarnessExecutionResult;
}

function decisionVariant(decision: string): "success" | "warning" | "danger" {
  switch (decision) {
    case "APPROVED":
      return "success";
    case "PENDING_HUMAN_REVIEW":
      return "warning";
    default:
      return "danger";
  }
}

export function DecisionPanel({ result }: DecisionPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Final Decision
            <Badge variant={decisionVariant(result.decision)}>{result.decision}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <div>Run ID: {result.runId}</div>
          <div>Agent: {result.agentUsed}</div>
          <div>Execution: {result.executionTimeMs}ms</div>
        </CardContent>
      </Card>

      {result.recommendation && (
        <Card>
          <CardHeader>
            <CardTitle>Trade Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>{result.recommendation.action}</strong> {result.recommendation.ticker} —{" "}
              {formatCurrency(result.recommendation.recommendedAmount)}
            </p>
            <p>Confidence: {formatPercent(result.recommendation.confidence)}</p>
            <p className="text-muted-foreground">{result.recommendation.reasoning}</p>
          </CardContent>
        </Card>
      )}

      <ResultList title="Guardrail Results" items={result.guardrailResults} />
      <ResultList title="Checkpoint Results" items={result.checkpointResults} />
      <AlarmList alarms={result.alarms} />
    </div>
  );
}

function ResultList({
  title,
  items,
}: {
  title: string;
  items: GuardrailResult[] | CheckpointResult[];
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.message}</p>
            </div>
            <Badge variant={item.passed ? "success" : "danger"}>
              {item.passed ? "PASS" : "FAIL"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AlarmList({ alarms }: { alarms: Alarm[] }) {
  if (alarms.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Alarms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alarms.map((alarm, index) => (
          <div key={`${alarm.type}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{alarm.type}</p>
              <Badge variant={alarm.severity === "CRITICAL" || alarm.severity === "HIGH" ? "danger" : "warning"}>
                {alarm.severity}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{alarm.context}</p>
            <p className="mt-1 text-sm">
              <strong>Action:</strong> {alarm.recommendedAction}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
