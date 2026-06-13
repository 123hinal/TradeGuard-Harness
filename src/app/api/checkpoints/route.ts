import { NextResponse } from "next/server";
import { tradePersistence } from "@/services/trade-persistence";

export async function GET() {
  try {
    const checkpoints = await tradePersistence.getCheckpoints();
    return NextResponse.json({ checkpoints });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
