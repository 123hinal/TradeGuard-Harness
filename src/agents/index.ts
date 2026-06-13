import { ClaudeTradeAgent } from "@/agents/claude-agent";
import { MockTradeAgent } from "@/agents/mock-agent";
import type { TradeAgent } from "@/agents/trade-agent";

export function createTradeAgent(): TradeAgent {
  const provider = (process.env.AGENT_PROVIDER ?? "mock").toLowerCase();

  switch (provider) {
    case "claude":
      return new ClaudeTradeAgent();
    case "mock":
    default:
      return new MockTradeAgent();
  }
}

export { ClaudeTradeAgent } from "@/agents/claude-agent";
export { MockTradeAgent } from "@/agents/mock-agent";
export type { TradeAgent } from "@/agents/trade-agent";
