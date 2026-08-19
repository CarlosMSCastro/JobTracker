import { prisma } from "./db";
import type { NormalizedJob } from "./sources/types";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCompanyKey(title: string, company: string): string {
  return `${normalize(title)}|${normalize(company)}`;
}

// Filtra um lote de vagas normalizadas, devolvendo só as que ainda não existem na base de dados.
// Faz duas queries no total (uma por URL, uma por empresa), em vez de duas queries por vaga —
// essencial em Postgres remoto (Neon), onde cada round-trip pesa muito mais do que em SQLite local.
export async function filterNewJobs(jobs: NormalizedJob[]): Promise<NormalizedJob[]> {
  if (jobs.length === 0) return [];

  const urls = jobs.map((j) => j.url);
  const existingByUrl = await prisma.job.findMany({
    where: { url: { in: urls } },
    select: { url: true },
  });
  const existingUrls = new Set(existingByUrl.map((j) => j.url));

  const remaining = jobs.filter((j) => !existingUrls.has(j.url));
  if (remaining.length === 0) return [];

  const companies = [...new Set(remaining.map((j) => j.company))];
  const existingByCompany = await prisma.job.findMany({
    where: { company: { in: companies } },
    select: { title: true, company: true },
  });
  const existingKeys = new Set(existingByCompany.map((j) => titleCompanyKey(j.title, j.company)));

  const seenInBatch = new Set<string>();
  return remaining.filter((j) => {
    const key = titleCompanyKey(j.title, j.company);
    if (existingKeys.has(key) || seenInBatch.has(key)) return false;
    seenInBatch.add(key);
    return true;
  });
}
