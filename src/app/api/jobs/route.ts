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

  const sourceId = params.getAll("sourceId");
  if (sourceId.length) where.sourceId = { in: sourceId };

  const status = params.getAll("status");
  if (status.length) where.status = { in: status as JobStatus[] };

  const isInternship = params.get("isInternship");
  if (isInternship !== null) where.isInternship = isInternship === "true";

  // Vagas auto-descartadas (ver autoExcludeReason) ficam escondidas por omissão — nunca apagadas,
  // só recuperáveis passando includeAutoExcluded=true (toggle "mostrar descartadas automaticamente").
  const includeAutoExcluded = params.get("includeAutoExcluded") === "true";
  if (!includeAutoExcluded) where.autoExcluded = false;

  const and: Prisma.JobWhereInput[] = [];

  const country = params.getAll("country");
  if (country.length) {
    // Vagas remotas raramente têm `country` preenchido (as fontes internacionais não o definem) —
    // sem este OR, filtrar "País: Portugal" + "Modalidade: Remoto" devolvia quase sempre 0
    // resultados (13 em vez das ~540 vagas remotas existentes). Remoto passa sempre, tal como no
    // filtro de Zona logo a seguir — a elegibilidade geográfica de uma vaga remota já é validada
    // pelo auto-discard (ver relevance.ts, regra "Remote from X"), não pelo campo `country`.
    and.push({ OR: [{ remoteType: "REMOTO" }, { country: { in: country } }] });
  }

  const q = params.get("q");
  if (q) {
    and.push({
      OR: [{ title: { contains: q } }, { company: { contains: q } }, { tags: { contains: q } }],
    });
  }

  const region = params.getAll("region");
  if (region.includes("norte")) {
    // Remoto passa sempre (não exige estar na zona); presencial/híbrido só entra se a localização
    // bater com um concelho do Grande Porto/Braga/Guimarães — ou se a fonte não deu localização
    // nenhuma (null) ou disse "Todas as Zonas" (ITJobs.pt/Net-Empregos para "a nível nacional").
    // Sem isto, estas vagas desapareciam sempre que se ligava o filtro, mesmo podendo ser relevantes.
    and.push({
      OR: [
        { remoteType: "REMOTO" },
        { location: null },
        { location: { contains: "Todas as Zonas" } },
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
