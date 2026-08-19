import { NextResponse } from "next/server";
import { refreshAllSources } from "@/lib/refresh";

export const maxDuration = 60;

export async function POST() {
  const summaries = await refreshAllSources();
  return NextResponse.json({ summaries });
}
