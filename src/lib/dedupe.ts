import { prisma } from "./db";
import type { NormalizedJob } from "./sources/types";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function findExistingJob(job: NormalizedJob): Promise<{ id: string } | null> {
  const byUrl = await prisma.job.findUnique({ where: { url: job.url }, select: { id: true } });
  if (byUrl) return byUrl;

  const candidates = await prisma.job.findMany({
    where: { company: { equals: job.company } },
    select: { id: true, title: true, company: true },
  });

  const normalizedTitle = normalize(job.title);
  const normalizedCompany = normalize(job.company);

  return (
    candidates.find(
      (c) => normalize(c.title) === normalizedTitle && normalize(c.company) === normalizedCompany,
    ) ?? null
  );
}
