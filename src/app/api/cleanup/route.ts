import { NextRequest, NextResponse } from "next/server";
import { cleanupOldJobs } from "@/lib/cleanup";

// Chamado pelo Vercel Cron (ver vercel.json) — a Vercel assina o pedido com
// "Authorization: Bearer <CRON_SECRET>" automaticamente quando essa env var está definida no
// projeto, o que impede qualquer pessoa de acionar a limpeza só por conhecer o URL.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const result = await cleanupOldJobs();
  return NextResponse.json(result);
}
