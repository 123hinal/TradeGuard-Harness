export type RiskProfile = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
export type TradeAction = "BUY" | "SELL";
export type TradeDecision = "APPROVED" | "BLOCKED" | "PENDING_HUMAN_REVIEW";
export type RunStatus = "COMPLETED" | "BLOCKED" | "PENDING_HUMAN_REVIEW" | "APPROVED" | "FAILED";
export type AlarmSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlarmType =
  | "GUARDRAIL_FAILURE"
  | "LOW_CONFIDENCE"
  | "HIGH_VOLATILITY"
  | "INVALID_RECOMMENDATION"
  | "HUMAN_REVIEW_REQUIRED";

export interface TradeRequest {
  ticker: string;
  action: string;
  amount: number;
  riskProfile: string;
}

export interface TradeRecommendation {
  ticker: string;
  action: string;
  recommendedAmount: number;
  confidence: number;
  reasoning: string;
}

export interface GuardrailResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface CheckpointResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface Alarm {
  type: string;
  severity: string;
  context: string;
  recommendedAction: string;
}

export interface TradeRun {
  id: string;
  status: string;
  createdAt: Date;
}

export interface RawTradeInput {
  ticker?: string;
  action?: string;
  amount?: number | string;
  riskProfile?: string;
}

export interface HarnessExecutionResult {
  runId: string;
  status: RunStatus;
  decision: TradeDecision;
  request: TradeRequest;
  recommendation: TradeRecommendation | null;
  guardrailResults: GuardrailResult[];
  checkpointResults: CheckpointResult[];
  alarms: Alarm[];
  executionTimeMs: number;
  agentUsed: string;
  blockedAt?: string;
  error?: string;
}

export interface AuditLogEntry {
  runId: string;
  executionTimeMs: number;
  guardrailResults: GuardrailResult[];
  checkpointResults: CheckpointResult[];
  alarms: Alarm[];
  decision: TradeDecision;
  agentUsed: string;
  timestamp: string;
}

export interface AuditMetrics {
  totalRuns: number;
  passRate: number;
  approvalRate: number;
  alarmCounts: Record<string, number>;
  recentExecutions: HarnessExecutionSummary[];
}

export interface HarnessExecutionSummary {
  id: string;
  ticker: string;
  action: string;
  amount: number;
  status: string;
  decision: TradeDecision;
  createdAt: string;
  alarmCount: number;
}
