import type { Checkpoint } from "./index";
import type { CheckpointResult, TradeRecommendation } from "@/types";

const MAX_RECOMMENDED = 50000;

export class MaxRecommendedAmountCheckpoint implements Checkpoint {
  readonly name = "MAX_RECOMMENDED_AMOUNT";

  evaluate(recommendation: TradeRecommendation): CheckpointResult {
    const passed = recommendation.recommendedAmount <= MAX_RECOMMENDED;
    return {
      name: this.name,
      passed,
      message: passed
        ? `Recommended amount $${recommendation.recommendedAmount.toLocaleString()} is within limit`
        : `Recommended amount $${recommendation.recommendedAmount.toLocaleString()} exceeds maximum of $${MAX_RECOMMENDED.toLocaleString()}`,
    };
  }
}
