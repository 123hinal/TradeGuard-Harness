import type { CheckpointResult, TradeRecommendation } from "@/types";

export interface Checkpoint {
  readonly name: string;
  evaluate(recommendation: TradeRecommendation): CheckpointResult;
}

export { ConfidenceThresholdCheckpoint } from "./confidence-threshold";
export { MaxRecommendedAmountCheckpoint } from "./max-recommended-amount";
export { VolatilityCheckCheckpoint } from "./volatility-check";
export { ReasoningPresentCheckpoint } from "./reasoning-present";
export { CheckpointEngine, checkpointEngine } from "./engine";
