import type { Guardrail } from "./index";
import type { GuardrailResult, TradeRequest } from "@/types";

const ALLOWED_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"];

export class AllowedSecuritiesGuardrail implements Guardrail {
  readonly name = "ALLOWED_SECURITIES";

  evaluate(request: TradeRequest): GuardrailResult {
    const passed = ALLOWED_TICKERS.includes(request.ticker.toUpperCase());
    return {
      name: this.name,
      passed,
      message: passed
        ? `${request.ticker} is an approved security`
        : `${request.ticker} is not in the approved securities list: ${ALLOWED_TICKERS.join(", ")}`,
    };
  }
}
