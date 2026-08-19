import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sources = await prisma.source.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ sources });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as { id: string; active: boolean };
  const source = await prisma.source.update({
    where: { id: body.id },
    data: { active: body.active },
  });
  return NextResponse.json({ source });
}
