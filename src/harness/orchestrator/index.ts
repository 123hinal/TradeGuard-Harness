import { createTradeAgent } from "@/agents";
import type { TradeAgent } from "@/agents/trade-agent";
import { alarmEngine, AlarmEngine } from "@/harness/alarms";
import { checkpointEngine, CheckpointEngine } from "@/harness/checkpoints";
import { guardrailEngine, GuardrailEngine } from "@/harness/guardrails";
import { materialHandler, MaterialHandler } from "@/harness/material-handler";
import { auditLogger } from "@/services/audit-logger";
import { tradePersistence } from "@/services/trade-persistence";
import type {
  HarnessExecutionResult,
  RawTradeInput,
  TradeDecision,
  RunStatus,
} from "@/types";
import { v4 as uuidv4 } from "uuid";

export class HarnessOrchestrator {
  constructor(
    private material: MaterialHandler = materialHandler,
    private guardrails: GuardrailEngine = guardrailEngine,
    private checkpoints: CheckpointEngine = checkpointEngine,
    private alarms: AlarmEngine = alarmEngine,
    private agentFactory: () => TradeAgent = createTradeAgent
  ) {}

  async execute(rawInput: RawTradeInput): Promise<HarnessExecutionResult> {
    const startTime = Date.now();
    const runId = uuidv4();
    const agent = this.agentFactory();

    // 1. Material Handling
    const materialResult = this.material.validate(rawInput);
    if (!materialResult.success || !materialResult.request) {
      const result: HarnessExecutionResult = {
        runId,
        status: "BLOCKED",
        decision: "BLOCKED",
        request: {
          ticker: String(rawInput.ticker ?? ""),
          action: String(rawInput.action ?? ""),
          amount: Number(rawInput.amount ?? 0),
          riskProfile: String(rawInput.riskProfile ?? ""),
        },
        recommendation: null,
        guardrailResults: [],
        checkpointResults: [],
        alarms: [
          {
            type: "GUARDRAIL_FAILURE",
            severity: "HIGH",
            context: materialResult.errors?.join("; ") ?? "Material handling failed",
            recommendedAction: "Fix input and resubmit",
          },
        ],
        executionTimeMs: Date.now() - startTime,
        agentUsed: agent.name,
        blockedAt: "MATERIAL_HANDLER",
        error: materialResult.errors?.join("; "),
      };

      await this.persistAndLog(result);
      return result;
    }

    const request = this.material.transformForAgent(materialResult.request);

    // 2. Guardrails
    const guardrailResults = this.guardrails.evaluateAll(request);
    if (!this.guardrails.allPassed(guardrailResults)) {
      const failedGuardrails = this.guardrails.getFailed(guardrailResults);
      const alarms = this.alarms.fromGuardrailFailures(failedGuardrails);

      const result: HarnessExecutionResult = {
        runId,
        status: "BLOCKED",
        decision: "BLOCKED",
        request,
        recommendation: null,
        guardrailResults,
        checkpointResults: [],
        alarms,
        executionTimeMs: Date.now() - startTime,
        agentUsed: agent.name,
        blockedAt: "GUARDRAILS",
      };

      await this.persistAndLog(result);
      return result;
    }

    // 3. AI Agent
    let recommendation;
    try {
      recommendation = await agent.analyzeTrade(request);
      recommendation = this.material.normalizeRecommendationOutput(recommendation);
    } catch (error) {
      const result: HarnessExecutionResult = {
        runId,
        status: "FAILED",
        decision: "BLOCKED",
        request,
        recommendation: null,
        guardrailResults,
        checkpointResults: [],
        alarms: [
          {
            type: "INVALID_RECOMMENDATION",
            severity: "CRITICAL",
            context: error instanceof Error ? error.message : "Agent execution failed",
            recommendedAction: "Retry with mock agent or check API credentials",
          },
        ],
        executionTimeMs: Date.now() - startTime,
        agentUsed: agent.name,
        blockedAt: "AGENT",
        error: error instanceof Error ? error.message : "Unknown agent error",
      };

      await this.persistAndLog(result);
      return result;
    }

    // 4. Checkpoints
    const checkpointResults = this.checkpoints.evaluateAll(recommendation);
    const failedCheckpoints = this.checkpoints.getFailed(checkpointResults);

    // 5. Alarm Generation
    let alarms = this.alarms.fromCheckpointFailures(failedCheckpoints, recommendation);
    alarms = this.alarms.addHumanReviewAlarm(alarms);

    // 6. Final Decision
    const decision = this.determineDecision(alarms, failedCheckpoints);
    const status = this.mapDecisionToStatus(decision);

    const result: HarnessExecutionResult = {
      runId,
      status,
      decision,
      request,
      recommendation,
      guardrailResults,
      checkpointResults,
      alarms,
      executionTimeMs: Date.now() - startTime,
      agentUsed: agent.name,
    };

    await this.persistAndLog(result);
    return result;
  }

  private determineDecision(
    alarms: ReturnType<AlarmEngine["addHumanReviewAlarm"]>,
    failedCheckpoints: ReturnType<CheckpointEngine["getFailed"]>
  ): TradeDecision {
    if (this.alarms.hasEscalationSeverity(alarms)) {
      return "PENDING_HUMAN_REVIEW";
    }

    if (failedCheckpoints.length > 0) {
      return "BLOCKED";
    }

    return "APPROVED";
  }

  private mapDecisionToStatus(decision: TradeDecision): RunStatus {
    switch (decision) {
      case "APPROVED":
        return "APPROVED";
      case "PENDING_HUMAN_REVIEW":
        return "PENDING_HUMAN_REVIEW";
      case "BLOCKED":
      default:
        return "BLOCKED";
    }
  }

  private async persistAndLog(result: HarnessExecutionResult): Promise<void> {
    auditLogger.log({
      runId: result.runId,
      executionTimeMs: result.executionTimeMs,
      guardrailResults: result.guardrailResults,
      checkpointResults: result.checkpointResults,
      alarms: result.alarms,
      decision: result.decision,
      agentUsed: result.agentUsed,
      timestamp: new Date().toISOString(),
    });

    await tradePersistence.saveExecution(result);
  }
}

export const harnessOrchestrator = new HarnessOrchestrator();
