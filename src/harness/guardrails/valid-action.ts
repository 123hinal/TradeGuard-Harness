import type { Guardrail } from "./index";
import type { GuardrailResult, TradeRequest } from "@/types";

const VALID_ACTIONS = ["BUY", "SELL"];

export class ValidActionGuardrail implements Guardrail {
  readonly name = "VALID_ACTION";

  evaluate(request: TradeRequest): GuardrailResult {
    const passed = VALID_ACTIONS.includes(request.action.toUpperCase());
    return {
      name: this.name,
      passed,
      message: passed
        ? `Action ${request.action} is valid`
        : `Action ${request.action} is invalid. Allowed: ${VALID_ACTIONS.join(", ")}`,
    };
  }
}
