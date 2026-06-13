import { NextRequest, NextResponse } from "next/server";
import { tradePersistence } from "@/services/trade-persistence";

export async function GET(request: NextRequest) {
  try {
    const runId = request.nextUrl.searchParams.get("id");

    if (runId) {
      const run = await tradePersistence.getRunById(runId);
      if (!run) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      return NextResponse.json(run);
    }

    const runs = await tradePersistence.getRuns();
    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
