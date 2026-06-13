import type { Checkpoint } from "./index";
import type { CheckpointResult, TradeRecommendation } from "@/types";

const MIN_REASONING_LENGTH = 20;

export class ReasoningPresentCheckpoint implements Checkpoint {
  readonly name = "REASONING_PRESENT";

  evaluate(recommendation: TradeRecommendation): CheckpointResult {
    const passed = recommendation.reasoning.trim().length > MIN_REASONING_LENGTH;
    return {
      name: this.name,
      passed,
      message: passed
        ? `Reasoning provided (${recommendation.reasoning.length} characters)`
        : `Reasoning must be longer than ${MIN_REASONING_LENGTH} characters (got ${recommendation.reasoning.length})`,
    };
  }
}
