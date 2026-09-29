import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NORTE_REGION_KEYWORDS } from "@/lib/sources/relevance";
import { MAX_AGE_DAYS } from "@/lib/cleanup";
import type { JobStatus, Prisma, Profile, RemoteType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const where: Prisma.JobWhereInput = {};

  // Escopo por perfil (Carlos/Karol) — nunca misturar vagas dos dois. Ver src/components/ProfileProvider.tsx.
  const profile = params.get("profile");
  if (profile) where.source = { is: { profile: profile as Profile } };

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

  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  // Vagas guardadas/candidaturas nunca ficam escondidas por idade; as restantes têm limite de MAX_AGE_DAYS.
  const KEEP_STATUSES: JobStatus[] = ["GUARDADA", "APLICADA", "ENTREVISTA", "OFERTA"];
  const ageLimit = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  if (dateFrom || dateTo) {
    where.publishedAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  } else {
    // Sem filtro manual: esconde vagas mais velhas que MAX_AGE_DAYS (exceto estados preservados).
    and.push({
      OR: [
        { status: { in: KEEP_STATUSES } },
        { publishedAt: { gte: ageLimit } },
        { publishedAt: null },
      ],
    });
  }

  if (and.length) where.AND = and;

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
