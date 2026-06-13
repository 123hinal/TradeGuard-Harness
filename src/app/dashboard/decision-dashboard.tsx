"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DecisionPanel } from "@/components/decision-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HarnessExecutionResult } from "@/types";

export default function DecisionDashboard() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");
  const [result, setResult] = useState<HarnessExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      const cached = sessionStorage.getItem("lastTradeResult");
      if (cached) {
        const parsed = JSON.parse(cached) as HarnessExecutionResult;
        if (!runId || parsed.runId === runId) {
          setResult(parsed);
          setLoading(false);
          return;
        }
      }

      if (runId) {
        const response = await fetch(`/api/runs?id=${runId}`);
        if (response.ok) {
          const data = await response.json();
          setResult(data);
        }
      }

      setLoading(false);
    }

    loadResult();
  }, [runId]);

  if (loading) {
    return <p className="text-muted-foreground">Loading decision...</p>;
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Decision Available</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Submit a trade from the home page to view harness results here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Decision Dashboard</h1>
        <p className="text-muted-foreground">
          Harness-controlled outcome for run {result.runId}
        </p>
      </div>
      <DecisionPanel result={result} />
    </div>
  );
}
