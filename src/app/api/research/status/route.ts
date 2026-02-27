import { NextRequest, NextResponse } from "next/server";
import { Valyu } from "valyu-js";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "VALYU_API_KEY not configured" }, { status: 500 });
    }

    const valyu = new Valyu(apiKey);
    const status = await valyu.deepresearch.status(taskId);

    return NextResponse.json({
      ...status,
      success: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Status check failed";
    console.error("Research status error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
