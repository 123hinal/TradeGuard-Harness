import { z } from "zod";
import type { RawTradeInput, TradeRequest } from "@/types";

const tradeInputSchema = z.object({
  ticker: z
    .string({ required_error: "Ticker is required" })
    .min(1, "Ticker is required")
    .max(10, "Ticker too long"),
  action: z
    .string({ required_error: "Action is required" })
    .min(1, "Action is required"),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? parseFloat(val.replace(/[$,]/g, "")) : val))
    .refine((val) => !Number.isNaN(val) && val > 0, "Amount must be a positive number"),
  riskProfile: z
    .string({ required_error: "Risk profile is required" })
    .min(1, "Risk profile is required"),
});

export interface MaterialHandlerResult {
  success: boolean;
  request?: TradeRequest;
  errors?: string[];
}

export class MaterialHandler {
  validate(input: RawTradeInput): MaterialHandlerResult {
    const parsed = tradeInputSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        errors: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      };
    }

    return {
      success: true,
      request: this.normalize(parsed.data),
    };
  }

  normalize(input: z.infer<typeof tradeInputSchema>): TradeRequest {
    return {
      ticker: input.ticker.trim().toUpperCase(),
      action: input.action.trim().toUpperCase(),
      amount: Math.round(input.amount * 100) / 100,
      riskProfile: input.riskProfile.trim().toUpperCase(),
    };
  }

  transformForAgent(request: TradeRequest): TradeRequest {
    return { ...request };
  }

  normalizeRecommendationOutput<T>(output: T): T {
    return output;
  }
}

export const materialHandler = new MaterialHandler();
