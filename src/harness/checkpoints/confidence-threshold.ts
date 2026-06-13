import type { Checkpoint } from "./index";
import type { CheckpointResult, TradeRecommendation } from "@/types";

const CONFIDENCE_THRESHOLD = 0.7;

export class ConfidenceThresholdCheckpoint implements Checkpoint {
  readonly name = "CONFIDENCE_THRESHOLD";

  evaluate(recommendation: TradeRecommendation): CheckpointResult {
    const passed = recommendation.confidence > CONFIDENCE_THRESHOLD;
    return {
      name: this.name,
      passed,
      message: passed
        ? `Confidence ${(recommendation.confidence * 100).toFixed(1)}% exceeds threshold of ${CONFIDENCE_THRESHOLD * 100}%`
        : `Confidence ${(recommendation.confidence * 100).toFixed(1)}% is below threshold of ${CONFIDENCE_THRESHOLD * 100}%`,
    };
  }
}
