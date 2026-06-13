import type { GuardrailResult, TradeRequest } from "@/types";

export interface Guardrail {
  readonly name: string;
  evaluate(request: TradeRequest): GuardrailResult;
}

export { MaxTradeSizeGuardrail } from "./max-trade-size";
export { AllowedSecuritiesGuardrail } from "./allowed-securities";
export { ValidActionGuardrail } from "./valid-action";
export { RiskProfilePresentGuardrail } from "./risk-profile-present";
export { GuardrailEngine, guardrailEngine } from "./engine";
