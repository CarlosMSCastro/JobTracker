import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NORTE_REGION_KEYWORDS } from "@/lib/sources/relevance";
import type { JobStatus, Prisma, RemoteType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const where: Prisma.JobWhereInput = {};

  const area = params.getAll("area");
  if (area.length) where.area = { in: area };

  const remoteType = params.getAll("remoteType");
  if (remoteType.length) where.remoteType = { in: remoteType as RemoteType[] };

  const country = params.getAll("country");
  if (country.length) where.country = { in: country };

  const sourceId = params.getAll("sourceId");
  if (sourceId.length) where.sourceId = { in: sourceId };

  const status = params.getAll("status");
  if (status.length) where.status = { in: status as JobStatus[] };

  const isInternship = params.get("isInternship");
  if (isInternship !== null) where.isInternship = isInternship === "true";

  const and: Prisma.JobWhereInput[] = [];

  const q = params.get("q");
  if (q) {
    and.push({
      OR: [{ title: { contains: q } }, { company: { contains: q } }, { tags: { contains: q } }],
    });
  }

  const region = params.getAll("region");
  if (region.includes("norte")) {
    // Remoto passa sempre (não exige estar na zona); presencial/híbrido só entra se a localização
    // bater com um concelho do Grande Porto/Braga/Guimarães.
    and.push({
      OR: [
        { remoteType: "REMOTO" },
        ...NORTE_REGION_KEYWORDS.map((kw) => ({
          location: { contains: kw, mode: "insensitive" as const },
        })),
      ],
    });
  }

  if (and.length) where.AND = and;

  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  if (dateFrom || dateTo) {
    where.publishedAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { source: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
      take: 200,
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({ jobs, total });
}
