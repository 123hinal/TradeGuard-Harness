import type { Guardrail } from "./index";
import { AllowedSecuritiesGuardrail } from "./allowed-securities";
import { MaxTradeSizeGuardrail } from "./max-trade-size";
import { RiskProfilePresentGuardrail } from "./risk-profile-present";
import { ValidActionGuardrail } from "./valid-action";
import type { GuardrailResult, TradeRequest } from "@/types";

export class GuardrailEngine {
  private guardrails: Guardrail[];

  constructor(guardrails?: Guardrail[]) {
    this.guardrails = guardrails ?? [
      new MaxTradeSizeGuardrail(),
      new AllowedSecuritiesGuardrail(),
      new ValidActionGuardrail(),
      new RiskProfilePresentGuardrail(),
    ];
  }

  evaluateAll(request: TradeRequest): GuardrailResult[] {
    return this.guardrails.map((g) => g.evaluate(request));
  }

  allPassed(results: GuardrailResult[]): boolean {
    return results.every((r) => r.passed);
  }

  getFailed(results: GuardrailResult[]): GuardrailResult[] {
    return results.filter((r) => !r.passed);
  }
}

export const guardrailEngine = new GuardrailEngine();
