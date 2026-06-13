import { config } from "dotenv";
import { resolve } from "path";
import { HarnessOrchestrator } from "../src/harness/orchestrator";
import { sampleTradeRequests } from "./sample-data";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

process.env.AGENT_PROVIDER = process.env.AGENT_PROVIDER ?? "mock";

async function seed() {
  console.log("TradeGuard AI Harness — Seed Script");
  console.log(`Agent provider: ${process.env.AGENT_PROVIDER}`);
  console.log("---");

  const orchestrator = new HarnessOrchestrator();

  for (const sample of sampleTradeRequests) {
    const { expectedDecision, description, ...request } = sample;
    const result = await orchestrator.execute(request);

    const match = result.decision === expectedDecision ? "✓" : "✗";
    console.log(
      `${match} ${request.ticker} ${request.action} $${request.amount} → ${result.decision} (expected ${expectedDecision})`
    );
    console.log(`  ${description}`);
    console.log(`  Run ID: ${result.runId}`);
    console.log("");
  }

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
