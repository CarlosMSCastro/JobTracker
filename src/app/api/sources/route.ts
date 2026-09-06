import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Profile } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const profile = request.nextUrl.searchParams.get("profile") as Profile | null;
  const sources = await prisma.source.findMany({
    where: profile ? { profile } : undefined,
    orderBy: { name: "asc" },
  });
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
