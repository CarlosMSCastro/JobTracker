import { prisma } from "./db";
import { findExistingJob } from "./dedupe";
import { FETCHERS } from "./sources/registry";
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
    const jobs = await fetcher(fetcherConfig);

    let created = 0;
    let skipped = 0;

    for (const job of jobs) {
      const existing = await findExistingJob(job);
      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.job.create({
        data: {
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
        },
      });
      created += 1;
    }

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
