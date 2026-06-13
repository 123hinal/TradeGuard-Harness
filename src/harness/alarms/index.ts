import type {
  Alarm,
  AlarmSeverity,
  AlarmType,
  CheckpointResult,
  GuardrailResult,
  TradeRecommendation,
} from "@/types";

export class AlarmEngine {
  fromGuardrailFailures(failures: GuardrailResult[]): Alarm[] {
    return failures.map((failure) => ({
      type: "GUARDRAIL_FAILURE" as AlarmType,
      severity: "HIGH" as AlarmSeverity,
      context: `Guardrail ${failure.name} failed: ${failure.message}`,
      recommendedAction: "Block trade and review guardrail configuration",
    }));
  }

  fromCheckpointFailures(failures: CheckpointResult[], recommendation: TradeRecommendation): Alarm[] {
    return failures.map((failure) => this.mapCheckpointFailure(failure, recommendation));
  }

  private mapCheckpointFailure(failure: CheckpointResult, recommendation: TradeRecommendation): Alarm {
    switch (failure.name) {
      case "CONFIDENCE_THRESHOLD":
        return {
          type: "LOW_CONFIDENCE",
          severity: "MEDIUM",
          context: failure.message,
          recommendedAction: "Escalate to human reviewer for confidence validation",
        };
      case "VOLATILITY_CHECK":
        return {
          type: "HIGH_VOLATILITY",
          severity: "HIGH",
          context: `${recommendation.ticker} classified as high volatility`,
          recommendedAction: "Human review required",
        };
      case "MAX_RECOMMENDED_AMOUNT":
        return {
          type: "INVALID_RECOMMENDATION",
          severity: "HIGH",
          context: failure.message,
          recommendedAction: "Reduce recommended amount or reject trade",
        };
      case "REASONING_PRESENT":
        return {
          type: "INVALID_RECOMMENDATION",
          severity: "MEDIUM",
          context: failure.message,
          recommendedAction: "Request agent to provide detailed reasoning",
        };
      default:
        return {
          type: "INVALID_RECOMMENDATION",
          severity: "MEDIUM",
          context: failure.message,
          recommendedAction: "Review recommendation manually",
        };
    }
  }

  addHumanReviewAlarm(alarms: Alarm[]): Alarm[] {
    const hasHighSeverity = alarms.some(
      (a) => a.severity === "HIGH" || a.severity === "CRITICAL"
    );

    if (hasHighSeverity) {
      return [
        ...alarms,
        {
          type: "HUMAN_REVIEW_REQUIRED",
          severity: "HIGH",
          context: "One or more HIGH/CRITICAL severity alarms detected",
          recommendedAction: "Route to human reviewer before execution",
        },
      ];
    }

    return alarms;
  }

  hasEscalationSeverity(alarms: Alarm[]): boolean {
    return alarms.some((a) => a.severity === "HIGH" || a.severity === "CRITICAL");
  }
}

export const alarmEngine = new AlarmEngine();
