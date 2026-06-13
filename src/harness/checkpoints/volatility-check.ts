import type { Checkpoint } from "./index";
import type { CheckpointResult, TradeRecommendation } from "@/types";

export const MOCK_VOLATILITY: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
  NVDA: "HIGH",
  AAPL: "LOW",
  MSFT: "LOW",
  GOOGL: "LOW",
  AMZN: "LOW",
};

export class VolatilityCheckCheckpoint implements Checkpoint {
  readonly name = "VOLATILITY_CHECK";

  evaluate(recommendation: TradeRecommendation): CheckpointResult {
    const volatility = MOCK_VOLATILITY[recommendation.ticker.toUpperCase()] ?? "MEDIUM";
    const passed = volatility !== "HIGH";

    return {
      name: this.name,
      passed,
      message: passed
        ? `${recommendation.ticker} volatility classified as ${volatility}`
        : `${recommendation.ticker} classified as high volatility — review required`,
    };
  }
}
