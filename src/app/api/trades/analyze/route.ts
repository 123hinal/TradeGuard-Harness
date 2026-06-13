import { NextResponse } from "next/server";
import { harnessOrchestrator } from "@/harness/orchestrator";
import type { RawTradeInput } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RawTradeInput;
    const result = await harnessOrchestrator.execute(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
