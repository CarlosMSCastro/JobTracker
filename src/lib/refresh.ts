import { prisma } from "./db";
import { filterNewJobs } from "./dedupe";
import { FETCHERS } from "./sources/registry";
import { checkJobPages } from "./sources/autodiscard";
import { isSeniorTitle } from "./sources/relevance";
import type { Source } from "@/generated/prisma/client";
import type { SourceConfig } from "./sources/types";

const API_KEY_ENV: Record<string, string | undefined> = {
  itjobs: process.env.IT_JOBS_API_KEY,
  jooble: process.env.JOOBLE_API_KEY,
};

export type RefreshSummary = {
  source: string;
  fetched: number;
  created: number;
  skipped: number;
  requestCount?: number;
  requestLimit?: number | null;
  error?: string;
};

async function refreshSource(source: Source): Promise<RefreshSummary> {
  const config = source.config ? (JSON.parse(source.config) as { fetcherKey?: string }) : {};
  const fetcherKey = config.fetcherKey;
  const fetcher = fetcherKey ? FETCHERS[fetcherKey] : undefined;

  if (!fetcher) {
    return { source: source.name, fetched: 0, created: 0, skipped: 0, error: "sem fetcher associado" };
  }

  if (source.requestLimit !== null && source.requestCount >= source.requestLimit) {
    return {
      source: source.name,
      fetched: 0,
      created: 0,
      skipped: 0,
      requestCount: source.requestCount,
      requestLimit: source.requestLimit,
      error: "limite de pedidos atingido",
    };
  }

  try {
    const fetcherConfig: SourceConfig = { apiKey: API_KEY_ENV[fetcherKey!] };
    const fetchedJobs = await fetcher(fetcherConfig);
    const jobs = fetchedJobs.filter((job) => !isSeniorTitle(job.title));

    const newJobs = await filterNewJobs(jobs);

    let created = 0;
    if (newJobs.length > 0) {
      const result = await prisma.job.createMany({
        data: newJobs.map((job) => ({
          sourceId: source.id,
          externalId: job.externalId,
          title: job.title,
          company: job.company,
          location: job.location,
          remoteType: job.remoteType,
          country: job.country,
          area: job.area,
          tags: job.tags?.join(","),
          isInternship: job.isInternship ?? false,
          url: job.url,
          publishedAt: job.publishedAt,
        })),
        skipDuplicates: true,
      });
      created = result.count;

      // Melhor esforço: vai buscar a página de destino de cada vaga recém-criada e marca
      // autoExcluded quando encontra um sinal desqualificante no texto completo (ver
      // src/lib/sources/autodiscard.ts). Uma página bloqueada/indisponível nunca falha o refresh,
      // só deixa a vaga por verificar.
      const createdJobs = await prisma.job.findMany({
        where: { url: { in: newJobs.map((job) => job.url) } },
        select: { id: true, url: true },
      });
      const discardResults = await checkJobPages(createdJobs.map((job) => job.url));
      await Promise.all(
        createdJobs.map(async ({ id, url }) => {
          const result = discardResults.get(url);
          if (result?.autoExcluded) {
            await prisma.job.update({
              where: { id },
              data: { autoExcluded: true, autoExcludeReason: result.reason },
            });
          }
        }),
      );
    }
    const skipped = jobs.length - created;

    const updated = await prisma.source.update({
      where: { id: source.id },
      data: { lastFetch: new Date(), requestCount: { increment: 1 } },
    });

    return {
      source: source.name,
      fetched: jobs.length,
      created,
      skipped,
      requestCount: updated.requestCount,
      requestLimit: updated.requestLimit,
    };
  } catch (err) {
    return {
      source: source.name,
      fetched: 0,
      created: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : "erro desconhecido",
    };
  }
}

export async function refreshAllSources(): Promise<RefreshSummary[]> {
  const sources = await prisma.source.findMany({ where: { active: true, type: { in: ["API", "RSS", "SCRAPER"] } } });
  const summaries: RefreshSummary[] = [];

  for (const source of sources) {
    summaries.push(await refreshSource(source));
  }

  return summaries;
}

export async function refreshSourceById(sourceId: string): Promise<RefreshSummary> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    return { source: "?", fetched: 0, created: 0, skipped: 0, error: "fonte não encontrada" };
  }
  return refreshSource(source);
}
