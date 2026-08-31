import { NextResponse } from "next/server";
import { refreshAllSources } from "@/lib/refresh";

// 13 fontes correm sequencialmente (ver refreshAllSources em lib/refresh.ts), e o Net-Empregos e o
// fallback do auto-discard (ver lib/sources/autodiscard.ts) já usam Firecrawl com até ~50s de
// espera cada — 60s era demasiado apertado para tudo isto encadeado.
export const maxDuration = 180;

export async function POST() {
  const summaries = await refreshAllSources();
  return NextResponse.json({ summaries });
}
