import type { Guardrail } from "./index";
import type { GuardrailResult, TradeRequest } from "@/types";

export class RiskProfilePresentGuardrail implements Guardrail {
  readonly name = "RISK_PROFILE_PRESENT";

  evaluate(request: TradeRequest): GuardrailResult {
    const passed = request.riskProfile.trim().length > 0;
    return {
      name: this.name,
      passed,
      message: passed
        ? `Risk profile "${request.riskProfile}" is present`
        : "Risk profile must not be empty",
    };
  }
}
