import type { Checkpoint } from "./index";
import { ConfidenceThresholdCheckpoint } from "./confidence-threshold";
import { MaxRecommendedAmountCheckpoint } from "./max-recommended-amount";
import { ReasoningPresentCheckpoint } from "./reasoning-present";
import { VolatilityCheckCheckpoint } from "./volatility-check";
import type { CheckpointResult, TradeRecommendation } from "@/types";

export class CheckpointEngine {
  private checkpoints: Checkpoint[];

  constructor(checkpoints?: Checkpoint[]) {
    this.checkpoints = checkpoints ?? [
      new ConfidenceThresholdCheckpoint(),
      new MaxRecommendedAmountCheckpoint(),
      new VolatilityCheckCheckpoint(),
      new ReasoningPresentCheckpoint(),
    ];
  }

  evaluateAll(recommendation: TradeRecommendation): CheckpointResult[] {
    return this.checkpoints.map((c) => c.evaluate(recommendation));
  }

  getFailed(results: CheckpointResult[]): CheckpointResult[] {
    return results.filter((r) => !r.passed);
  }
}

export const checkpointEngine = new CheckpointEngine();
