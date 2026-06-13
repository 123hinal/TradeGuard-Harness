import type { Guardrail } from "./index";
import type { GuardrailResult, TradeRequest } from "@/types";

const MAX_AMOUNT = 50000;

export class MaxTradeSizeGuardrail implements Guardrail {
  readonly name = "MAX_TRADE_SIZE";

  evaluate(request: TradeRequest): GuardrailResult {
    const passed = request.amount <= MAX_AMOUNT;
    return {
      name: this.name,
      passed,
      message: passed
        ? `Trade amount $${request.amount.toLocaleString()} is within limit of $${MAX_AMOUNT.toLocaleString()}`
        : `Trade amount $${request.amount.toLocaleString()} exceeds maximum of $${MAX_AMOUNT.toLocaleString()}`,
    };
  }
}
