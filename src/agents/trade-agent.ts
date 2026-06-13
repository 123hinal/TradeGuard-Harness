import type { TradeRecommendation, TradeRequest } from "@/types";

export interface TradeAgent {
  analyzeTrade(request: TradeRequest): Promise<TradeRecommendation>;
  readonly name: string;
}
