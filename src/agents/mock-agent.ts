import type { TradeAgent } from "@/agents/trade-agent";
import type { TradeRecommendation, TradeRequest } from "@/types";

export class MockTradeAgent implements TradeAgent {
  readonly name = "MockTradeAgent";

  async analyzeTrade(request: TradeRequest): Promise<TradeRecommendation> {
    const volatilityHigh = request.ticker.toUpperCase() === "NVDA";
    const confidence = volatilityHigh ? 0.65 : 0.85;
    const recommendedAmount = Math.min(request.amount, 45000);

    return {
      ticker: request.ticker.toUpperCase(),
      action: request.action.toUpperCase(),
      recommendedAmount,
      confidence,
      reasoning: `Mock analysis for ${request.ticker}: ${request.action} of $${recommendedAmount.toLocaleString()} aligns with ${request.riskProfile} risk profile. Market conditions appear stable for this position size.`,
    };
  }
}
