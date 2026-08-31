import { NextResponse } from "next/server";
import { refreshSourceById } from "@/lib/refresh";

// Mesma margem que /api/refresh — esta fonte pode acionar o fallback Firecrawl do auto-discard
// (ver lib/sources/autodiscard.ts), que sozinho já pode demorar ~25s.
export const maxDuration = 120;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summary = await refreshSourceById(id);
  return NextResponse.json({ summary });
}
