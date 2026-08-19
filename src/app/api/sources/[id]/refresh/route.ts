import { NextResponse } from "next/server";
import { refreshSourceById } from "@/lib/refresh";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summary = await refreshSourceById(id);
  return NextResponse.json({ summary });
}
