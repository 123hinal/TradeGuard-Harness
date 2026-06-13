"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DecisionPanel } from "@/components/decision-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HarnessExecutionResult } from "@/types";

export default function TradeSubmissionPage() {
  const router = useRouter();
  const [ticker, setTicker] = useState("NVDA");
  const [action, setAction] = useState("BUY");
  const [amount, setAmount] = useState("50000");
  const [riskProfile, setRiskProfile] = useState("MODERATE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HarnessExecutionResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/trades/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          action,
          amount: Number(amount),
          riskProfile,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      setResult(data);
      sessionStorage.setItem("lastTradeResult", JSON.stringify(data));
      router.push(`/dashboard?runId=${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Submit Trade Request</CardTitle>
          <CardDescription>
            Requests flow through Material Handler → Guardrails → Agent → Checkpoints → Alarms →
            Decision. The agent never returns approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="NVDA"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskProfile">Risk Profile</Label>
              <Select value={riskProfile} onValueChange={setRiskProfile}>
                <SelectTrigger id="riskProfile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSERVATIVE">CONSERVATIVE</SelectItem>
                  <SelectItem value="MODERATE">MODERATE</SelectItem>
                  <SelectItem value="AGGRESSIVE">AGGRESSIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Running Harness..." : "Analyze Trade"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Demo Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>NVDA + $50k → HIGH volatility + low mock confidence → PENDING_HUMAN_REVIEW</p>
            <p>AAPL + $30k → All checks pass → APPROVED</p>
            <p>TSLA → Guardrail failure → BLOCKED</p>
            <p>$60,000 amount → MAX_TRADE_SIZE failure → BLOCKED</p>
          </CardContent>
        </Card>

        {result && <DecisionPanel result={result} />}
      </div>
    </div>
  );
}
