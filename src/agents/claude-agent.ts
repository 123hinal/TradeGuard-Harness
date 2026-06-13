import Anthropic from "@anthropic-ai/sdk";
import type { TradeAgent } from "@/agents/trade-agent";
import type { TradeRecommendation, TradeRequest } from "@/types";

const SYSTEM_PROMPT = `You are a financial analyst.
Analyze the requested trade and submit your recommendation using the submit_trade_recommendation tool.
Do not include approval decisions. Only provide a recommendation.`;

function parseRecommendationJson(raw: string): TradeRecommendation {
  let text = raw.trim().replace(/^\uFEFF/, "");

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    text = fenced[1].trim();
  } else {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```/g, "").trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Claude response did not contain a JSON object");
  }

  return JSON.parse(text.slice(start, end + 1)) as TradeRecommendation;
}

const RECOMMENDATION_TOOL: Anthropic.Tool = {
  name: "submit_trade_recommendation",
  description: "Submit a structured trade recommendation",
  input_schema: {
    type: "object",
    properties: {
      ticker: { type: "string" },
      action: { type: "string" },
      recommendedAmount: { type: "number" },
      confidence: { type: "number" },
      reasoning: { type: "string" },
    },
    required: ["ticker", "action", "recommendedAmount", "confidence", "reasoning"],
  },
};

function normalizeRecommendation(parsed: TradeRecommendation): TradeRecommendation {
  return {
    ticker: String(parsed.ticker).toUpperCase(),
    action: String(parsed.action).toUpperCase(),
    recommendedAmount: Number(parsed.recommendedAmount),
    confidence: Number(parsed.confidence),
    reasoning: String(parsed.reasoning),
  };
}

export class ClaudeTradeAgent implements TradeAgent {
  readonly name = "ClaudeTradeAgent";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyzeTrade(request: TradeRequest): Promise<TradeRecommendation> {
    const userMessage = JSON.stringify({
      ticker: request.ticker,
      action: request.action,
      amount: request.amount,
      riskProfile: request.riskProfile,
    });

    const response = await this.client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [RECOMMENDATION_TOOL],
      tool_choice: { type: "tool", name: "submit_trade_recommendation" },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolBlock) {
      return normalizeRecommendation(toolBlock.input as TradeRecommendation);
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude returned no recommendation content");
    }

    return normalizeRecommendation(parseRecommendationJson(textBlock.text));
  }
}
